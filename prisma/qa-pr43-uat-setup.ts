// ─────────────────────────────────────────────────────────────────────────
// QA fixtures for PR #43 (fix/reservation-paid-membership-consumption)
// against the UAT database. LOCAL USE ONLY — never committed.
//
// Required env vars:
//   PR43_QA_CONFIRM=PR43_UAT_ONLY
//   PR43_QA_MEMBER_EMAIL=<email of a DEDICATED TEST user with role MEMBER>
//   PR43_QA_COACH_EMAIL=<email of a DEDICATED TEST user with role COACH or ADMIN>
//   PR43_QA_ADMIN_EMAIL=<email of a DEDICATED TEST user with role ADMIN>
//
// All three accounts MUST be dedicated test accounts (no real Primary
// Performance staff/member identities) and must be three distinct users.
//
// This script:
//   - NEVER creates, modifies, or deletes users — including these three.
//   - Only creates Programs/Sessions/Memberships/Bookings/Invitations,
//     all tagged with the QA_PREFIX in a visible field.
//   - Is idempotent: re-running it upserts the same fixtures by stable id.
//   - Records every created id (plus memberId/coachId/invitedById) in
//     .tmp/pr43-qa-state.json.
// ─────────────────────────────────────────────────────────────────────────

import {
  requireQaConfirm,
  getPrisma,
  ID,
  QA_PREFIX,
  saveState,
  loadState,
  allStableIds,
  daysFromNow,
  hoursFromNow,
  type QaState,
} from "./qa-pr43-shared";

requireQaConfirm();

const memberEmail = process.env.PR43_QA_MEMBER_EMAIL;
const coachEmail = process.env.PR43_QA_COACH_EMAIL;
const adminEmail = process.env.PR43_QA_ADMIN_EMAIL;

if (!memberEmail || !coachEmail || !adminEmail) {
  console.error(
    "Abort: set all three of PR43_QA_MEMBER_EMAIL, PR43_QA_COACH_EMAIL and PR43_QA_ADMIN_EMAIL " +
      "to dedicated test accounts before running this script."
  );
  process.exit(1);
}

const prisma = getPrisma();

