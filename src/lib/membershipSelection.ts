import type { Prisma, PrismaClient, ServiceType, Membership } from "@prisma/client";

// Subset of PrismaClient usable both directly and inside $transaction callbacks
type Tx = PrismaClient | Prisma.TransactionClient;

const ELIGIBLE_ORDER_BY: Prisma.MembershipOrderByWithRelationInput[] = [
  { endDate: { sort: "asc", nulls: "last" } },
  { createdAt: "asc" },
  { id: "asc" },
];

// Finds the membership that should be consumed/refunded for a given member + serviceType.
// Eligible = ACTIVE + PAID + same serviceType + started + (no endDate or not expired)
//          + sessions available (unlimited or usedSessions < totalSessions).
// Ordered by soonest-expiring first (endDate ASC, NULLS LAST), then oldest createdAt, then id.
//
// endDate is compared against the start of "now"'s day (not the exact instant): a membership
// expiring "today" remains eligible for the whole day, matching the previous day-based semantics.
export async function findEligibleMembership(
  tx: Tx,
  memberId: string,
  serviceType: ServiceType,
  now: Date = new Date()
): Promise<Membership | null> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const candidates = await tx.membership.findMany({
    where: {
      memberId,
      serviceType,
      status: "ACTIVE",
      paymentStatus: "PAID",
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
    },
    orderBy: ELIGIBLE_ORDER_BY,
  });

  return (
    candidates.find((m) => m.totalSessions === null || m.usedSessions < m.totalSessions) ?? null
  );
}

export type MembershipDenialReason =
  | "no_membership"
  | "pending_payment"
  | "no_sessions_left"
  | "expired"
  | "not_started";

export const MEMBERSHIP_DENIAL_MESSAGES: Record<MembershipDenialReason, string> = {
  no_membership:    "No tienes una membresía para este tipo de clase.",
  pending_payment:  "Tu membresía tiene un pago pendiente. Regulariza el pago para reservar.",
  no_sessions_left: "No tienes sesiones disponibles en tu membresía.",
  expired:          "Tu membresía está vencida. Regulariza tu membresía para reservar.",
  not_started:      "Tu membresía aún no está vigente.",
};

// Determines why no eligible membership was found, to return a precise error message.
// Only called when findEligibleMembership returned null.
export async function getMembershipDenialReason(
  tx: Tx,
  memberId: string,
  serviceType: ServiceType,
  now: Date = new Date()
): Promise<MembershipDenialReason> {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const memberships = await tx.membership.findMany({
    where: { memberId, serviceType },
    orderBy: ELIGIBLE_ORDER_BY,
  });

  if (memberships.length === 0) return "no_membership";

  // CANCELLED memberships don't inform the denial reason for an active attempt
  const relevant = memberships.filter((m) => m.status === "ACTIVE" || m.status === "EXPIRED");
  if (relevant.length === 0) return "no_membership";

  const paid = relevant.filter((m) => m.paymentStatus === "PAID");
  const pool = paid.length > 0 ? paid : relevant;

  if (pool.every((m) => m.startDate > now)) return "not_started";
  if (pool.every((m) => m.status === "EXPIRED" || (m.endDate !== null && m.endDate < todayStart))) {
    return "expired";
  }
  if (paid.length === 0) return "pending_payment";
  return "no_sessions_left";
}
