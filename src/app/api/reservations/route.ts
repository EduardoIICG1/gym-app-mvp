import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Reservation, ReservationStatus, AttendanceStatus } from "@/lib/types";
import type { BookingStatus } from "@prisma/client";

const BOOKING_TO_STATUS: Record<BookingStatus, ReservationStatus> = {
  INVITED:    "reserved",
  CONFIRMED:  "reserved",
  WAITLISTED: "reserved",
  CANCELLED:  "cancelled",
  ATTENDED:   "attended",
  ABSENT:     "absent",
};

const BOOKING_TO_ATTENDANCE: Partial<Record<BookingStatus, AttendanceStatus>> = {
  ATTENDED: "attended",
  ABSENT:   "absent",
};

// Cancellation window: member gets session refund only if cancelling more than this before class start
const CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

async function fetchBookings(filter: { memberId?: string; sessionId?: string }) {
  return prisma.booking.findMany({
    where: filter,
    include: {
      session: { include: { program: true } },
      member: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

type BookingRow = Awaited<ReturnType<typeof fetchBookings>>[number];

function toReservation(b: BookingRow): Reservation {
  return {
    id: b.id,
    classId: b.sessionId,
    className: b.session.program.name,
    studentId: b.memberId,
    studentName: b.member.name ?? "",
    studentEmail: b.member.email,
    classDate: b.session.startsAt.toISOString().slice(0, 10),
    startTime: b.session.startsAt.toISOString().slice(11, 16),
    status: BOOKING_TO_STATUS[b.status],
    attendanceStatus: BOOKING_TO_ATTENDANCE[b.status],
    updateNote: b.notes ?? undefined,
  };
}

export async function GET(request: Request) {
  // Auth required for all GET requests — never expose booking data without a session
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");
  const classId = searchParams.get("classId");

  const isAdmin  = session.user.role === "ADMIN";
  const isCoach  = session.user.role === "COACH" || session.user.role === "KINESIOLOGIST";
  const isMember = session.user.role === "MEMBER";

  const filter: { memberId?: string; sessionId?: string } = {};

  if (userIdParam) {
    // Always use the real authenticated user — ignore client-supplied userId value
    filter.memberId = session.user.id;
  }

  if (classId) {
    if (isMember) {
      // MEMBER: classId only returns own booking for that class — no attendee list exposure
      filter.memberId = session.user.id;
      filter.sessionId = classId;
    } else if (isCoach) {
      // COACH: can only see attendees of sessions they own
      const gymSession = await prisma.session.findUnique({
        where: { id: classId },
        select: { coachId: true },
      });
      if (!gymSession) {
        return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
      }
      if (gymSession.coachId !== session.user.id) {
        return Response.json({ error: "Acceso denegado" }, { status: 403 });
      }
      filter.sessionId = classId;
    } else if (isAdmin) {
      filter.sessionId = classId;
    }
  }

  const bookings = await fetchBookings(filter);
  return Response.json(bookings.map(toReservation));
}

export async function POST(request: Request) {
  try {
    // Use authenticated user — never trust client-supplied userId
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const memberId = session.user.id;

    // COACH/KINESIOLOGIST cannot book themselves into classes — they manage attendance,
    // not reserve as members. Members are added via invitations/convocatoria.
    if (session.user.role === "COACH" || session.user.role === "KINESIOLOGIST") {
      return Response.json(
        { error: "Los coaches y kinesiólogos no pueden reservar clases para sí mismos." },
        { status: 403 }
      );
    }

    const { classId } = await request.json();
    if (!classId) {
      return Response.json({ error: "classId requerido" }, { status: 400 });
    }

    const gymSession = await prisma.session.findUnique({
      where: { id: classId },
      include: {
        program: true,
        _count: {
          select: {
            bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
          },
        },
      },
    });
    if (!gymSession) {
      return Response.json({ error: "Clase no encontrada" }, { status: 404 });
    }
    if (gymSession.status === "CANCELLED") {
      return Response.json({ error: "Clase cancelada" }, { status: 400 });
    }
    // Track which membership to increment (set inside gating block, used in transaction below)
    let validMembershipId: string | null = null;
    let validTotalSessions: number | null = null;

    // Membership gating — MEMBER only; ADMIN/COACH bypass
    if (session.user.role === "MEMBER") {
      const serviceType = gymSession.program.serviceType;
      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const memberships = await prisma.membership.findMany({
        where: { memberId, serviceType },
        orderBy: { createdAt: "desc" },
      });

      if (memberships.length === 0) {
        return Response.json(
          { error: "No tienes una membresía activa para este tipo de clase." },
          { status: 403 }
        );
      }

      const valid = memberships.find(
        (m) =>
          m.status === "ACTIVE" &&
          m.startDate <= now &&
          (m.endDate === null || m.endDate >= todayStart) &&
          (m.totalSessions === null || m.usedSessions < m.totalSessions)
      );

      if (!valid) {
        const hasActive = memberships.some((m) => m.status === "ACTIVE");
        if (hasActive) {
          const active = memberships.find((m) => m.status === "ACTIVE")!;
          if (active.totalSessions !== null && active.usedSessions >= active.totalSessions) {
            return Response.json(
              { error: "No tienes sesiones disponibles en tu membresía." },
              { status: 403 }
            );
          }
          return Response.json(
            { error: "Tu membresía está vencida. Regulariza tu membresía para reservar." },
            { status: 403 }
          );
        }
        if (memberships.some((m) => m.status === "EXPIRED")) {
          return Response.json(
            { error: "Tu membresía está vencida. Regulariza tu membresía para reservar." },
            { status: 403 }
          );
        }
        return Response.json(
          { error: "Tu membresía no está activa. Contacta a administración." },
          { status: 403 }
        );
      }
      // valid is confirmed non-null here — capture for session tracking
      if (valid.totalSessions !== null) {
        validMembershipId   = valid.id;
        validTotalSessions  = valid.totalSessions;
      }
    }

    if (gymSession.program.serviceType !== "OTHER") {
      const max = gymSession.program.maxCapacity ?? 0;
      if (max > 0 && gymSession._count.bookings >= max) {
        return Response.json({ error: "Esta clase ya no tiene cupos." }, { status: 400 });
      }
    }

    // A booking row may already exist for this (session, member) pair if the member
    // previously cancelled — @@unique([sessionId, memberId]) means we must reuse/update
    // that row instead of inserting a new one, or the insert throws a P2002 (→ 500).
    const existingBooking = await prisma.booking.findUnique({
      where: { sessionId_memberId: { sessionId: classId, memberId } },
    });
    if (existingBooking && existingBooking.status !== "CANCELLED") {
      return Response.json({ error: "Ya tienes esta clase reservada" }, { status: 400 });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = existingBooking
        ? await tx.booking.update({
            where: { id: existingBooking.id },
            data: { status: "CONFIRMED" },
            include: {
              session: { include: { program: true } },
              member: { select: { id: true, name: true, email: true } },
            },
          })
        : await tx.booking.create({
            data: { sessionId: classId, memberId, status: "CONFIRMED" },
            include: {
              session: { include: { program: true } },
              member: { select: { id: true, name: true, email: true } },
            },
          });
      if (validMembershipId !== null && validTotalSessions !== null) {
        // Atomic increment — WHERE guard prevents race-condition over-consumption
        const incremented = await tx.membership.updateMany({
          where: { id: validMembershipId, usedSessions: { lt: validTotalSessions } },
          data:  { usedSessions: { increment: 1 } },
        });
        if (incremented.count === 0) throw new Error("SESSION_CONFLICT");
      }
      return newBooking;
    });

    return Response.json(toReservation(booking), { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "SESSION_CONFLICT") {
      return Response.json({ error: "No tienes sesiones disponibles en tu membresía." }, { status: 403 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const memberId = session.user.id;

    const { classId } = await request.json();
    if (!classId) {
      return Response.json({ error: "classId requerido" }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { sessionId: classId, memberId, status: { not: "CANCELLED" } },
      include: {
        session: {
          select: {
            startsAt: true,
            program: { select: { serviceType: true } },
          },
        },
      },
    });
    if (!booking) {
      return Response.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    const now   = new Date();
    const isLate = booking.session.startsAt.getTime() - now.getTime() <= CANCEL_WINDOW_MS;

    // Only look for a membership to credit if the cancel is within the free window
    let membershipToCredit: { id: string } | null = null;
    if (!isLate) {
      membershipToCredit = await prisma.membership.findFirst({
        where: {
          memberId,
          serviceType:   booking.session.program.serviceType,
          status:        "ACTIVE",
          totalSessions: { not: null },
          usedSessions:  { gt: 0 },
        },
        orderBy: { createdAt: "desc" },
        select:  { id: true },
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data:  { status: "CANCELLED" },
      });
      if (membershipToCredit) {
        // Guard against decrement below zero (defensive — should never trigger)
        await tx.membership.updateMany({
          where: { id: membershipToCredit.id, usedSessions: { gt: 0 } },
          data:  { usedSessions: { decrement: 1 } },
        });
      }
    });

    return Response.json({
      success: true,
      late:    isLate,
      ...(isLate ? { message: "Cancelación tardía: la sesión no será recuperada." } : {}),
    });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
