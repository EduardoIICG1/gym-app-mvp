import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { GymClass, ServiceType, DayOfWeek } from "@/lib/types";
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

// Add minutes to "HH:mm" string
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// JS getDay() 0=Sun,1=Mon...6=Sat → frontend 0=Mon...5=Sat
function jsDayToFrontend(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

async function fetchSessions(from: Date, to?: Date) {
  return prisma.session.findMany({
    where: {
      status: { not: "CANCELLED" },
      startsAt: to ? { gte: from, lt: to } : { gte: from },
    },
    include: {
      program: true,
      coach: { select: { id: true, name: true } },
      _count: {
        select: {
          bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });
}

type SessionRow = Awaited<ReturnType<typeof fetchSessions>>[number];

type GymClassResponse = GymClass & {
  coachId: string;
  sessionDate: string;
  programId: string;
  // /classes page backward compat aliases
  capacity: number;
  reserved: number;
};

function toGymClass(s: SessionRow): GymClassResponse {
  const prog = s.program;
  const isBlocked = prog.serviceType === "OTHER";
  const svcType: ServiceType = SVC_MAP[prog.serviceType] ?? "group";

  // Prefer program.dayOfWeek (set on recurring programs), else derive from session date
  const rawDayOfWeek =
    prog.dayOfWeek != null
      ? prog.dayOfWeek
      : jsDayToFrontend(s.startsAt.getDay());
  const dayOfWeek = rawDayOfWeek as DayOfWeek;

  // Prefer program.startTime to avoid UTC timezone issues
  const startTime =
    prog.startTime ??
    `${String(s.startsAt.getHours()).padStart(2, "0")}:${String(s.startsAt.getMinutes()).padStart(2, "0")}`;
  const endTime = addMinutes(startTime, prog.durationMin);

  const reservedCount = s._count.bookings;
  const maxCapacity = prog.maxCapacity ?? 0;

  return {
    id: s.id,                  // session.id acts as classId across the frontend
    name: prog.name,
    eventType: isBlocked ? "blocked_time" : "class",
    serviceType: isBlocked ? "blocked_time" : svcType,
    dayOfWeek,
    startTime,
    endTime,
    coach: s.coach.name ?? "",
    coachId: s.coachId,
    maxCapacity,
    reservedCount,
    status: s.status === "CANCELLED" ? "cancelled" : "active",
    note: s.notes ?? prog.description ?? undefined,
    // Fields not in DB — safe defaults
    hasBookingCutoff: false,
    bookingCutoffValue: 0,
    bookingCutoffUnit: "hours",
    bookingMode: "regular",
    // Extra fields
    sessionDate: s.startsAt.toISOString().slice(0, 10),
    programId: prog.id,
    // Backward compat for /classes page (uses capacity/reserved field names)
    capacity: maxCapacity,
    reserved: reservedCount,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");

  // weekStart provided → show only that week; otherwise show upcoming sessions
  const from = weekStart ? new Date(weekStart + "T00:00:00") : new Date();
  const to = weekStart ? new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined;

  const sessions = await fetchSessions(from, to);
  return Response.json(sessions.map(toGymClass));
}

export async function POST(request: Request) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = authSession.user.role;
    if (role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, serviceType, dayOfWeek, startTime, endTime,
      coach, maxCapacity, note, eventType,
    } = body;

    if (!name || !startTime || !endTime) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const isBlocked = eventType === "blocked_time";
    const dbSvcType: DbServiceType = isBlocked ? "OTHER" : (SVC_REVERSE[serviceType] ?? "GROUP");

    const [sh, sm] = String(startTime).split(":").map(Number);
    const [eh, em] = String(endTime).split(":").map(Number);
    const durationMin = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));

    // Resolve coach by name
    let coachUser = coach
      ? await prisma.user.findFirst({ where: { name: coach, role: { in: ["COACH", "ADMIN"] } } })
      : null;

    if (role === "COACH") {
      if (coachUser && coachUser.id !== authSession.user.id) {
        return Response.json({ error: "Sin permisos" }, { status: 403 });
      }
      if (!coachUser) {
        coachUser = await prisma.user.findUnique({ where: { id: authSession.user.id } });
      }
    }

    const program = await prisma.program.create({
      data: {
        name: String(name).trim(),
        serviceType: dbSvcType,
        durationMin,
        maxCapacity: isBlocked ? 0 : (Number(maxCapacity) || 20),
        dayOfWeek: Number(dayOfWeek),
        startTime: String(startTime),
        defaultCoachId: coachUser?.id ?? undefined,
        isActive: true,
        description: note ? String(note) : undefined,
      },
    });

    // Create Session for the current week's date of this dayOfWeek
    const today = new Date();
    const todayFrontend = jsDayToFrontend(today.getDay());
    const diffDays = Number(dayOfWeek) - todayFrontend;
    const sessionDate = new Date(today);
    sessionDate.setDate(today.getDate() + diffDays);
    sessionDate.setHours(sh, sm, 0, 0);
    const sessionEnd = new Date(sessionDate.getTime() + durationMin * 60_000);

    const session = await prisma.session.create({
      data: {
        programId: program.id,
        coachId: coachUser?.id ?? (await prisma.user.findFirst({ where: { role: "ADMIN" } }))!.id,
        startsAt: sessionDate,
        endsAt: sessionEnd,
        notes: note ? String(note) : undefined,
        status: "SCHEDULED",
      },
    });

    const withIncludes = await prisma.session.findUniqueOrThrow({
      where: { id: session.id },
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

    return Response.json(toGymClass(withIncludes), { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
