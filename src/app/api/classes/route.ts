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

// JS getDay() 0=Sun,1=Mon...6=Sat → frontend 0=Mon...5=Sat
function jsDayToFrontend(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

async function fetchSessions(from: Date, to: Date | undefined, roleFilter?: { coachId: string; serviceTypes: DbServiceType[] }) {
  return prisma.session.findMany({
    where: {
      status: { not: "CANCELLED" },
      startsAt: to ? { gte: from, lt: to } : { gte: from },
      ...(roleFilter ? { coachId: roleFilter.coachId, program: { serviceType: { in: roleFilter.serviceTypes } } } : {}),
    },
    include: {
      program: {
        include: {
          _count: { select: { sessions: { where: { status: { not: "CANCELLED" } } } } },
        },
      },
      coach: { select: { id: true, name: true } },
      _count: {
        select: {
          bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
          invitations: { where: { status: "PENDING" } },
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
  seriesCount: number;
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

  // Derive from session's actual stored times so per-session edits display correctly
  const startTime = `${String(s.startsAt.getHours()).padStart(2, "0")}:${String(s.startsAt.getMinutes()).padStart(2, "0")}`;
  const endTime = `${String(s.endsAt.getHours()).padStart(2, "0")}:${String(s.endsAt.getMinutes()).padStart(2, "0")}`;

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
    seriesCount: prog._count.sessions,
    pendingInvitationsCount: s._count.invitations,
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

  // Role-based visibility: KINESIOLOGIST sees only their own KINESIOLOGY (and blocked) sessions;
  // COACH sees only their own non-KINESIOLOGY sessions. ADMIN/MEMBER see everything (existing behavior).
  const authSession = await auth();
  const role = authSession?.user?.role;
  const userId = authSession?.user?.id;

  let roleFilter: { coachId: string; serviceTypes: DbServiceType[] } | undefined;
  if (role === "KINESIOLOGIST" && userId) {
    roleFilter = { coachId: userId, serviceTypes: ["KINESIOLOGY", "OTHER"] };
  } else if (role === "COACH" && userId) {
    roleFilter = { coachId: userId, serviceTypes: ["GROUP", "PERSONAL_TRAINING", "OTHER"] };
  }

  const sessions = await fetchSessions(from, to, roleFilter);
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
      name, serviceType, startTime, endTime,
      coach, maxCapacity, note, eventType, date,
    } = body;

    if (!name || !startTime || !endTime || !date) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const isBlocked = eventType === "blocked_time";
    const dbSvcType: DbServiceType = isBlocked ? "OTHER" : (SVC_REVERSE[serviceType] ?? "GROUP");

    // KINESIOLOGIST: only allowed to create KINESIOLOGY sessions or blocked_time
    if (role === "KINESIOLOGIST" && !isBlocked && dbSvcType !== "KINESIOLOGY") {
      return Response.json({ error: "Solo puedes crear sesiones de kinesiología" }, { status: 403 });
    }

    const [sh, sm] = String(startTime).split(":").map(Number);
    const [eh, em] = String(endTime).split(":").map(Number);
    const durationMin = Math.max(1, (eh * 60 + em) - (sh * 60 + sm));

    // Session date is the date chosen by the user — not derived from "today"
    const sessionDate = new Date(String(date) + "T00:00:00");
    sessionDate.setHours(sh, sm, 0, 0);
    const sessionEnd = new Date(sessionDate.getTime() + durationMin * 60_000);
    const effectiveDayOfWeek = jsDayToFrontend(sessionDate.getDay());

    // Resolve coach by name (includes KINESIOLOGIST so they can find themselves)
    let coachUser = coach
      ? await prisma.user.findFirst({ where: { name: coach, role: { in: ["COACH", "ADMIN", "KINESIOLOGIST"] } } })
      : null;

    // COACH and KINESIOLOGIST can only self-assign
    if (role === "COACH" || role === "KINESIOLOGIST") {
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
        dayOfWeek: effectiveDayOfWeek,
        startTime: String(startTime),
        defaultCoachId: coachUser?.id ?? undefined,
        isActive: true,
        description: note ? String(note) : undefined,
      },
    });

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
        program: {
          include: {
            _count: { select: { sessions: { where: { status: { not: "CANCELLED" } } } } },
          },
        },
        coach: { select: { id: true, name: true } },
        _count: {
          select: {
            bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
            invitations: { where: { status: "PENDING" } },
          },
        },
      },
    });

    return Response.json(toGymClass(withIncludes), { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
