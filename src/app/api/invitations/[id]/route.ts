import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  findEligibleMembership,
  getMembershipDenialReason,
  MEMBERSHIP_DENIAL_MESSAGES,
} from "@/lib/membershipSelection";

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

    // Validate eligible membership (ACTIVE + PAID + valid dates + sessions available)
    const validMembership = await findEligibleMembership(prisma, memberId, serviceType, now);

    if (!validMembership) {
      const reason = await getMembershipDenialReason(prisma, memberId, serviceType, now);
      return Response.json({ error: MEMBERSHIP_DENIAL_MESSAGES[reason] }, { status: 403 });
    }

    // A booking row may already exist for this (session, member) pair if the member
    // previously cancelled — @@unique([sessionId, memberId]) means we must reuse/update
    // that row instead of inserting a new one, or the insert throws a P2002 (→ 500).
    const existingBooking = await prisma.booking.findUnique({
      where: { sessionId_memberId: { sessionId: gymSession.id, memberId } },
    });
    if (existingBooking && existingBooking.status !== "CANCELLED") {
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

    // Atomic: create/reuse booking + update invitation + increment usedSessions
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = existingBooking
        ? await tx.booking.update({
            where: { id: existingBooking.id },
            data: { status: "CONFIRMED", membershipId },
          })
        : await tx.booking.create({
            data: { sessionId: gymSession.id, memberId, status: "CONFIRMED", membershipId },
          });

      await tx.bookingInvitation.update({
        where: { id },
        data: { status: "ACCEPTED", bookingId: newBooking.id },
      });

      if (trackSessions) {
        // Atomic increment with WHERE guard to prevent race-condition over-consumption
        const incremented = await tx.membership.updateMany({
          where: {
            id: membershipId,
            status: "ACTIVE",
            paymentStatus: "PAID",
            usedSessions: { lt: totalSessions },
          },
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
        { error: "No tienes sesiones disponibles en tu membresía." },
        { status: 403 }
      );
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
