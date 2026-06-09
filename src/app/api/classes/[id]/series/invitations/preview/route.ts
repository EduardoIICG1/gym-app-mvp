import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ServiceType as DbServiceType } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = authSession.user.role;
    if (role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
    if (memberIds.length === 0) {
      return Response.json({ error: "memberIds requerido" }, { status: 400 });
    }

    const existing = await prisma.session.findUnique({
      where: { id },
      include: { program: true },
    });
    if (!existing) {
      return Response.json({ error: "Clase no encontrada" }, { status: 404 });
    }
    if (role === "COACH" && existing.coachId !== authSession.user.id) {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const prog = existing.program;
    const serviceType = prog.serviceType;
    const isGroup = serviceType === "GROUP";

    // All active future sessions in the series
    const now = new Date();
    const futureSessions = await prisma.session.findMany({
      where: {
        programId: prog.id,
        status: { not: "CANCELLED" },
        startsAt: { gte: now },
      },
      include: {
        _count: {
          select: {
            bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
          },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    if (futureSessions.length === 0) {
      return Response.json({
        sessions: 0,
        members: memberIds.map((mid) => ({
          memberId: mid,
          memberName: "",
          toCreate: 0,
          skipped: [],
        })),
        totalWouldCreate: 0,
        totalWouldSkip: 0,
      });
    }

    const sessionIds = futureSessions.map((s) => s.id);

    // Member names
    const memberRecords = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true },
    });
    const memberNameMap = new Map(memberRecords.map((m) => [m.id, m.name ?? ""]));

    // Existing pending/accepted invitations (batch)
    const existingInvitations = await prisma.bookingInvitation.findMany({
      where: {
        sessionId: { in: sessionIds },
        memberId: { in: memberIds },
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      select: { sessionId: true, memberId: true, status: true },
    });
    const invitationMap = new Map<string, string>();
    for (const inv of existingInvitations) {
      invitationMap.set(`${inv.sessionId}:${inv.memberId}`, inv.status);
    }

    // Existing active bookings (batch)
    const existingBookings = await prisma.booking.findMany({
      where: {
        sessionId: { in: sessionIds },
        memberId: { in: memberIds },
        status: { notIn: ["CANCELLED", "WAITLISTED"] },
      },
      select: { sessionId: true, memberId: true },
    });
    const bookingSet = new Set<string>();
    for (const b of existingBookings) {
      bookingSet.add(`${b.sessionId}:${b.memberId}`);
    }

    // Eligibility (batch)
    let eligibleSet = new Set<string>();
    let memberCoachMap = new Map<string, Set<string>>();
    const usePerSessionCoach = !isGroup && role !== "KINESIOLOGIST";

    if (role === "KINESIOLOGIST" && serviceType === "KINESIOLOGY") {
      const users = await prisma.user.findMany({
        where: { id: { in: memberIds }, isActive: true },
        select: { id: true },
      });
      eligibleSet = new Set(users.map((u) => u.id));
    } else if (isGroup) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const activeMemberships = await prisma.membership.findMany({
        where: {
          memberId: { in: memberIds },
          serviceType: "GROUP",
          status: "ACTIVE",
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
        },
        select: { memberId: true, totalSessions: true, usedSessions: true },
      });
      for (const m of activeMemberships) {
        if (m.totalSessions === null || m.usedSessions < m.totalSessions) {
          eligibleSet.add(m.memberId);
        }
      }
    } else {
      // PT or KINESIOLOGY (non-KINESIOLOGIST): MemberCoach per session's coach
      const coachIds = [...new Set(futureSessions.map((s) => s.coachId))];
      const relations = await prisma.memberCoach.findMany({
        where: {
          memberId: { in: memberIds },
          coachId: { in: coachIds },
          serviceType: serviceType as DbServiceType,
          isActive: true,
        },
        select: { memberId: true, coachId: true },
      });
      for (const r of relations) {
        if (!memberCoachMap.has(r.memberId)) memberCoachMap.set(r.memberId, new Set());
        memberCoachMap.get(r.memberId)!.add(r.coachId);
      }
    }

    // Build per-member results
    const members: Array<{
      memberId: string;
      memberName: string;
      toCreate: number;
      skipped: { sessionId: string; sessionDate: string; reason: string }[];
    }> = [];
    let totalWouldCreate = 0;
    let totalWouldSkip = 0;

    for (const memberId of memberIds) {
      const memberName = memberNameMap.get(memberId) ?? "";
      let toCreate = 0;
      const skipped: { sessionId: string; sessionDate: string; reason: string }[] = [];

      for (const session of futureSessions) {
        const key = `${session.id}:${memberId}`;
        const sessionDate = session.startsAt.toISOString().slice(0, 10);

        const invStatus = invitationMap.get(key);
        if (invStatus === "PENDING") {
          skipped.push({ sessionId: session.id, sessionDate, reason: "already_invited" });
          continue;
        }
        if (invStatus === "ACCEPTED" || bookingSet.has(key)) {
          skipped.push({ sessionId: session.id, sessionDate, reason: "already_booked" });
          continue;
        }

        if (prog.maxCapacity !== null && session._count.bookings >= prog.maxCapacity) {
          skipped.push({ sessionId: session.id, sessionDate, reason: "full" });
          continue;
        }

        const isEligible = usePerSessionCoach
          ? (memberCoachMap.get(memberId)?.has(session.coachId) ?? false)
          : eligibleSet.has(memberId);

        if (!isEligible) {
          skipped.push({ sessionId: session.id, sessionDate, reason: "not_eligible" });
          continue;
        }

        toCreate++;
      }

      totalWouldCreate += toCreate;
      totalWouldSkip += skipped.length;
      members.push({ memberId, memberName, toCreate, skipped });
    }

    return Response.json({ sessions: futureSessions.length, members, totalWouldCreate, totalWouldSkip });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
