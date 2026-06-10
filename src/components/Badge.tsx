"use client";

import type { ServiceType, MembershipStatus, PaymentStatus, MemberRole } from "@/lib/types";
import {
  MEMBERSHIP_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  ROLE_LABELS,
  HEALTH_SESSION_STATUS_LABELS,
  RESTRICTION_SEVERITY_LABELS,
} from "@/lib/labels";

// ── Service type → color + label ────────────────────────────────────────────
const SERVICE_CFG: Record<string, { bg: string; text: string; label: string }> = {
  group:             { bg: "#4fc3f720", text: "#4fc3f7", label: "Grupal" },
  personal_training: { bg: "#f9731620", text: "#f97316", label: "Entrenamiento personal" },
  kinesiology:       { bg: "#a78bfa20", text: "#a78bfa", label: "Kinesiología" },
  blocked_time:      { bg: "#71717a20", text: "#71717a", label: "Bloqueo de horario" },
};

export function ServiceBadge({ type }: { type: ServiceType | string }) {
  const cfg = SERVICE_CFG[type] ?? { bg: "#71717a20", text: "#71717a", label: type };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

// ── Compact service type indicator (dot + short label) ─────────────────────
// Lightweight alternative to ServiceBadge for contexts where the service
// type is secondary metadata and shouldn't compete visually with a title.
const SERVICE_SHORT: Record<string, string> = {
  group: "Grupal",
  personal_training: "Personal",
  kinesiology: "Kine",
  blocked_time: "Bloqueo",
};

export function ServiceDot({ type }: { type: ServiceType | string }) {
  const cfg = SERVICE_CFG[type] ?? { bg: "#71717a20", text: "#71717a", label: type };
  const short = SERVICE_SHORT[type] ?? cfg.label;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold shrink-0" style={{ color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.text }} />
      {short}
    </span>
  );
}

// ── Occupancy / availability badge ─────────────────────────────────────────
export function OccupancyBadge({ reserved, capacity }: { reserved: number; capacity: number }) {
  const pct = capacity > 0 ? (reserved / capacity) * 100 : 0;
  const spotsLeft = capacity - reserved;

  let text: string;
  let color: string;
  let bg: string;

  if (pct >= 100)     { text = "Sin cupos";              color = "#ef4444"; bg = "#ef444420"; }
  else if (pct >= 80) { text = `${spotsLeft} cupos`;     color = "#f59e0b"; bg = "#f59e0b20"; }
  else                { text = "Disponible";              color = "#22c55e"; bg = "#22c55e20"; }

  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      {text}
    </span>
  );
}

// ── Membership status badge ─────────────────────────────────────────────────
const MEMBERSHIP_CFG: Record<string, { bg: string; text: string }> = {
  active:    { bg: "#22c55e20", text: "#22c55e" },
  expired:   { bg: "#ef444420", text: "#ef4444" },
  cancelled: { bg: "#71717a20", text: "#71717a" },
  pending:   { bg: "#f59e0b20", text: "#f59e0b" },
};

export function MembershipBadge({ status }: { status: MembershipStatus | string }) {
  const cfg = MEMBERSHIP_CFG[status] ?? { bg: "#71717a20", text: "#71717a" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {MEMBERSHIP_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Payment status badge ────────────────────────────────────────────────────
const PAYMENT_CFG: Record<string, { bg: string; text: string }> = {
  paid:    { bg: "#22c55e20", text: "#22c55e" },
  pending: { bg: "#f59e0b20", text: "#f59e0b" },
  overdue: { bg: "#ef444420", text: "#ef4444" },
};

export function PaymentBadge({ status }: { status: PaymentStatus | string }) {
  const cfg = PAYMENT_CFG[status] ?? { bg: "#71717a20", text: "#71717a" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {PAYMENT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Role badge ──────────────────────────────────────────────────────────────
const ROLE_CFG: Record<string, { bg: string; text: string }> = {
  admin:         { bg: "#4fc3f720", text: "#4fc3f7" },
  coach:         { bg: "#22c55e20", text: "#22c55e" },
  member:        { bg: "#71717a20", text: "#71717a" },
  kinesiologist: { bg: "#10b98120", text: "#10b981" },
  owner:         { bg: "#a78bfa20", text: "#a78bfa" },
};

export function RoleBadge({ role }: { role: MemberRole | string }) {
  const cfg = ROLE_CFG[role] ?? { bg: "#71717a20", text: "#71717a" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

// ── Health session status badge ─────────────────────────────────────────────
const HEALTH_SESSION_CFG: Record<string, { bg: string; text: string }> = {
  open:   { bg: "#f59e0b20", text: "#f59e0b" },
  closed: { bg: "#71717a20", text: "#71717a" },
};

export function HealthSessionStatusBadge({ status }: { status: string }) {
  const cfg = HEALTH_SESSION_CFG[status] ?? { bg: "#71717a20", text: "#71717a" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {HEALTH_SESSION_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Restriction severity badge ──────────────────────────────────────────────
const RESTRICTION_CFG: Record<string, { bg: string; text: string }> = {
  info:     { bg: "#4fc3f720", text: "#4fc3f7" },
  warning:  { bg: "#f59e0b20", text: "#f59e0b" },
  critical: { bg: "#ef444420", text: "#ef4444" },
};

export function RestrictionBadge({ severity }: { severity: string }) {
  const cfg = RESTRICTION_CFG[severity] ?? { bg: "#71717a20", text: "#71717a" };
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {RESTRICTION_SEVERITY_LABELS[severity] ?? severity}
    </span>
  );
}
