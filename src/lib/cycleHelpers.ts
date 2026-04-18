import { Reservation, Membership, GymClass, MembershipCycle, CycleEntry, AttendanceStatus } from "./types";

const CREDITS_BY_PLAN: Record<string, number> = {
  mensual: 16,
  trimestral: 48,
  semestral: 96,
  anual: 192,
};

const SERVICE_LABELS: Record<string, string> = {
  group: "Grupal",
  personal_training: "Entrenamiento Personal",
  kinesiology: "Kinesiología",
  blocked_time: "Bloqueado",
};

const PLAN_LABELS: Record<string, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

// Derives the attendance state for a reservation without an explicit attendanceStatus.
// Returns "reserved" for future/current bookings.
export function getEffectiveDisplayStatus(r: Reservation): AttendanceStatus | "reserved" {
  if (r.attendanceStatus) return r.attendanceStatus;
  if (r.status === "attended") return "attended";
  if (r.status === "absent") return "absent";
  const today = new Date().toISOString().slice(0, 10);
  if (r.classDate < today) return "pending_attendance";
  return "reserved";
}

export function computeMembershipCycle(
  membership: Membership,
  allReservations: Reservation[],
  allClasses: GymClass[]
): MembershipCycle {
  const totalCredits = CREDITS_BY_PLAN[membership.plan] ?? 16;

  // All non-cancelled reservations for this student within the membership date window
  const relevant = allReservations.filter(
    (r) =>
      r.studentId === membership.studentId &&
      r.classDate >= membership.startDate &&
      r.classDate <= membership.endDate &&
      r.status !== "cancelled"
  );

  // Attribute to this membership's serviceType via the linked class
  const entries: CycleEntry[] = relevant
    .map((r) => {
      const cls = allClasses.find((c) => c.id === r.classId);
      if (!cls || cls.serviceType !== membership.serviceType) return null;
      return { r, cls };
    })
    .filter((x): x is { r: Reservation; cls: GymClass } => x !== null)
    .sort((a, b) => a.r.classDate.localeCompare(b.r.classDate))
    .map(({ r, cls }, i): CycleEntry => ({
      entryNumber: i + 1,
      reservationId: r.id,
      classId: r.classId,
      className: cls.name,
      classDate: r.classDate,
      displayStatus: getEffectiveDisplayStatus(r),
      eligibleForMakeup: r.eligibleForMakeup ?? false,
    }));

  const usedCredits = entries.filter((e) => e.displayStatus === "attended").length;
  const absentCount = entries.filter((e) => e.displayStatus === "absent").length;
  const pendingCount = entries.filter((e) => e.displayStatus === "pending_attendance").length;
  const recoverableCount = entries.filter((e) => e.eligibleForMakeup).length;

  const cycleStatus: MembershipCycle["status"] =
    membership.membershipStatus === "active"
      ? "active"
      : membership.membershipStatus === "expired"
      ? "expired"
      : "completed";

  const membershipName = `${PLAN_LABELS[membership.plan] ?? membership.plan} — ${SERVICE_LABELS[membership.serviceType] ?? membership.serviceType}`;

  return {
    cycleId: `cycle-${membership.id}`,
    memberId: membership.studentId,
    membershipId: membership.id,
    membershipName,
    serviceType: membership.serviceType,
    startDate: membership.startDate,
    endDate: membership.endDate,
    totalCredits,
    usedCredits,
    remainingCredits: Math.max(0, totalCredits - usedCredits),
    absentCount,
    pendingCount,
    recoverableCount,
    status: cycleStatus,
    entries,
  };
}
