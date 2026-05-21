import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Membership, ServiceType, MembershipStatus, PaymentStatus, GrantType } from "@/lib/types";
import type {
  MembershipStatus as DbStatus,
  ServiceType as DbServiceType,
  PaymentStatus as DbPaymentStatus,
  GrantType as DbGrantType,
} from "@prisma/client";

const SVC_MAP: Partial<Record<DbServiceType, ServiceType>> = {
  GROUP: "group",
  PERSONAL_TRAINING: "personal_training",
  KINESIOLOGY: "kinesiology",
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
  WAIVED:  "waived",
};

const PAYMENT_REVERSE: Record<string, DbPaymentStatus> = {
  paid:    "PAID",
  pending: "PENDING",
  overdue: "OVERDUE",
  waived:  "WAIVED",
};

const GRANT_MAP: Record<DbGrantType, GrantType> = {
  PURCHASED:    "purchased",
  RENEWAL:      "renewal",
  REACTIVATION: "reactivation",
  GIFT:         "gift",
  COMPENSATION: "compensation",
  TRIAL:        "trial",
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "COACH") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.membership.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Membresía no encontrada" }, { status: 404 });
    }

    // COACH: must have an active MemberCoach relation for this member+service
    if (session.user.role === "COACH") {
      const relation = await prisma.memberCoach.findFirst({
        where: { memberId: existing.memberId, coachId: session.user.id, serviceType: existing.serviceType, isActive: true },
      });
      if (!relation) {
        return Response.json({ error: "No tienes permiso para editar esta membresía" }, { status: 403 });
      }
    }

    const updateData: {
      planName?: string;
      status?: DbStatus;
      paymentStatus?: DbPaymentStatus;
      amount?: number;
      startDate?: Date;
      endDate?: Date | null;
      totalSessions?: number | null;
    } = {};

    if (body.plan !== undefined) updateData.planName = String(body.plan);
    if (body.membershipStatus !== undefined) {
      updateData.status = STATUS_REVERSE[body.membershipStatus] ?? existing.status;
    }
    if (body.paymentStatus !== undefined) {
      updateData.paymentStatus = PAYMENT_REVERSE[body.paymentStatus] ?? existing.paymentStatus;
    }
    if (body.amount != null) updateData.amount = Number(body.amount);
    if (body.startDate !== undefined) {
      updateData.startDate = new Date(body.startDate + "T00:00:00");
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate + "T23:59:59") : null;
    }
    if (body.totalSessions !== undefined) {
      const parsedSessions = (body.totalSessions !== null && body.totalSessions !== "")
        ? Number(body.totalSessions)
        : null;
      if (parsedSessions !== null && parsedSessions <= 0) {
        return Response.json(
          { error: "El número de sesiones debe ser al menos 1. Deja el campo vacío para acceso ilimitado." },
          { status: 400 }
        );
      }
      updateData.totalSessions = parsedSessions;
    }

    const updated = await prisma.membership.update({
      where: { id },
      data: updateData,
      include: { member: { select: { id: true, name: true, email: true } } },
    });

    const response: Membership & { totalSessions?: number | null; usedSessions?: number } = {
      id: updated.id,
      studentId: updated.memberId,
      studentName: updated.member.name ?? "",
      studentEmail: updated.member.email,
      serviceType: SVC_MAP[updated.serviceType] ?? "group",
      plan: updated.planName as Membership["plan"],
      paymentStatus: PAYMENT_MAP[updated.paymentStatus],
      membershipStatus: STATUS_MAP[updated.status],
      amount: updated.amount,
      startDate: updated.startDate.toISOString().slice(0, 10),
      endDate: updated.endDate ? updated.endDate.toISOString().slice(0, 10) : "",
      totalSessions: updated.totalSessions,
      usedSessions: updated.usedSessions,
      grantType:   GRANT_MAP[updated.grantType] ?? "purchased",
      grantedById: updated.grantedById ?? undefined,
      grantReason: updated.grantReason ?? undefined,
    };

    return Response.json(response);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