async function main() {
  // ── Clean-slate guard ────────────────────────────────────────────────
  // Never silently reuse/reset fixtures left over from a previous run.
  if (loadState()) {
    console.error(
      "Abort: .tmp/pr43-qa-state.json already exists. Run qa-pr43-uat-cleanup.ts first, " +
        "then re-run setup."
    );
    process.exit(1);
  }

  const ids = allStableIds();
  const [existingPrograms, existingSessions, existingMemberships, existingBookings, existingInvitations] =
    await Promise.all([
      prisma.program.findMany({ where: { id: { in: ids.programs } }, select: { id: true } }),
      prisma.session.findMany({ where: { id: { in: ids.sessions } }, select: { id: true } }),
      prisma.membership.findMany({ where: { id: { in: ids.memberships } }, select: { id: true } }),
      prisma.booking.findMany({ where: { id: { in: ids.bookings } }, select: { id: true } }),
      prisma.bookingInvitation.findMany({ where: { id: { in: ids.invitations } }, select: { id: true } }),
    ]);
  const preExisting = [
    ...existingPrograms.map((r) => `Program:${r.id}`),
    ...existingSessions.map((r) => `Session:${r.id}`),
    ...existingMemberships.map((r) => `Membership:${r.id}`),
    ...existingBookings.map((r) => `Booking:${r.id}`),
    ...existingInvitations.map((r) => `BookingInvitation:${r.id}`),
  ];
  if (preExisting.length > 0) {
    console.error(
      "Abort: found pre-existing QA-PR43 fixtures in UAT (no state file, but stable ids already exist).\n" +
        "Run qa-pr43-uat-cleanup.ts first (you may need to recreate .tmp/pr43-qa-state.json manually), " +
        "or remove these rows manually before re-running setup:"
    );
    for (const id of preExisting) console.error(`  - ${id}`);
    process.exit(1);
  }

  // ── Resolve the three dedicated test accounts (no findFirst — explicit only) ──
  const member = await prisma.user.findUnique({ where: { email: memberEmail! } });
  if (!member) {
    console.error(`Abort: no user found with PR43_QA_MEMBER_EMAIL=${memberEmail}.`);
    process.exit(1);
  }
  if (member.role !== "MEMBER") {
    console.error(`Abort: user ${memberEmail} has role ${member.role}, expected MEMBER.`);
    process.exit(1);
  }

  const coach = await prisma.user.findUnique({ where: { email: coachEmail! } });
  if (!coach) {
    console.error(`Abort: no user found with PR43_QA_COACH_EMAIL=${coachEmail}.`);
    process.exit(1);
  }
  if (coach.role !== "COACH" && coach.role !== "ADMIN") {
    console.error(`Abort: user ${coachEmail} has role ${coach.role}, expected COACH or ADMIN.`);
    process.exit(1);
  }

  const admin = await prisma.user.findUnique({ where: { email: adminEmail! } });
  if (!admin) {
    console.error(`Abort: no user found with PR43_QA_ADMIN_EMAIL=${adminEmail}.`);
    process.exit(1);
  }
  if (admin.role !== "ADMIN") {
    console.error(`Abort: user ${adminEmail} has role ${admin.role}, expected ADMIN.`);
    process.exit(1);
  }

  const distinctIds = new Set([member.id, coach.id, admin.id]);
  if (distinctIds.size !== 3) {
    console.error(
      "Abort: PR43_QA_MEMBER_EMAIL, PR43_QA_COACH_EMAIL and PR43_QA_ADMIN_EMAIL must be three distinct users."
    );
    process.exit(1);
  }

  console.log("QA MEMBER:", member.email, `(${member.role})`);
  console.log("QA COACH:", coach.email, `(${coach.role})`);
  console.log("QA ADMIN:", admin.email, `(${admin.role})`);
  console.log("\nNo se utilizarán usuarios distintos a estas tres cuentas.\n");

  // ── Programs ────────────────────────────────────────────────────────
  const programGroup = await prisma.program.upsert({
    where: { id: ID.programs.group },
    create: {
      id: ID.programs.group,
      name: `${QA_PREFIX}Clase Grupal`,
      serviceType: "GROUP",
      durationMin: 60,
      maxCapacity: 20,
      isActive: true,
      defaultCoachId: coach.id,
    },
    update: {},
  });

  const programOther = await prisma.program.upsert({
    where: { id: ID.programs.other },
    create: {
      id: ID.programs.other,
      name: `${QA_PREFIX}Servicio Otro`,
      serviceType: "OTHER",
      durationMin: 60,
      isActive: true,
      defaultCoachId: coach.id,
    },
    update: {},
  });

  const programKine = await prisma.program.upsert({
    where: { id: ID.programs.kinesiology },
    create: {
      id: ID.programs.kinesiology,
      name: `${QA_PREFIX}Kinesiología`,
      serviceType: "KINESIOLOGY",
      durationMin: 45,
      maxCapacity: 10,
      isActive: true,
      defaultCoachId: coach.id,
    },
    update: {},
  });

  const programPT = await prisma.program.upsert({
    where: { id: ID.programs.personalTraining },
    create: {
      id: ID.programs.personalTraining,
      name: `${QA_PREFIX}Personal Training`,
      serviceType: "PERSONAL_TRAINING",
      durationMin: 45,
      maxCapacity: 10,
      isActive: true,
      defaultCoachId: coach.id,
    },
    update: {},
  });

  // ── Sessions (all in the future relative to "now") ────────────────────
  const sessionDefs: Array<{
    key: keyof typeof ID.sessions;
    programId: string;
    startsAt: Date;
    durationMin: number;
  }> = [
    { key: "groupA", programId: programGroup.id, startsAt: daysFromNow(2), durationMin: 60 },
    { key: "groupB", programId: programGroup.id, startsAt: daysFromNow(3), durationMin: 60 },
    { key: "groupC", programId: programGroup.id, startsAt: daysFromNow(4), durationMin: 60 },
    { key: "earlyCancel", programId: programGroup.id, startsAt: daysFromNow(5), durationMin: 60 },
    { key: "lateCancel", programId: programGroup.id, startsAt: hoursFromNow(1), durationMin: 60 },
    { key: "reReservation", programId: programGroup.id, startsAt: daysFromNow(6), durationMin: 60 },
    { key: "invitation", programId: programGroup.id, startsAt: daysFromNow(7), durationMin: 60 },
    { key: "otherPendingOnly", programId: programOther.id, startsAt: daysFromNow(2), durationMin: 60 },
    { key: "concurrencyA", programId: programKine.id, startsAt: daysFromNow(2), durationMin: 45 },
    { key: "concurrencyB", programId: programKine.id, startsAt: daysFromNow(3), durationMin: 45 },
    { key: "reactivation", programId: programPT.id, startsAt: daysFromNow(10), durationMin: 45 },
  ];

  const sessionIds: Record<string, string> = {};
  for (const def of sessionDefs) {
    const endsAt = new Date(def.startsAt.getTime() + def.durationMin * 60_000);
    const session = await prisma.session.upsert({
      where: { id: ID.sessions[def.key] },
      create: {
        id: ID.sessions[def.key],
        programId: def.programId,
        coachId: coach.id,
        startsAt: def.startsAt,
        endsAt,
        notes: `${QA_PREFIX}sesión de prueba (${def.key})`,
        status: "SCHEDULED",
      },
      update: {},
    });
    sessionIds[def.key] = session.id;
  }

  // ── Memberships ────────────────────────────────────────────────────
  // GROUP: two PAID memberships (different endDate) + one PENDING that must
  // never be selected, even though its endDate is the soonest of all three.
  const expiringSoon = await prisma.membership.upsert({
    where: { id: ID.memberships.expiringSoon },
    create: {
      id: ID.memberships.expiringSoon,
      memberId: member.id,
      planName: `${QA_PREFIX}Grupal - vence pronto`,
      serviceType: "GROUP",
      totalSessions: 2,
      usedSessions: 0,
      startDate: daysFromNow(-30),
      endDate: daysFromNow(10),
      status: "ACTIVE",
      paymentStatus: "PAID",
      amount: 50000,
      grantType: "PURCHASED",
      grantReason: `${QA_PREFIX}membresía PAID que expira pronto (debe tener prioridad #1)`,
    },
    update: {},
  });

  const expiringLater = await prisma.membership.upsert({
    where: { id: ID.memberships.expiringLater },
    create: {
      id: ID.memberships.expiringLater,
      memberId: member.id,
      planName: `${QA_PREFIX}Grupal - vence después`,
      serviceType: "GROUP",
      totalSessions: 10,
      usedSessions: 0,
      startDate: daysFromNow(-30),
      endDate: daysFromNow(60),
      status: "ACTIVE",
      paymentStatus: "PAID",
      amount: 100000,
      grantType: "PURCHASED",
      grantReason: `${QA_PREFIX}membresía PAID que expira después (debe usarse tras agotar la #1)`,
    },
    update: {},
  });

  await prisma.membership.upsert({
    where: { id: ID.memberships.pendingSameType },
    create: {
      id: ID.memberships.pendingSameType,
      memberId: member.id,
      planName: `${QA_PREFIX}Grupal - pago pendiente`,
      serviceType: "GROUP",
      totalSessions: 10,
      usedSessions: 0,
      startDate: daysFromNow(-30),
      endDate: daysFromNow(5), // sooner than both PAID memberships — must still be skipped
      status: "ACTIVE",
      paymentStatus: "PENDING",
      amount: 50000,
      grantType: "PURCHASED",
      grantReason: `${QA_PREFIX}membresía PENDING — NO debe ser seleccionada nunca`,
    },
    update: {},
  });

  // OTHER: a single ACTIVE+PENDING membership and nothing else → reservation must be rejected.
  await prisma.membership.upsert({
    where: { id: ID.memberships.otherPendingOnly },
    create: {
      id: ID.memberships.otherPendingOnly,
      memberId: member.id,
      planName: `${QA_PREFIX}Otro - solo pendiente`,
      serviceType: "OTHER",
      totalSessions: 10,
      usedSessions: 0,
      startDate: daysFromNow(-10),
      endDate: daysFromNow(30),
      status: "ACTIVE",
      paymentStatus: "PENDING",
      amount: 30000,
      grantType: "PURCHASED",
      grantReason: `${QA_PREFIX}única membresía OTHER del miembro — reserva debe rechazarse (pago pendiente)`,
    },
    update: {},
  });

  // KINESIOLOGY: exactly 1 session left → for the concurrency test.
  const concurrencyMembership = await prisma.membership.upsert({
    where: { id: ID.memberships.concurrency },
    create: {
      id: ID.memberships.concurrency,
      memberId: member.id,
      planName: `${QA_PREFIX}Kinesiología - 1 sesión`,
      serviceType: "KINESIOLOGY",
      totalSessions: 1,
      usedSessions: 0,
      startDate: daysFromNow(-5),
      endDate: daysFromNow(30),
      status: "ACTIVE",
      paymentStatus: "PAID",
      amount: 20000,
      grantType: "PURCHASED",
      grantReason: `${QA_PREFIX}última sesión disponible — usar para test de concurrencia (caso I)`,
    },
    update: {},
  });

  // PERSONAL_TRAINING: paused-membership / reactivation flow (cases U/V/W).
  await prisma.membership.upsert({
    where: { id: ID.memberships.ptOriginal },
    create: {
      id: ID.memberships.ptOriginal,
      memberId: member.id,
      planName: `${QA_PREFIX}PT - pack original (pausado)`,
      serviceType: "PERSONAL_TRAINING",
      totalSessions: 8,
      usedSessions: 4,
      startDate: daysFromNow(-90),
      endDate: daysFromNow(-5),
      status: "EXPIRED",
      paymentStatus: "PAID",
      amount: 160000,
      grantType: "PURCHASED",
      grantReason: `${QA_PREFIX}pack original — pausado por enfermedad, 4/8 usadas al momento de la pausa (caso W: debe permanecer así)`,
    },
    update: {},
  });

  await prisma.membership.upsert({
    where: { id: ID.memberships.ptReactivation },
    create: {
      id: ID.memberships.ptReactivation,
      memberId: member.id,
      planName: `${QA_PREFIX}PT - reactivación post pausa`,
      serviceType: "PERSONAL_TRAINING",
      totalSessions: 4,
      usedSessions: 0,
      startDate: daysFromNow(7), // future on purpose — case U: not yet eligible
      endDate: null,
      status: "ACTIVE",
      paymentStatus: "PAID",
      amount: 0,
      grantType: "REACTIVATION",
      grantReason: `${QA_PREFIX}reactivación tras pausa médica — 4 sesiones pendientes del pack original (${ID.memberships.ptOriginal}). Para el caso V, mover startDate a una fecha pasada.`,
    },
    update: {},
  });

  // ── Pre-cancelled bookings (re-reservation / invitation-accept scenarios) ──
  // Represents "the member reserved this class earlier and then cancelled it",
  // leaving a CANCELLED Booking row that the @@unique([sessionId, memberId])
  // constraint forces future code to reuse instead of re-insert.
  const memberId = member.id;
  async function ensureCancelledBooking(bookingId: string, sessionId: string, membershipId: string) {
    const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (existing) return existing;
    return prisma.booking.create({
      data: {
        id: bookingId,
        sessionId,
        memberId,
        membershipId,
        status: "CANCELLED",
        notes: `${QA_PREFIX}booking cancelado de prueba (listo para re-reserva)`,
      },
    });
  }

  await ensureCancelledBooking(ID.bookings.reReservation, sessionIds.reReservation, expiringSoon.id);
  await ensureCancelledBooking(ID.bookings.invitation, sessionIds.invitation, expiringSoon.id);

  // ── Invitation (case G) ──────────────────────────────────────────────
  // PENDING invitation, bookingId=null — accepting it must find the CANCELLED
  // booking above (same sessionId+memberId) and reuse it instead of inserting.
  const invitationIds: Record<string, string> = {};
  const inv = await prisma.bookingInvitation.upsert({
    where: { id: ID.invitations.main },
    create: {
      id: ID.invitations.main,
      sessionId: sessionIds.invitation,
      memberId: member.id,
      invitedById: admin.id,
      status: "PENDING",
      message: `${QA_PREFIX}invitación de prueba — aceptar para validar reutilización de booking cancelado (caso G)`,
    },
    update: {},
  });
  invitationIds.main = inv.id;

  // ── Persist state ─────────────────────────────────────────────────
  const state: QaState = {
    memberId: member.id,
    memberEmail: member.email,
    coachId: coach.id,
    invitedById: admin.id,
    createdAt: new Date().toISOString(),
    programs: {
      group: programGroup.id,
      other: programOther.id,
      kinesiology: programKine.id,
      personalTraining: programPT.id,
    },
    sessions: sessionIds,
    memberships: {
      expiringSoon: expiringSoon.id,
      expiringLater: expiringLater.id,
      pendingSameType: ID.memberships.pendingSameType,
      otherPendingOnly: ID.memberships.otherPendingOnly,
      concurrency: concurrencyMembership.id,
      ptOriginal: ID.memberships.ptOriginal,
      ptReactivation: ID.memberships.ptReactivation,
    },
    bookings: {
      reReservation: ID.bookings.reReservation,
      invitation: ID.bookings.invitation,
    },
    invitations: invitationIds,
  };
  saveState(state);

  console.log("\nQA fixtures ready. State saved to .tmp/pr43-qa-state.json");
  console.log("Run `npx tsx prisma/qa-pr43-uat-inspect.ts` to see a snapshot.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
