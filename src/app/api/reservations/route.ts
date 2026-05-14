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
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get("userId");
  const classId = searchParams.get("classId");

  const filter: { memberId?: string; sessionId?: string } = {};

  if (userIdParam) {
    // Client still sends the mock "user-123" — always use the real authenticated user instead
    const session = await auth();
    if (!session?.user?.id) return Response.json([]);
    filter.memberId = session.user.id;
  }

  if (classId) filter.sessionId = classId;

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
    if (gymSession.program.serviceType !== "OTHER") {
      const max = gymSession.program.maxCapacity ?? 0;
      if (max > 0 && gymSession._count.bookings >= max) {
        return Response.json({ error: "Clase llena" }, { status: 400 });
      }
    }

    const duplicate = await prisma.booking.findFirst({
      where: { sessionId: classId, memberId, status: { not: "CANCELLED" } },
    });
    if (duplicate) {
      return Response.json({ error: "Ya tienes esta clase reservada" }, { status: 400 });
    }

    const booking = await prisma.booking.create({
      data: { sessionId: classId, memberId, status: "CONFIRMED" },
      include: {
        session: { include: { program: true } },
        member: { select: { id: true, name: true, email: true } },
      },
    });

    return Response.json(toReservation(booking), { status: 201 });
  } catch {
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
    });
    if (!booking) {
      return Response.json({ error: "Reserva no encontrada" }, { status: 404 });
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
