import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/invitations/[id]
// MEMBER responds to their own invitation: "accepted" | "declined"
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const newStatus: string = body.status;

    if (newStatus !== "accepted" && newStatus !== "declined") {
      return Response.json(
        { error: "Estado inválido. Usa 'accepted' o 'declined'" },
        { status: 400 }
      );
    }

    // Load invitation with session + program
    const invitation = await prisma.bookingInvitation.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            program: { select: { serviceType: true, maxCapacity: true } },
            _count: {
              select: {
                bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return Response.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    // Only the invited member can respond
    if (invitation.memberId !== authSession.user.id) {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Must be PENDING to respond
    if (invitation.status !== "PENDING") {
      return Response.json(
        { error: `La invitación ya fue respondida (${invitation.status.toLowerCase()})` },
        { status: 409 }
      );
    }

    // Expiry check — only blocks accepting; declining an expired invitation is allowed
    if (newStatus === "accepted" && invitation.expiresAt && invitation.expiresAt < new Date()) {
      await prisma.bookingInvitation.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return Response.json({ error: "Esta invitación ya expiró." }, { status: 409 });
    }

    // ── DECLINED: simple status update, no booking ──────────────────────────
    if (newStatus === "declined") {
      await prisma.bookingInvitation.update({
        where: { id },
        data: { status: "DECLINED" },
      });
      return Response.json({ status: "declined" });
    }

    // ── ACCEPTED: full validation before creating booking ───────────────────
    const gymSession = invitation.session;

    // Session must not be cancelled
    if (gymSession.status === "CANCELLED") {
      return Response.json({ error: "La sesión fue cancelada" }, { status: 409 });
    }

    const memberId = authSession.user.id;
    const serviceType = gymSession.program.serviceType;
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Validate active membership with available sessions
    const memberships = await prisma.membership.findMany({
      where: { memberId, serviceType },
      orderBy: { createdAt: "desc" },
    });

    const validMembership = memberships.find(
      (m) =>
        m.status === "ACTIVE" &&
        m.startDate <= now &&
        (m.endDate === null || m.endDate >= todayStart) &&
        (m.totalSessions === null || m.usedSessions < m.totalSessions)
    );

    if (!validMembership) {
      if (memberships.length === 0) {
        return Response.json(
          { error: "Tu membresía no está activa para este servicio." },
          { status: 403 }
        );
      }
      const hasActive = memberships.some((m) => m.status === "ACTIVE");
      if (hasActive) {
        const active = memberships.find((m) => m.status === "ACTIVE")!;
        if (active.totalSessions !== null && active.usedSessions >= active.totalSessions) {
          return Response.json(
            { error: "No tienes sesiones disponibles." },
            { status: 403 }
          );
        }
      }
      return Response.json(
        { error: "Tu membresía no está activa para este servicio." },
        { status: 403 }
      );
    }

    // Check for existing non-cancelled booking for this session
    const duplicate = await prisma.booking.findFirst({
      where: { sessionId: gymSession.id, memberId, status: { not: "CANCELLED" } },
    });
    if (duplicate) {
      return Response.json({ error: "Ya estás inscrito en esta clase." }, { status: 409 });
    }

    // Capacity check — invitations PENDING do NOT count toward capacity
    const maxCapacity = gymSession.program.maxCapacity ?? 0;
    if (maxCapacity > 0 && gymSession._count.bookings >= maxCapacity) {
      return Response.json(
        { error: "La clase ya no tiene cupos disponibles." },
        { status: 409 }
      );
    }

    // Capture session tracking vars before transaction
    const trackSessions = validMembership.totalSessions !== null;
    const membershipId = validMembership.id;
    const totalSessions = validMembership.totalSessions!;

    // Atomic: create booking + update invitation + increment usedSessions
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: { sessionId: gymSession.id, memberId, status: "CONFIRMED" },
      });

      await tx.bookingInvitation.update({
        where: { id },
        data: { status: "ACCEPTED", bookingId: newBooking.id },
      });

      if (trackSessions) {
        // Atomic increment with WHERE guard to prevent race-condition over-consumption
        const incremented = await tx.membership.updateMany({
          where: { id: membershipId, usedSessions: { lt: totalSessions } },
          data: { usedSessions: { increment: 1 } },
        });
        if (incremented.count === 0) throw new Error("SESSION_CONFLICT");
      }

      return newBooking;
    });

    return Response.json({ status: "accepted", bookingId: booking.id });
  } catch (e) {
    if (e instanceof Error && e.message === "SESSION_CONFLICT") {
      return Response.json(
        { error: "No tienes sesiones disponibles." },
        { status: 403 }
      );
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
