// ─────────────────────────────────────────────────────────────────────────
// Cleanup tool for PR #43 QA fixtures. LOCAL USE ONLY — never committed.
//
// Required env var:
//   PR43_QA_CONFIRM=PR43_UAT_ONLY
//
// Reads .tmp/pr43-qa-state.json and deletes:
//   1. BookingInvitations  (memberId=state.memberId, sessionId in verified QA sessions, message QA-PR43-)
//   2. Bookings            (memberId=state.memberId, sessionId in verified QA sessions — ANY status,
//                            including bookings created by the real routes during manual QA, not just
//                            the ones pre-created by setup)
//   3. QA sessions         (id in state.sessions, programId in state.programs, notes QA-PR43-)
//   4. QA programs         (id in state.programs, name QA-PR43-, no sessions left)
//   5. QA memberships      (id in state.memberships, grantReason QA-PR43-, no bookings left)
//
// Bookings/invitations belonging to OTHER members on a QA session are never touched.
// The MEMBER user itself is NEVER deleted or modified.
//
// Dry run (no deletions, just prints what would be removed):
//   npx tsx prisma/qa-pr43-uat-cleanup.ts --dry-run
// ─────────────────────────────────────────────────────────────────────────

import { requireQaConfirm, getPrisma, QA_PREFIX, loadState, deleteStateFile, type QaState } from "./qa-pr43-shared";

requireQaConfirm();

const dryRun = process.argv.includes("--dry-run");

const prisma = getPrisma();

const log = (msg: string) => console.log(dryRun ? `[dry-run] ${msg}` : msg);

// Sessions from state.sessions that genuinely belong to this QA fixture set:
// their id is in state.sessions, their programId is one of state.programs,
// and their notes carry the QA_PREFIX marker written by setup.
async function getVerifiedQaSessions(state: QaState) {
  const sessionIds = Object.values(state.sessions);
  const programIds = new Set(Object.values(state.programs));
  const sessions = await prisma.session.findMany({ where: { id: { in: sessionIds } } });
  return sessions.filter((s) => programIds.has(s.programId) && s.notes?.startsWith(QA_PREFIX));
}

