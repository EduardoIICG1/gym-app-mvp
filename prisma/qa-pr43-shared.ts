import { loadEnvConfig } from "@next/env";

// Load .env.local before PrismaClient instantiation
loadEnvConfig(process.cwd());

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import path from "path";

// Local-only QA fixtures for PR #43 — never committed (see .git/info/exclude).
// Every record this tooling creates carries this prefix in a human-visible field
// (name / planName / grantReason / notes / message) so cleanup can verify ownership
// before deleting anything.
export const QA_PREFIX = "QA-PR43-";

export const STATE_DIR = path.join(process.cwd(), ".tmp");
export const STATE_FILE = path.join(STATE_DIR, "pr43-qa-state.json");

export function getPrisma() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export function requireQaConfirm() {
  if (process.env.PR43_QA_CONFIRM !== "PR43_UAT_ONLY") {
    console.error(
      "Abort: set PR43_QA_CONFIRM=PR43_UAT_ONLY to run this script against UAT."
    );
    process.exit(1);
  }
}

export function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export function hoursFromNow(hours: number): Date {
  const d = new Date();
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d;
}

// Stable IDs — guarantee idempotency across setup/cleanup runs
export const ID = {
  programs: {
    group: "qa_pr43_program_group",
    other: "qa_pr43_program_other",
    kinesiology: "qa_pr43_program_kinesiology",
    personalTraining: "qa_pr43_program_pt",
  },
  sessions: {
    groupA: "qa_pr43_sess_group_a",
    groupB: "qa_pr43_sess_group_b",
    groupC: "qa_pr43_sess_group_c",
    earlyCancel: "qa_pr43_sess_early_cancel",
    lateCancel: "qa_pr43_sess_late_cancel",
    reReservation: "qa_pr43_sess_re_reservation",
    invitation: "qa_pr43_sess_invitation",
    otherPendingOnly: "qa_pr43_sess_other_pending_only",
    concurrencyA: "qa_pr43_sess_concurrency_a",
    concurrencyB: "qa_pr43_sess_concurrency_b",
    reactivation: "qa_pr43_sess_reactivation",
  },
  memberships: {
    expiringSoon: "qa_pr43_membr_expiring_soon",
    expiringLater: "qa_pr43_membr_expiring_later",
    pendingSameType: "qa_pr43_membr_pending_same_type",
    otherPendingOnly: "qa_pr43_membr_other_pending_only",
    concurrency: "qa_pr43_membr_concurrency",
    ptOriginal: "qa_pr43_membr_pt_original",
    ptReactivation: "qa_pr43_membr_pt_reactivation",
  },
  bookings: {
    reReservation: "qa_pr43_book_re_reservation",
    invitation: "qa_pr43_book_invitation",
  },
  invitations: {
    main: "qa_pr43_inv_main",
  },
} as const;

export type QaState = {
  memberId: string;
  memberEmail: string;
  coachId: string;
  invitedById: string | null;
  createdAt: string;
  programs: Record<string, string>;
  sessions: Record<string, string>;
  memberships: Record<string, string>;
  bookings: Record<string, string>;
  invitations: Record<string, string>;
};

export function loadState(): QaState | null {
  if (!existsSync(STATE_FILE)) return null;
  return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as QaState;
}

export function saveState(state: QaState) {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function deleteStateFile() {
  if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
}

// Every stable id this tooling can create, flattened — used by setup to verify
// it is starting from a clean slate before creating anything.
export function allStableIds() {
  return {
    programs: Object.values(ID.programs),
    sessions: Object.values(ID.sessions),
    memberships: Object.values(ID.memberships),
    bookings: Object.values(ID.bookings),
    invitations: Object.values(ID.invitations),
  };
}
