import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ServiceType as DbServiceType } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────────────────

const SVC_REVERSE: Record<string, DbServiceType> = {
  group:             "GROUP",
  personal_training: "PERSONAL_TRAINING",
  kinesiology:       "KINESIOLOGY",
  blocked_time:      "OTHER",
};

const MAX_OCCURRENCES = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Frontend DayOfWeek: 0=Mon … 5=Sat (matches DayOfWeek type in src/lib/types.ts)
// JS Date.getDay():   0=Sun, 1=Mon … 6=Sat
function jsDayToFrontend(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Generate all dates between startDate and endDate (inclusive) matching the
// given frontend weekdays, up to the given limit.
function generateCandidateDates(
  startDate: string,
  endDate: string,
  weekdays: number[],
  limit: number,
): Date[] {
  const start  = new Date(startDate + "T00:00:00");
  const end    = new Date(endDate   + "T00:00:00");
  const dates: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end && dates.length < limit) {
    if (weekdays.includes(jsDayToFrontend(cursor.getDay()))) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

// ── POST /api/classes/batch ───────────────────────────────────────────────────
//
// Creates multiple Sessions from a single weekly recurrence config.
// One Program is shared across all sessions in the batch.
//
// Request body:
// {
//   name: string,
//   serviceType: "group" | "personal_training" | "kinesiology" | "blocked_time",
//   coach?: string,          // coach display name (resolved by name, same as POST /api/classes)
//   startTime: "HH:mm",
//   endTime: "HH:mm",
//   maxCapacity?: number,    // required for non-blocked_time classes
//   note?: string,
//   location?: string,
//   recurrence: {
//     weekdays: number[],    // 0=Mon … 5=Sat (Sunday not supported in this version)
//     startDate: "YYYY-MM-DD",
//     endDate: "YYYY-MM-DD",
//     maxOccurrences?: number  // default 60, max 60
//   }
// }
//
// Notes on behavior:
// - Past dates are NOT rejected (consistent with POST /api/classes which has no past-date guard).
// - Sunday (weekday 6) is not supported — DayOfWeek type is 0-5.
// - Conflicts (same coach, overlapping time, status != CANCELLED) are skipped, not aborted.
// - dayOfWeek is intentionally not set on the created Program; toGymClass derives it from Session.startsAt.

export async function POST(request: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = authSession.user.role;
    if (role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await request.json() as Record<string, unknown>;
    const {
      name, serviceType, coach,
      startTime, endTime, maxCapacity,
      note, location, recurrence,
    } = body;

    // ── Required fields ───────────────────────────────────────────────────────
    if (!name || !startTime || !endTime || !recurrence) {
      return Response.json(
        { error: "Campos requeridos: name, startTime, endTime, recurrence" },
        { status: 400 },
      );
    }

    // ── Recurrence validation ─────────────────────────────────────────────────
    const rec       = recurrence as Record<string, unknown>;
    const weekdays  = rec.weekdays  as unknown;
    const startDate = rec.startDate as unknown;
    const endDate   = rec.endDate   as unknown;
    const maxOcc    = typeof rec.maxOccurrences === "number"
      ? rec.maxOccurrences
      : MAX_OCCURRENCES;

    if (!Array.isArray(weekdays) || weekdays.length === 0) {
      return Response.json(
        { error: "recurrence.weekdays es requerido y no puede estar vacío" },
        { status: 400 },
      );
    }
    if (typeof startDate !== "string" || typeof endDate !== "string") {
      return Response.json(
        { error: "recurrence.startDate y recurrence.endDate son requeridos (YYYY-MM-DD)" },
        { status: 400 },
      );
    }
    if ((weekdays as number[]).some((d) => typeof d !== "number" || d < 0 || d > 5)) {
      return Response.json(
        { error: "recurrence.weekdays acepta 0 (lunes) a 5 (sábado); domingo no soportado en esta versión" },
        { status: 400 },
      );
    }
    if (maxOcc < 1 || maxOcc > MAX_OCCURRENCES) {
      return Response.json(
        { error: `recurrence.maxOccurrences debe estar entre 1 y ${MAX_OCCURRENCES}` },
        { status: 400 },
      );
    }

    // ── Date validation ───────────────────────────────────────────────────────
    const startDateObj = new Date(startDate + "T00:00:00");
    const endDateObj   = new Date(endDate   + "T00:00:00");
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return Response.json(
        { error: "startDate o endDate no son fechas válidas; usa formato YYYY-MM-DD" },
        { status: 400 },
      );
    }
    if (startDateObj > endDateObj) {
      return Response.json(
        { error: "startDate debe ser anterior o igual a endDate" },
        { status: 400 },
      );
    }

    // ── Time validation ───────────────────────────────────────────────────────
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRe.test(String(startTime)) || !timeRe.test(String(endTime))) {
      return Response.json(
        { error: "startTime y endTime deben tener formato HH:mm" },
        { status: 400 },
      );
    }
    const [sh, sm] = String(startTime).split(":").map(Number);
    const [eh, em] = String(endTime).split(":").map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMin <= 0) {
      return Response.json(
        { error: "startTime debe ser anterior a endTime" },
        { status: 400 },
      );
    }

    // ── Service type ──────────────────────────────────────────────────────────
    const isBlocked = serviceType === "blocked_time";
    const dbSvcType: DbServiceType = isBlocked
      ? "OTHER"
      : (SVC_REVERSE[String(serviceType)] ?? "GROUP");

    if (role === "KINESIOLOGIST" && !isBlocked && dbSvcType !== "KINESIOLOGY") {
      return Response.json(
        { error: "Solo puedes crear sesiones de kinesiología" },
        { status: 403 },
      );
    }

    // ── Capacity ──────────────────────────────────────────────────────────────
    const capacity = Number(maxCapacity) || 0;
    if (!isBlocked && capacity < 1) {
      return Response.json(
        { error: "maxCapacity debe ser mayor que 0 para clases" },
        { status: 400 },
      );
    }

    // ── Coach resolution (mirrors POST /api/classes) ──────────────────────────
    let coachUser = coach
      ? await prisma.user.findFirst({
          where: { name: String(coach), role: { in: ["COACH", "ADMIN", "KINESIOLOGIST"] } },
        })
      : null;

    if (role === "COACH" || role === "KINESIOLOGIST") {
      if (coachUser && coachUser.id !== authSession.user.id) {
        return Response.json(
          { error: "Sin permisos para crear clases para otro instructor" },
          { status: 403 },
        );
      }
      if (!coachUser) {
        coachUser = await prisma.user.findUnique({ where: { id: authSession.user.id } });
      }
    }

    const resolvedCoachId =
      coachUser?.id ??
      (await prisma.user.findFirst({ where: { role: "ADMIN" } }))!.id;

    // ── Generate candidate dates ──────────────────────────────────────────────
    const candidateDates = generateCandidateDates(startDate, endDate, weekdays as number[], maxOcc);
    const requested = candidateDates.length;

    if (requested === 0) {
      return Response.json({
        created: [],
        skipped: [],
        summary: { requested: 0, created: 0, skipped: 0 },
      });
    }

    // ── Create one Program shared by all sessions in this batch ──────────────
    // dayOfWeek intentionally omitted: sessions may span multiple weekdays.
    // toGymClass derives dayOfWeek from session.startsAt when program.dayOfWeek is null.
    const program = await prisma.program.create({
      data: {
        name:           String(name).trim(),
        serviceType:    dbSvcType,
        durationMin,
        maxCapacity:    isBlocked ? 0 : capacity,
        startTime:      String(startTime),
        defaultCoachId: coachUser?.id ?? undefined,
        isActive:       true,
        description:    note ? String(note) : undefined,
      },
    });

    // ── Process each candidate date ───────────────────────────────────────────
    const created: { id: string; date: string; startTime: string; endTime: string }[] = [];
    const skipped: { date: string; reason: string }[] = [];

    for (const date of candidateDates) {
      const sessionStart = new Date(date);
      sessionStart.setHours(sh, sm, 0, 0);
      const sessionEnd = new Date(sessionStart.getTime() + durationMin * 60_000);
      const dateStr    = date.toISOString().slice(0, 10);

      // Conflict: same coach, overlapping window, not cancelled
      const conflict = await prisma.session.findFirst({
        where: {
          coachId:  resolvedCoachId,
          status:   { not: "CANCELLED" },
          startsAt: { lt: sessionEnd },
          endsAt:   { gt: sessionStart },
        },
        select: { id: true },
      });

      if (conflict) {
        skipped.push({ date: dateStr, reason: "Instructor already has a class at this time" });
        continue;
      }

      try {
        const session = await prisma.session.create({
          data: {
            programId: program.id,
            coachId:   resolvedCoachId,
            startsAt:  sessionStart,
            endsAt:    sessionEnd,
            notes:     note     ? String(note)     : undefined,
            location:  location ? String(location) : undefined,
            status:    "SCHEDULED",
          },
        });

        created.push({
          id:        session.id,
          date:      dateStr,
          startTime: String(startTime),
          endTime:   String(endTime),
        });
      } catch (err: unknown) {
        const isUnique =
          err instanceof Error &&
          (err.message.includes("Unique constraint") || err.message.includes("P2002"));
        skipped.push({
          date:   dateStr,
          reason: isUnique ? "Duplicate session" : "Error al crear la sesión",
        });
      }
    }

    return Response.json(
      {
        created,
        skipped,
        summary: { requested, created: created.length, skipped: skipped.length },
      },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