async function main() {
  const state = loadState();
  if (!state) {
    console.log("No .tmp/pr43-qa-state.json found — nothing to clean up.");
    return;
  }

  const verifiedSessions = await getVerifiedQaSessions(state);
  const verifiedSessionIds = verifiedSessions.map((s) => s.id);

  const skippedSessionIds = Object.values(state.sessions).filter((id) => !verifiedSessionIds.includes(id));
  for (const id of skippedSessionIds) {
    console.warn(`Skipping session ${id}: does not match a QA program + ${QA_PREFIX} notes`);
  }

  // ── 1. BookingInvitations (dynamic, FK-safe: before bookings) ───────────
  const invitations =
    verifiedSessionIds.length > 0
      ? await prisma.bookingInvitation.findMany({
          where: {
            memberId: state.memberId,
            sessionId: { in: verifiedSessionIds },
            message: { startsWith: QA_PREFIX },
          },
        })
      : [];
  for (const inv of invitations) {
    log(`Delete invitation ${inv.id} (session=${inv.sessionId}, status=${inv.status}, bookingId=${inv.bookingId ?? "—"})`);
    if (!dryRun) await prisma.bookingInvitation.delete({ where: { id: inv.id } });
  }

  // Any QA invitation whose message doesn't carry the prefix is left alone —
  // but warn so it doesn't silently block session deletion below.
  if (verifiedSessionIds.length > 0) {
    const unrecognizedInvitations = await prisma.bookingInvitation.findMany({
      where: { memberId: state.memberId, sessionId: { in: verifiedSessionIds }, NOT: { message: { startsWith: QA_PREFIX } } },
      select: { id: true, sessionId: true },
    });
    for (const inv of unrecognizedInvitations) {
      console.warn(`Skipping invitation ${inv.id} (session=${inv.sessionId}): message does not start with ${QA_PREFIX}`);
    }
  }

  // ── 2. Bookings — ALL bookings of this member on verified QA sessions ───
  // Covers setup's pre-created bookings AND any booking created later by the
  // real routes during manual QA (any status: CONFIRMED, CANCELLED, etc.)
  const bookings =
    verifiedSessionIds.length > 0
      ? await prisma.booking.findMany({
          where: { memberId: state.memberId, sessionId: { in: verifiedSessionIds } },
        })
      : [];
  for (const b of bookings) {
    log(`Delete booking ${b.id} (session=${b.sessionId}, status=${b.status}, membershipId=${b.membershipId ?? "—"})`);
    if (!dryRun) await prisma.booking.delete({ where: { id: b.id } });
  }

  // ── 3. QA sessions ───────────────────────────────────────────────────
  for (const s of verifiedSessions) {
    // Defensive re-check — should be zero after step 1/2 in a real run.
    const remainingBookings = await prisma.booking.count({ where: { sessionId: s.id } });
    const remainingInvitations = await prisma.bookingInvitation.count({ where: { sessionId: s.id } });
    if (!dryRun && (remainingBookings > 0 || remainingInvitations > 0)) {
      console.warn(
        `Skipping session ${s.id}: still has ${remainingBookings} booking(s) / ${remainingInvitations} invitation(s)`
      );
      continue;
    }
    log(`Delete session ${s.id}`);
    if (!dryRun) await prisma.session.delete({ where: { id: s.id } });
  }

  // ── 4. QA programs (only if no sessions remain) ─────────────────────────
  const programIds = Object.values(state.programs);
  if (programIds.length > 0) {
    const programs = await prisma.program.findMany({ where: { id: { in: programIds } } });
    for (const p of programs) {
      if (!p.name.startsWith(QA_PREFIX)) {
        console.warn(`Skipping program ${p.id}: name does not start with ${QA_PREFIX}`);
        continue;
      }
      const remainingSessions = await prisma.session.count({ where: { programId: p.id } });
      if (!dryRun && remainingSessions > 0) {
        console.warn(`Skipping program ${p.id}: still has ${remainingSessions} session(s)`);
        continue;
      }
      log(`Delete program ${p.id} (${p.name})`);
      if (!dryRun) await prisma.program.delete({ where: { id: p.id } });
    }
  }

  // ── 5. QA memberships ────────────────────────────────────────────────
  const membershipIds = Object.values(state.memberships);
  if (membershipIds.length > 0) {
    const memberships = await prisma.membership.findMany({ where: { id: { in: membershipIds } } });
    for (const m of memberships) {
      if (!m.grantReason?.startsWith(QA_PREFIX)) {
        console.warn(`Skipping membership ${m.id}: grantReason does not start with ${QA_PREFIX}`);
        continue;
      }
      const remainingBookings = await prisma.booking.count({ where: { membershipId: m.id } });
      if (!dryRun && remainingBookings > 0) {
        console.warn(`Skipping membership ${m.id}: still referenced by ${remainingBookings} booking(s)`);
        continue;
      }
      log(`Delete membership ${m.id} (${m.planName})`);
      if (!dryRun) await prisma.membership.delete({ where: { id: m.id } });
    }
  }

  // ── Post-cleanup verification ───────────────────────────────────────
  const allSessionIds = Object.values(state.sessions);
  const [remainingBookings, remainingInvitations, remainingSessions, remainingPrograms, remainingMemberships] =
    await Promise.all([
      allSessionIds.length > 0
        ? prisma.booking.count({ where: { memberId: state.memberId, sessionId: { in: allSessionIds } } })
        : Promise.resolve(0),
      allSessionIds.length > 0
        ? prisma.bookingInvitation.count({ where: { memberId: state.memberId, sessionId: { in: allSessionIds } } })
        : Promise.resolve(0),
      prisma.session.count({ where: { id: { in: allSessionIds } } }),
      prisma.program.count({ where: { id: { in: Object.values(state.programs) } } }),
      prisma.membership.count({ where: { id: { in: Object.values(state.memberships) } } }),
    ]);

  console.log("\nVerification:");
  console.log(`  remaining bookings on QA sessions (this member): ${remainingBookings}`);
  console.log(`  remaining invitations on QA sessions (this member): ${remainingInvitations}`);
  console.log(`  remaining QA sessions: ${remainingSessions}`);
  console.log(`  remaining QA programs: ${remainingPrograms}`);
  console.log(`  remaining QA memberships: ${remainingMemberships}`);

  const allClean =
    remainingBookings === 0 &&
    remainingInvitations === 0 &&
    remainingSessions === 0 &&
    remainingPrograms === 0 &&
    remainingMemberships === 0;

  if (dryRun) {
    console.log("\nDry run complete. No data was deleted. The MEMBER user was not touched.");
    return;
  }

  if (allClean) {
    deleteStateFile();
    console.log("\nCleanup complete and verified clean. .tmp/pr43-qa-state.json deleted. The MEMBER user was not touched.");
  } else {
    console.log(
      "\nCleanup incomplete — some QA fixtures remain (see counts above). " +
        ".tmp/pr43-qa-state.json was kept so you can investigate and re-run cleanup."
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
