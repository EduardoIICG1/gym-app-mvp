import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Membership, ServiceType, MembershipStatus, PaymentStatus } from "@/lib/types";
import type {
  MembershipStatus as DbStatus,
  ServiceType as DbServiceType,
  PaymentStatus as DbPaymentStatus,
} from "@prisma/client";

const SVC_MAP: Partial<Record<DbServiceType, ServiceType>> = {
  GROUP: "group",
  PERSONAL_TRAINING: "personal_training",
  KINESIOLOGY: "kinesiology",
};

const SVC_REVERSE: Record<string, DbServiceType> = {
  group: "GROUP",
  personal_training: "PERSONAL_TRAINING",
  kinesiology: "KINESIOLOGY",
};

const STATUS_MAP: Record<DbStatus, MembershipStatus> = {
  ACTIVE:    "active",
  EXPIRED:   "expired",
  CANCELLED: "cancelled",
  PENDING:   "pending",
};

const STATUS_REVERSE: Record<string, DbStatus> = {
  active:    "ACTIVE",
  expired:   "EXPIRED",
  cancelled: "CANCELLED",
  pending:   "PENDING",
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

async function fetchMemberships(filter: {
  status?: DbStatus;
  memberId?: string;
  planContains?: string;
}) {
  return prisma.membership.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.memberId ? { memberId: filter.memberId } : {}),
      ...(filter.planContains
        ? { planName: { contains: filter.planContains, mode: "insensitive" } }
        : {}),
    },
    include: {
      member: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

type MembershipRow = Awaited<ReturnType<typeof fetchMemberships>>[number];

type MembershipResponse = Membership & { totalSessions?: number | null; usedSessions?: number };

function toMembership(m: MembershipRow): MembershipResponse {
  return {
    id: m.id,
    studentId: m.memberId,
    studentName: m.member.name ?? "",
    studentEmail: m.member.email,
    serviceType: SVC_MAP[m.serviceType] ?? "group",
    plan: m.planName as Membership["plan"],
    paymentStatus: PAYMENT_MAP[m.paymentStatus],
    membershipStatus: STATUS_MAP[m.status],
    amount: m.amount,
    startDate: m.startDate.toISOString().slice(0, 10),
    endDate: m.endDate ? m.endDate.toISOString().slice(0, 10) : "",
    totalSessions: m.totalSessions,
    usedSessions: m.usedSessions,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const plan = searchParams.get("plan");
  const studentId = searchParams.get("studentId");

  const isAdminOrCoach = session.user.role === "ADMIN" || session.user.role === "COACH";

  const filter: Parameters<typeof fetchMemberships>[0] = {};
  if (status && status in STATUS_REVERSE) filter.status = STATUS_REVERSE[status];
  if (plan) filter.planContains = plan;

  if (isAdminOrCoach) {
    // Admin/coach: apply studentId filter if provided
    if (studentId) filter.memberId = studentId;
  } else {
    // MEMBER: always force filter to own memberships only — ignore any studentId param
    filter.memberId = session.user.id;
  }

  const memberships = await fetchMemberships(filter);
  return Response.json(memberships.map(toMembership));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "COACH") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      studentId, serviceType, plan, startDate, endDate,
      membershipStatus = "active", paymentStatus = "pending", amount, totalSessions,
    } = body;

    if (!studentId || !serviceType || !plan || !startDate) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const dbSvcType: DbServiceType = SVC_REVERSE[serviceType] ?? "GROUP";

    // COACH: must have an active MemberCoach relation for this member+service
    if (session.user.role === "COACH") {
      const relation = await prisma.memberCoach.findFirst({
        where: { memberId: studentId, coachId: session.user.id, serviceType: dbSvcType, isActive: true },
      });
      if (!relation) {
        return Response.json({ error: "No tienes permiso para agregar servicios a este miembro" }, { status: 403 });
      }
    }

    const member = await prisma.user.findUnique({ where: { id: studentId } });
    if (!member) {
      return Response.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    const dbStatus: DbStatus = STATUS_REVERSE[membershipStatus] ?? "ACTIVE";
    const dbPayment: DbPaymentStatus = PAYMENT_REVERSE[paymentStatus] ?? "PENDING";
    const start = new Date(startDate + "T00:00:00");
    const end = endDate ? new Date(endDate + "T23:59:59") : null;
    const sessions = totalSessions != null && totalSessions !== "" ? Number(totalSessions) : null;
    if (sessions !== null && sessions <= 0) {
      return Response.json(
        { error: "El número de sesiones debe ser al menos 1. Deja el campo vacío para acceso ilimitado." },
        { status: 400 }
      );
    }

    // Check for overlapping active membership for same member+service
    const duplicate = await prisma.membership.findFirst({
      where: {
        memberId: studentId,
        serviceType: dbSvcType,
        status: "ACTIVE",
        AND: [
          { startDate: { lte: end ?? new Date("2099-12-31") } },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: start } },
            ],
          },
        ],
      },
    });
    if (duplicate) {
      return Response.json(
        { error: "El miembro ya tiene este servicio activo en ese período" },
        { status: 409 }
      );
    }

    const created = await prisma.membership.create({
      data: {
        memberId: studentId,
        planName: String(plan),
        serviceType: dbSvcType,
        startDate: start,
        endDate: end,
        status: dbStatus,
        amount: amount != null ? Number(amount) : 0,
        paymentStatus: dbPayment,
        ...(sessions !== null ? { totalSessions: sessions } : {}),
      },
      include: { member: { select: { id: true, name: true, email: true } } },
    });

    return Response.json(toMembership(created), { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
