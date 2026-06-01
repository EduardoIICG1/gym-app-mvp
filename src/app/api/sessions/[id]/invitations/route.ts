import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ServiceType as DbServiceType, InvitationStatus } from "@prisma/client";

const STATUS_MAP: Record<InvitationStatus, string> = {
  PENDING:   "pending",
  ACCEPTED:  "accepted",
  DECLINED:  "declined",
  EXPIRED:   "expired",
  CANCELLED: "cancelled",
};

// POST /api/sessions/[id]/invitations
// ADMIN or assigned COACH convokes members to a session.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    if (authSession.user.role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id: sessionId } = await params;

    const gymSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { program: true },
    });
    if (!gymSession) {
      return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    if (gymSession.status === "CANCELLED") {
      return Response.json({ error: "La sesión está cancelada" }, { status: 400 });
    }

    // COACH must be the assigned coach for this session
    if (
      authSession.user.role === "COACH" &&
      gymSession.coachId !== authSession.user.id
    ) {
      return Response.json({ error: "No eres el coach de esta sesión" }, { status: 403 });
    }
    // KINESIOLOGIST can only invite to KINESIOLOGY sessions
    if (
      authSession.user.role === "KINESIOLOGIST" &&
      gymSession.program.serviceType !== "KINESIOLOGY"
    ) {
      return Response.json({ error: "Solo puedes convocar a sesiones de kinesiología" }, { status: 403 });
    }

    const body = await request.json();
    const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
    if (memberIds.length === 0) {
      return Response.json({ error: "memberIds requerido" }, { status: 400 });
    }

    const message: string | undefined = body.message ?? undefined;
    const expiresAt: Date | undefined = body.expiresAt
      ? new Date(body.expiresAt)
      : undefined;

    const serviceType = gymSession.program.serviceType;
    const isGroup = serviceType === "GROUP";

    // Fetch all existing invitations for this session in one query
    const existing = await prisma.bookingInvitation.findMany({
      where: { sessionId, memberId: { in: memberIds } },
      select: { memberId: true, status: true },
    });
    const existingMap = new Map(existing.map((e) => [e.memberId, e.status]));

    // Determine which memberIds need eligibility check
    const toCheck = memberIds.filter((mid) => {
      const s = existingMap.get(mid);
      // Already PENDING or ACCEPTED — will be skipped without eligibility check
      return s !== "PENDING" && s !== "ACCEPTED";
    });

    // Eligibility check
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let eligibleSet = new Set<string>();

    if (isGroup) {
      // Active membership for GROUP service
      const activeMemberships = await prisma.membership.findMany({
        where: {
          memberId: { in: toCheck },
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
      // PT or KINESIOLOGY: active MemberCoach relation with the session's coach
      const relations = await prisma.memberCoach.findMany({
        where: {
          memberId: { in: toCheck },
          coachId: gymSession.coachId,
          serviceType: serviceType as DbServiceType,
          isActive: true,
        },
        select: { memberId: true },
      });
      eligibleSet = new Set(relations.map((r) => r.memberId));
    }

    const created: string[] = [];
    const skipped: { memberId: string; reason: string }[] = [];

    for (const memberId of memberIds) {
      const existingStatus = existingMap.get(memberId);

      if (existingStatus === "PENDING") {
        skipped.push({ memberId, reason: "Invitación pendiente ya existe" });
        continue;
      }
      if (existingStatus === "ACCEPTED") {
        skipped.push({ memberId, reason: "Ya confirmó asistencia" });
        continue;
      }

      if (!eligibleSet.has(memberId) && toCheck.includes(memberId)) {
        skipped.push({
          memberId,
          reason: isGroup
            ? "Sin membresía activa para clases grupales"
            : "Sin relación activa coach-alumno para este servicio",
        });
        continue;
      }

      if (existingStatus === "DECLINED" || existingStatus === "EXPIRED" || existingStatus === "CANCELLED") {
        // Re-invite: update back to PENDING
        await prisma.bookingInvitation.update({
          where: { sessionId_memberId: { sessionId, memberId } },
          data: {
            status: "PENDING",
            message: message ?? null,
            expiresAt: expiresAt ?? null,
            invitedById: authSession.user.id,
          },
        });
        created.push(memberId);
        continue;
      }

      // New invitation
      await prisma.bookingInvitation.create({
        data: {
          sessionId,
          memberId,
          invitedById: authSession.user.id,
          status: "PENDING",
          message: message ?? null,
          expiresAt: expiresAt ?? null,
        },
      });
      created.push(memberId);
    }

    return Response.json({ created, skipped }, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

// GET /api/sessions/[id]/invitations
// ADMIN or assigned COACH: list invitations for a session with summary.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    if (authSession.user.role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id: sessionId } = await params;

    const gymSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, coachId: true, program: { select: { serviceType: true } } },
    });
    if (!gymSession) {
      return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    if (
      authSession.user.role === "COACH" &&
      gymSession.coachId !== authSession.user.id
    ) {
      return Response.json({ error: "No eres el coach de esta sesión" }, { status: 403 });
    }
    if (
      authSession.user.role === "KINESIOLOGIST" &&
      gymSession.program.serviceType !== "KINESIOLOGY"
    ) {
      return Response.json({ error: "Solo puedes ver invitaciones de sesiones de kinesiología" }, { status: 403 });
    }

    const invitations = await prisma.bookingInvitation.findMany({
      where: { sessionId },
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const summary = { total: 0, pending: 0, accepted: 0, declined: 0, expired: 0, cancelled: 0 };
    const items = invitations.map((inv) => {
      const status = STATUS_MAP[inv.status];
      summary.total++;
      (summary as Record<string, number>)[status] =
        ((summary as Record<string, number>)[status] ?? 0) + 1;

      return {
        id: inv.id,
        memberId: inv.memberId,
        memberName: inv.member.name ?? "",
        memberEmail: inv.member.email,
        status,
        bookingId: inv.bookingId ?? null,
        message: inv.message ?? null,
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
        updatedAt: inv.updatedAt.toISOString(),
      };
    });

    return Response.json({ summary, invitations: items });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
