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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      status?: ReservationStatus;
      attendanceStatus?: AttendanceStatus;
      eligibleForMakeup?: boolean;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
      updateNote?: string;
    };

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        session: { include: { program: true } },
        member: { select: { id: true, name: true, email: true } },
      },
    });
    if (!booking) {
      return Response.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    // Determine new status from attendanceStatus
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

    // Echo back fields not stored in DB so client local state updates correctly
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
