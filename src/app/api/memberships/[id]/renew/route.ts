import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Membership, ServiceType, MembershipStatus, PaymentStatus } from "@/lib/types";
import type {
  MembershipStatus as DbStatus,
  ServiceType as DbServiceType,
  PaymentStatus as DbPaymentStatus,
} from "@prisma/client";

// ── Mapping tables ────────────────────────────────────────────────────────────

const SVC_MAP: Partial<Record<DbServiceType, ServiceType>> = {
  GROUP:             "group",
  PERSONAL_TRAINING: "personal_training",
  KINESIOLOGY:       "kinesiology",
};

const STATUS_MAP: Record<DbStatus, MembershipStatus> = {
  ACTIVE:    "active",
  EXPIRED:   "expired",
  CANCELLED: "cancelled",
  PENDING:   "pending",
};

const PAYMENT_MAP: Record<DbPaymentStatus, PaymentStatus> = {
  PAID:    "paid",
  PENDING: "pending",
  OVERDUE: "overdue",
};

const PAYMENT_REVERSE: Record<string, DbPaymentStatus> = {
  paid:    "PAID",
  pending: "PENDING",
  overdue: "OVERDUE",
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function addDaysTo(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Compute suggested start/end dates for a renewal.
 *
 * Rules:
 * - If source has a future or same-day endDate: newStart = endDate + 1 day.
 * - If source is expired or has no endDate:     newStart = today.
 * - newEnd preserves the original duration; falls back to +30 days if no endDate.
 */
function computeRenewDates(
  source: { startDate: Date; endDate: Date | null },
  today: Date,
): { startDate: Date; endDate: Date } {
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  let newStart: Date;
  if (source.endDate && source.endDate >= todayMidnight) {
    newStart = addDaysTo(source.endDate, 1);
    newStart.setHours(0, 0, 0, 0);
  } else {
    newStart = new Date(todayMidnight);
  }

  let newEnd: Date;
  if (source.endDate) {
    const durationDays = Math.round(
      (source.endDate.getTime() - source.startDate.getTime()) / 86_400_000,
    );
    newEnd = addDaysTo(newStart, Math.max(durationDays, 1));
  } else {
    newEnd = addDaysTo(newStart, 30);
  }
  newEnd.setHours(23, 59, 59, 0);

  return { startDate: newStart, endDate: newEnd };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "COACH") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // ── Source membership ────────────────────────────────────────────────────
    const source = await prisma.membership.findUnique({
      where:   { id },
      include: { member: { select: { id: true, name: true, email: true } } },
    });
    if (!source) {
      return Response.json({ error: "Membresía no encontrada" }, { status: 404 });
    }

    // ── COACH: verify MemberCoach relation ───────────────────────────────────
    if (session.user.role === "COACH") {
      const relation = await prisma.memberCoach.findFirst({
        where: {
          memberId:    source.memberId,
          coachId:     session.user.id,
          serviceType: source.serviceType,
          isActive:    true,
        },
      });
      if (!relation) {
        return Response.json(
          { error: "No tienes permiso para renovar esta membresía" },
          { status: 403 },
        );
      }
    }

    // ── Parse body (optional overrides) ─────────────────────────────────────
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;

    // COACH cannot set amount or paymentStatus
    if (session.user.role === "COACH") {
      if (body.amount !== undefined || body.paymentStatus !== undefined) {
        return Response.json(
          { error: "El coach no puede modificar el monto ni el estado de pago" },
          { status: 403 },
        );
      }
    }

    // ── Dates ────────────────────────────────────────────────────────────────
    const { startDate: suggestedStart, endDate: suggestedEnd } = computeRenewDates(
      { startDate: source.startDate, endDate: source.endDate },
      new Date(),
    );

    const newStart = typeof body.startDate === "string"
      ? new Date(body.startDate + "T00:00:00")
      : suggestedStart;

    const newEnd = typeof body.endDate === "string"
      ? new Date(body.endDate + "T23:59:59")
      : suggestedEnd;

    // ── Field resolution (body overrides, fall back to source) ───────────────
    const newPlanName =
      typeof body.planName === "string" && body.planName.trim()
        ? body.planName.trim()
        : source.planName;

    const newTotalSessions =
      body.totalSessions !== undefined
        ? (body.totalSessions !== null && body.totalSessions !== ""
            ? Number(body.totalSessions)
            : null)
        : source.totalSessions;

    // amount: ADMIN can override; COACH inherits from source
    const newAmount =
      session.user.role === "ADMIN" && body.amount != null
        ? Number(body.amount)
        : source.amount;

    // paymentStatus: ADMIN can override; COACH always PENDING
    const newPaymentStatus: DbPaymentStatus =
      session.user.role === "ADMIN" &&
      typeof body.paymentStatus === "string" &&
      body.paymentStatus in PAYMENT_REVERSE
        ? PAYMENT_REVERSE[body.paymentStatus]
        : "PENDING";

    // ── Overlap guard ────────────────────────────────────────────────────────
    // Exclude the source itself to avoid self-conflict (e.g. unlimited memberships).
    const overlap = await prisma.membership.findFirst({
      where: {
        id:          { not: id },
        memberId:    source.memberId,
        serviceType: source.serviceType,
        status:      "ACTIVE",
        AND: [
          { startDate: { lte: newEnd } },
          { OR: [{ endDate: null }, { endDate: { gte: newStart } }] },
        ],
      },
    });
    if (overlap) {
      return Response.json(
        { error: "Ya existe una membresía activa para este servicio en ese período" },
        { status: 409 },
      );
    }

    // ── Create new membership ────────────────────────────────────────────────
    const created = await prisma.membership.create({
      data: {
        memberId:      source.memberId,
        planName:      newPlanName,
        serviceType:   source.serviceType, // immutable from source
        startDate:     newStart,
        endDate:       newEnd,
        status:        "ACTIVE",
        usedSessions:  0,
        amount:        newAmount,
        paymentStatus: newPaymentStatus,
        ...(newTotalSessions !== null ? { totalSessions: newTotalSessions } : {}),
      },
      include: { member: { select: { id: true, name: true, email: true } } },
    });

    // ── Response ─────────────────────────────────────────────────────────────
    const response: Membership & { totalSessions?: number | null; usedSessions?: number } = {
      id:               created.id,
      studentId:        created.memberId,
      studentName:      created.member.name ?? "",
      studentEmail:     created.member.email,
      serviceType:      SVC_MAP[created.serviceType] ?? "group",
      plan:             created.planName as Membership["plan"],
      paymentStatus:    PAYMENT_MAP[created.paymentStatus],
      membershipStatus: STATUS_MAP[created.status],
      amount:           created.amount,
      startDate:        created.startDate.toISOString().slice(0, 10),
      endDate:          created.endDate ? created.endDate.toISOString().slice(0, 10) : "",
      totalSessions:    created.totalSessions,
      usedSessions:     created.usedSessions,
    };

    return Response.json(response, { status: 201 });
  } catch (e) {
    console.error("[renew] error:", e);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
