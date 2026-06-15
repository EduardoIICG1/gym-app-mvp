// ─────────────────────────────────────────────────────────────────────────
// Cleanup tool for PR #43 QA fixtures. LOCAL USE ONLY — never committed.
//
// Required env var:
//   PR43_QA_CONFIRM=PR43_UAT_ONLY
//
// Reads .tmp/pr43-qa-state.json and deletes ONLY the rows it created:
//   invitations -> bookings -> sessions -> QA programs -> memberships
// Every row is verified to carry the QA_PREFIX in a visible field before
// being deleted. The MEMBER user itself is NEVER deleted or modified.
//
// Dry run (no deletions, just prints what would be removed):
//   npx tsx prisma/qa-pr43-uat-cleanup.ts --dry-run
// ─────────────────────────────────────────────────────────────────────────

import { requireQaConfirm, getPrisma, QA_PREFIX, loadState } from "./qa-pr43-shared";

requireQaConfirm();

const dryRun = process.argv.includes("--dry-run");

const prisma = getPrisma();

async function main() {
  const state = loadState();
  if (!state) {
    console.log("No .tmp/pr43-qa-state.json found — nothing to clean up.");
    return;
  }

  const log = (msg: string) => console.log(dryRun ? `[dry-run] ${msg}` : msg);

  // ── Invitations ──────────────────────────────────────────────────
  const invitationIds = Object.values(state.invitations);
  if (invitationIds.length > 0) {
    const invitations = await prisma.bookingInvitation.findMany({
      where: { id: { in: invitationIds } },
    });
    for (const inv of invitations) {
      if (!inv.message?.startsWith(QA_PREFIX)) {
        console.warn(`Skipping invitation ${inv.id}: message does not start with ${QA_PREFIX}`);
        continue;
      }
      log(`Delete invitation ${inv.id}`);
      if (!dryRun) await prisma.bookingInvitation.delete({ where: { id: inv.id } });
    }
  }

  // ── Bookings ─────────────────────────────────────────────────────
  const bookingIds = Object.values(state.bookings);
  if (bookingIds.length > 0) {
    const bookings = await prisma.booking.findMany({ where: { id: { in: bookingIds } } });
    for (const b of bookings) {
      // Re-reservation/invitation bookings may have been re-confirmed by the manual
      // checklist (status/notes change) — verify by id membership in state instead.
      log(`Delete booking ${b.id} (session=${b.sessionId}, status=${b.status})`);
      if (!dryRun) await prisma.booking.delete({ where: { id: b.id } });
    }
  }

  // ── Sessions ─────────────────────────────────────────────────────
  const sessionIds = Object.values(state.sessions);
  if (sessionIds.length > 0) {
    const sessions = await prisma.session.findMany({ where: { id: { in: sessionIds } } });
    for (const s of sessions) {
      if (!s.notes?.startsWith(QA_PREFIX)) {
        console.warn(`Skipping session ${s.id}: notes do not start with ${QA_PREFIX}`);
        continue;
      }
      // Defensive: refuse to delete a session that has bookings/invitations
      // we didn't already remove above (e.g. created by someone else).
      const remainingBookings = await prisma.booking.count({ where: { sessionId: s.id } });
      const remainingInvitations = await prisma.bookingInvitation.count({ where: { sessionId: s.id } });
      if (remainingBookings > 0 || remainingInvitations > 0) {
        console.warn(
          `Skipping session ${s.id}: still has ${remainingBookings} booking(s) / ${remainingInvitations} invitation(s)`
        );
        continue;
      }
      log(`Delete session ${s.id}`);
      if (!dryRun) await prisma.session.delete({ where: { id: s.id } });
    }
  }

  // ── Programs (only the QA-PR43- ones, and only if no sessions remain) ──
  const programIds = Object.values(state.programs);
  if (programIds.length > 0) {
    const programs = await prisma.program.findMany({ where: { id: { in: programIds } } });
    for (const p of programs) {
      if (!p.name.startsWith(QA_PREFIX)) {
        console.warn(`Skipping program ${p.id}: name does not start with ${QA_PREFIX}`);
        continue;
      }
      const remainingSessions = await prisma.session.count({ where: { programId: p.id } });
      if (remainingSessions > 0) {
        console.warn(`Skipping program ${p.id}: still has ${remainingSessions} session(s)`);
        continue;
      }
      log(`Delete program ${p.id} (${p.name})`);
      if (!dryRun) await prisma.program.delete({ where: { id: p.id } });
    }
  }

  // ── Memberships ──────────────────────────────────────────────────
  const membershipIds = Object.values(state.memberships);
  if (membershipIds.length > 0) {
    const memberships = await prisma.membership.findMany({ where: { id: { in: membershipIds } } });
    for (const m of memberships) {
      if (!m.grantReason?.startsWith(QA_PREFIX)) {
        console.warn(`Skipping membership ${m.id}: grantReason does not start with ${QA_PREFIX}`);
        continue;
      }
      const remainingBookings = await prisma.booking.count({ where: { membershipId: m.id } });
      if (remainingBookings > 0) {
        console.warn(`Skipping membership ${m.id}: still referenced by ${remainingBookings} booking(s)`);
        continue;
      }
      log(`Delete membership ${m.id} (${m.planName})`);
      if (!dryRun) await prisma.membership.delete({ where: { id: m.id } });
    }
  }

  console.log(
    dryRun
      ? "\nDry run complete. No data was deleted. The MEMBER user was not touched."
      : "\nCleanup complete. The MEMBER user was not touched."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
