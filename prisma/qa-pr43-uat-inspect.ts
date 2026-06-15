// ─────────────────────────────────────────────────────────────────────────
// Snapshot tool for PR #43 QA fixtures. LOCAL USE ONLY — never committed.
//
// Reads .tmp/pr43-qa-state.json (written by qa-pr43-uat-setup.ts) and prints
// the current state of every QA-PR43- membership, booking and invitation.
//
// Run this BEFORE and AFTER each manual checklist step and compare the two
// printouts — that comparison IS the "before/after" evidence for the report.
//
// Never prints passwords, tokens, or connection strings.
// ─────────────────────────────────────────────────────────────────────────

import { getPrisma, loadState } from "./qa-pr43-shared";

const prisma = getPrisma();

function row(cols: (string | number | null | undefined)[], widths: number[]) {
  return cols.map((c, i) => String(c ?? "—").padEnd(widths[i])).join(" | ");
}

async function main() {
  const state = loadState();
  if (!state) {
    console.error("No .tmp/pr43-qa-state.json found. Run qa-pr43-uat-setup.ts first.");
    process.exit(1);
  }

  console.log(`Snapshot for member ${state.memberEmail} (${state.memberId})`);
  console.log(`Generated at ${new Date().toISOString()}\n`);

  // ── Memberships ──────────────────────────────────────────────────
  const membershipIds = Object.values(state.memberships);
  const memberships = await prisma.membership.findMany({
    where: { id: { in: membershipIds } },
    orderBy: { id: "asc" },
  });
  const labelByMembershipId = Object.fromEntries(
    Object.entries(state.memberships).map(([label, id]) => [id, label])
  );

  console.log("MEMBERSHIPS");
  const mWidths = [22, 18, 8, 8, 8, 8, 12, 12, 14];
  console.log(row(["label", "serviceType", "status", "payment", "total", "used", "startDate", "endDate", "grantType"], mWidths));
  for (const m of memberships) {
    console.log(
      row(
        [
          labelByMembershipId[m.id] ?? m.id,
          m.serviceType,
          m.status,
          m.paymentStatus,
          m.totalSessions ?? "∞",
          m.usedSessions,
          m.startDate.toISOString().slice(0, 10),
          m.endDate ? m.endDate.toISOString().slice(0, 10) : null,
          m.grantType,
        ],
        mWidths
      )
    );
  }

  // ── Bookings ─────────────────────────────────────────────────────
  console.log("\nBOOKINGS");
  const sessionIds = Object.values(state.sessions);
  const bookings = await prisma.booking.findMany({
    where: { memberId: state.memberId, sessionId: { in: sessionIds } },
    orderBy: { id: "asc" },
  });
  const labelBySessionId = Object.fromEntries(
    Object.entries(state.sessions).map(([label, id]) => [id, label])
  );

  const bWidths = [24, 22, 12, 24];
  console.log(row(["bookingId", "session", "status", "membershipId"], bWidths));
  for (const b of bookings) {
    console.log(
      row(
        [
          b.id,
          labelBySessionId[b.sessionId] ?? b.sessionId,
          b.status,
          b.membershipId ? labelByMembershipId[b.membershipId] ?? b.membershipId : null,
        ],
        bWidths
      )
    );
  }
  if (bookings.length === 0) console.log("(none yet)");

  // ── Invitations ──────────────────────────────────────────────────
  console.log("\nINVITATIONS");
  const invitationIds = Object.values(state.invitations);
  if (invitationIds.length === 0) {
    console.log("(none — no ADMIN user was available when running setup)");
  } else {
    const invitations = await prisma.bookingInvitation.findMany({
      where: { id: { in: invitationIds } },
      orderBy: { id: "asc" },
    });
    const iWidths = [24, 22, 12, 24];
    console.log(row(["invitationId", "session", "status", "bookingId"], iWidths));
    for (const i of invitations) {
      console.log(row([i.id, labelBySessionId[i.sessionId] ?? i.sessionId, i.status, i.bookingId], iWidths));
    }
  }

  console.log("\nSESSIONS (for reference)");
  const sessions = await prisma.session.findMany({
    where: { id: { in: sessionIds } },
    orderBy: { id: "asc" },
  });
  const sWidths = [24, 22];
  console.log(row(["label", "startsAt"], sWidths));
  for (const [label, id] of Object.entries(state.sessions)) {
    const s = sessions.find((x) => x.id === id);
    console.log(row([label, s ? s.startsAt.toISOString() : "?"], sWidths));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
