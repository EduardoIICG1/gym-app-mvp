import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ReservationStatus, AttendanceStatus } from "@/lib/types";
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

const ATTENDANCE_TO_BOOKING: Record<AttendanceStatus, BookingStatus> = {
  attended:            "ATTENDED",
  absent:              "ABSENT",
  pending_attendance:  "CONFIRMED",
};

async function resolveBookingWithSession(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      session: { select: { coachId: true } },
      member: { select: { id: true, name: true, email: true } },
    },
  });
}

function canManage(
  role: string,
  authUserId: string,
  sessionCoachId: string
): boolean {
  if (role === "ADMIN") return true;
  if (role === "COACH") return sessionCoachId === authUserId;
  return false; // MEMBER cannot manage other bookings
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await resolveBookingWithSession(id);
    if (!booking) {
      return Response.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (!canManage(session.user.role, session.user.id, booking.session.coachId)) {
      return Response.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await request.json() as {
      attendanceStatus?: AttendanceStatus;
      updateNote?: string;
      // legacy fields echoed back to client but not persisted
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
      eligibleForMakeup?: boolean;
    };

    const newStatus: BookingStatus = body.attendanceStatus
      ? (ATTENDANCE_TO_BOOKING[body.attendanceStatus] ?? booking.status)
      : booking.status;

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: newStatus,
        notes: body.updateNote ?? booking.notes,
      },
      include: {
        session: { include: { program: true } },
        member: { select: { id: true, name: true, email: true } },
      },
    });

    return Response.json({
      id: updated.id,
      classId: updated.sessionId,
      studentId: updated.memberId,
      studentName: updated.member.name ?? "",
      studentEmail: updated.member.email,
      classDate: updated.session.startsAt.toISOString().slice(0, 10),
      status: BOOKING_TO_STATUS[updated.status],
      attendanceStatus: body.attendanceStatus ?? BOOKING_TO_ATTENDANCE[updated.status],
      eligibleForMakeup: body.eligibleForMakeup,
      lastUpdatedBy: body.lastUpdatedBy,
      lastUpdatedAt: body.lastUpdatedAt,
      updateNote: updated.notes ?? undefined,
    });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    // Richer query: need coachId for canManage + serviceType for membership credit
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            coachId: true,
            program: { select: { serviceType: true } },
          },
        },
        member: { select: { id: true } },
      },
    });
    if (!booking) {
      return Response.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    if (!canManage(session.user.role, session.user.id, booking.session.coachId)) {
      return Response.json({ error: "Acceso denegado" }, { status: 403 });
    }

    if (booking.status === "CANCELLED") {
      return Response.json({ error: "La reserva ya está cancelada" }, { status: 400 });
    }

    // Admin/Coach override: always credit the session back regardless of timing
    const membershipToCredit = await prisma.membership.findFirst({
      where: {
        memberId:      booking.member.id,
        serviceType:   booking.session.program.serviceType,
        status:        "ACTIVE",
        totalSessions: { not: null },
        usedSessions:  { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
      select:  { id: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data:  { status: "CANCELLED" },
      });
      if (membershipToCredit) {
        await tx.membership.updateMany({
          where: { id: membershipToCredit.id, usedSessions: { gt: 0 } },
          data:  { usedSessions: { decrement: 1 } },
        });
      }
    });

    return Response.json({ success: true, bookingId: id });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
