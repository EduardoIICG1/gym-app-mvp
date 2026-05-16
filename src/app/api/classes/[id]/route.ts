import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ServiceType, GymClass, DayOfWeek } from "@/lib/types";
import type { ServiceType as DbServiceType } from "@prisma/client";

const SVC_MAP: Partial<Record<DbServiceType, ServiceType>> = {
  GROUP: "group",
  PERSONAL_TRAINING: "personal_training",
  KINESIOLOGY: "kinesiology",
  OTHER: "blocked_time",
};

const SVC_REVERSE: Record<string, DbServiceType> = {
  group: "GROUP",
  personal_training: "PERSONAL_TRAINING",
  kinesiology: "KINESIOLOGY",
  blocked_time: "OTHER",
};

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function jsDayToFrontend(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const gymSession = await prisma.session.findUnique({
    where: { id },
    include: {
      program: true,
      coach: { select: { id: true, name: true } },
      bookings: {
        where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } },
        include: { member: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
        },
      },
    },
  });

  if (!gymSession) {
    return Response.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  const role = authSession.user.role; // "ADMIN" | "COACH" | "MEMBER"
  const isAdmin = role === "ADMIN";
  const isAuthorizedCoach = role === "COACH" && gymSession.coachId === authSession.user.id;

  // COACH attempting to view another coach's session
  if (role === "COACH" && !isAuthorizedCoach) {
    return Response.json({ error: "Acceso denegado" }, { status: 403 });
  }

  const prog = gymSession.program;
  const startTime = prog.startTime ?? gymSession.startsAt.toISOString().slice(11, 16);
  const endTime = addMinutes(startTime, prog.durationMin);

  const base = {
    id: gymSession.id,
    programName: prog.name,
    serviceType: SVC_MAP[prog.serviceType] ?? "group",
    sessionDate: gymSession.startsAt.toISOString().slice(0, 10),
    startTime,
    endTime,
    coachName: gymSession.coach.name ?? "",
    capacity: prog.maxCapacity ?? 0,
    reservedCount: gymSession._count.bookings,
    status: gymSession.status === "CANCELLED" ? "cancelled" : "active",
  };

  if (isAdmin || isAuthorizedCoach) {
    return Response.json({
      ...base,
      attendees: gymSession.bookings.map(b => ({
        bookingId: b.id,
        memberId: b.member.id,
        memberName: b.member.name ?? "",
        memberEmail: b.member.email,
        status: b.status,
      })),
    });
  }

  // MEMBER: base data only, no attendees
  return Response.json(base);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.session.findUnique({
      where: { id },
      include: { program: true },
    });
    if (!existing) return Response.json({ error: "Clase no encontrada" }, { status: 404 });

    const prog = existing.program;
    const isBlocked = body.eventType === "blocked_time";
    const dbSvcType: DbServiceType = isBlocked
      ? "OTHER"
      : (SVC_REVERSE[body.serviceType] ?? prog.serviceType);

    // Compute durationMin if times provided
    const newStart: string | null = body.startTime ?? null;
    const newEnd: string | null = body.endTime ?? null;
    let durationMin = prog.durationMin;
    if (newStart && newEnd) {
      const [sh, sm] = newStart.split(":").map(Number);
      const [eh, em] = newEnd.split(":").map(Number);
      durationMin = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));
    }

    // Update Program
    await prisma.program.update({
      where: { id: prog.id },
      data: {
        name: body.name ?? prog.name,
        serviceType: dbSvcType,
        maxCapacity: body.maxCapacity != null ? Number(body.maxCapacity) : prog.maxCapacity,
        startTime: newStart ?? prog.startTime,
        durationMin,
        description: body.note !== undefined ? (body.note || null) : prog.description,
      },
    });

    // Resolve coach by name if changed
    let coachId = existing.coachId;
    if (body.coach) {
      const coachUser = await prisma.user.findFirst({
        where: { name: body.coach, role: { in: ["COACH", "ADMIN"] } },
      });
      if (coachUser) coachId = coachUser.id;
    }

    // Recompute startsAt/endsAt only if time changed
    let startsAt = existing.startsAt;
    let endsAt = existing.endsAt;
    if (newStart) {
      const [sh, sm] = newStart.split(":").map(Number);
      startsAt = new Date(existing.startsAt);
      startsAt.setHours(sh, sm, 0, 0);
      endsAt = new Date(startsAt.getTime() + durationMin * 60_000);
    }

    await prisma.session.update({
      where: { id },
      data: {
        coachId,
        startsAt,
        endsAt,
        notes: body.note !== undefined ? (body.note || null) : existing.notes,
      },
    });

    const updated = await prisma.session.findUniqueOrThrow({
      where: { id },
      include: {
        program: true,
        coach: { select: { id: true, name: true } },
        _count: {
          select: {
            bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
          },
        },
      },
    });

    const p = updated.program;
    const isUpdatedBlocked = p.serviceType === "OTHER";
    const svcType: ServiceType = SVC_MAP[p.serviceType] ?? "group";
    const rawDay = p.dayOfWeek != null ? p.dayOfWeek : jsDayToFrontend(updated.startsAt.getDay());
    const startTime = p.startTime ?? `${String(updated.startsAt.getHours()).padStart(2, "0")}:${String(updated.startsAt.getMinutes()).padStart(2, "0")}`;
    const endTime = addMinutes(startTime, p.durationMin);
    const maxCapacity = p.maxCapacity ?? 0;
    const reservedCount = updated._count.bookings;

    const result: GymClass & { coachId: string; sessionDate: string; programId: string; capacity: number; reserved: number } = {
      id: updated.id,
      name: p.name,
      eventType: isUpdatedBlocked ? "blocked_time" : "class",
      serviceType: isUpdatedBlocked ? "blocked_time" : svcType,
      dayOfWeek: rawDay as DayOfWeek,
      startTime,
      endTime,
      coach: updated.coach.name ?? "",
      coachId: updated.coachId,
      maxCapacity,
      reservedCount,
      status: updated.status === "CANCELLED" ? "cancelled" : "active",
      note: updated.notes ?? p.description ?? undefined,
      hasBookingCutoff: false,
      bookingCutoffValue: 0,
      bookingCutoffUnit: "hours",
      bookingMode: "regular",
      sessionDate: updated.startsAt.toISOString().slice(0, 10),
      programId: p.id,
      capacity: maxCapacity,
      reserved: reservedCount,
    };

    return Response.json(result);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) return Response.json({ error: "Clase no encontrada" }, { status: 404 });

    // Cancel all active bookings for this session
    await prisma.booking.updateMany({
      where: { sessionId: id, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED" },
    });

    // Mark session as cancelled (don't delete — preserves booking history)
    await prisma.session.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
