"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Check, CalendarPlus } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { buildGCalURL } from "@/lib/gcal";

interface PendingInvitation {
  id: string;
  status: string;
  message: string | null;
  session: {
    id: string;
    programName: string;
    serviceType: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    coachName: string;
    capacity: number;
    spotsLeft: number | null;
    status: string;
  };
}

interface HomeMembership {
  membershipStatus: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  totalSessions: number | null;
  usedSessions: number;
}

type MemberAlertSeverity = "critical" | "no_sessions" | "pending";

interface MembershipAlert {
  serviceType: string;
  severity: MemberAlertSeverity;
  message: string;
}

const SVC_SHORT: Record<string, string> = {
  group:             "Grupal",
  personal_training: "Personal Training",
  kinesiology:       "Kinesiología",
};

const SVC_LABEL: Record<string, string> = {
  group:             "Clases grupales",
  personal_training: "Entrenamiento personal",
  kinesiology:       "Kinesiología",
};

const ALERT_COLORS: Record<MemberAlertSeverity, { bg: string; accent: string }> = {
  critical:    { bg: "rgba(239,68,68,0.08)",  accent: "#ef4444" },
  no_sessions: { bg: "rgba(245,158,11,0.08)", accent: "#f59e0b" },
  pending:     { bg: "rgba(234,179,8,0.08)",  accent: "#eab308" },
};

function computeMembershipAlerts(ms: HomeMembership[], today: string): MembershipAlert[] {
  if (ms.length === 0) {
    return [{ serviceType: "none", severity: "critical", message: "No tienes una membresía activa. Contacta a administración." }];
  }
  const byService: Record<string, HomeMembership[]> = {};
  for (const m of ms) {
    if (!byService[m.serviceType]) byService[m.serviceType] = [];
    byService[m.serviceType].push(m);
  }
  const alerts: MembershipAlert[] = [];
  for (const [svc, list] of Object.entries(byService)) {
    const label = SVC_LABEL[svc] ?? svc;
    const isOk = (m: HomeMembership) =>
      m.membershipStatus === "active" &&
      m.startDate <= today &&
      (m.endDate === "" || m.endDate >= today) &&
      (m.totalSessions == null || (m.usedSessions ?? 0) < m.totalSessions);
    if (list.some(isOk)) continue;
    const hasCritical = list.some(m =>
      m.membershipStatus === "expired" ||
      m.membershipStatus === "cancelled" ||
      (m.membershipStatus === "active" && m.endDate !== "" && m.endDate < today)
    );
    const hasNoSessions = list.some(m =>
      m.membershipStatus === "active" &&
      m.startDate <= today &&
      (m.endDate === "" || m.endDate >= today) &&
      m.totalSessions !== null &&
      (m.usedSessions ?? 0) >= m.totalSessions
    );
    const hasPending = list.some(m =>
      m.membershipStatus === "pending" ||
      (m.membershipStatus === "active" && m.startDate > today)
    );
    if (hasCritical) {
      alerts.push({ serviceType: svc, severity: "critical",    message: `Tu membresía de ${label} está vencida o inactiva. Contacta a administración.` });
    } else if (hasNoSessions) {
      alerts.push({ serviceType: svc, severity: "no_sessions", message: `No tienes sesiones disponibles en ${label}. Contacta a administración para renovar tu plan.` });
    } else if (hasPending) {
      alerts.push({ serviceType: svc, severity: "pending",     message: `Tu membresía de ${label} aún no está activa.` });
    }
  }
  const order: Record<MemberAlertSeverity, number> = { critical: 0, no_sessions: 1, pending: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export default function SolicitudesPage() {
  const activeUser = useCurrentUser();
  const [mounted, setMounted] = useState(false);

  const [invitations,       setInvitations]       = useState<PendingInvitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [respondingId,      setRespondingId]       = useState<string | null>(null);
  const [inviteErrors,      setInviteErrors]       = useState<Record<string, string>>({});
  const [justAccepted,      setJustAccepted]       = useState<Record<string, PendingInvitation>>({});

  const [membershipAlerts,   setMembershipAlerts]   = useState<MembershipAlert[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (activeUser.isLoading) return;
    if (activeUser.role !== "member") { setInvitationsLoading(false); return; }
    fetch("/api/invitations?status=pending")
      .then(r => r.ok ? r.json() : [])
      .then(data => setInvitations(data))
      .catch(() => {})
      .finally(() => setInvitationsLoading(false));
  }, [activeUser.id, activeUser.isLoading, activeUser.role]);

  useEffect(() => {
    if (activeUser.isLoading) return;
    if (activeUser.role !== "member") { setMembershipsLoading(false); return; }
    fetch("/api/memberships")
      .then(r => r.ok ? r.json() : [])
      .then((data: HomeMembership[]) => {
        setMembershipAlerts(computeMembershipAlerts(data, new Date().toISOString().slice(0, 10)));
      })
      .catch(() => {})
      .finally(() => setMembershipsLoading(false));
  }, [activeUser.id, activeUser.isLoading, activeUser.role]);

  const handleRespond = async (inv: PendingInvitation, status: "accepted" | "declined") => {
    setRespondingId(inv.id);
    setInviteErrors(prev => { const n = { ...prev }; delete n[inv.id]; return n; });
    try {
      const r = await fetch(`/api/invitations/${inv.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const msg = (d as { error?: string }).error ?? "Error al responder. Intenta nuevamente.";
        setInviteErrors(prev => ({ ...prev, [inv.id]: msg }));
        return;
      }
      if (status === "accepted") {
        setJustAccepted(prev => ({ ...prev, [inv.id]: inv }));
      }
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
    } finally {
      setRespondingId(null);
    }
  };

  if (!mounted) return null;

  // Non-member guard
  if (!activeUser.isLoading && activeUser.role !== "member") {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Esta sección es exclusiva para miembros.
        </p>
        <Link href="/" className="mt-3 text-sm font-medium hover:underline" style={{ color: "#4fc3f7" }}>
          Volver al inicio →
        </Link>
      </div>
    );
  }

  const sorted = [...invitations].sort((a, b) =>
    a.session.sessionDate.localeCompare(b.session.sessionDate) ||
    a.session.startTime.localeCompare(b.session.startTime)
  );

  return (
    <div className="p-4 lg:p-6" style={{ paddingBottom: "5rem" }}>
      <div className="mx-auto" style={{ maxWidth: "640px" }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-bold text-xl" style={{ color: "var(--text-primary)" }}>
              Solicitudes
            </h1>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Invitaciones de clase pendientes de respuesta
            </p>
          </div>
        </div>

        {/* Membership alerts */}
        {!membershipsLoading && membershipAlerts.length > 0 && (
          <div className="space-y-2 mb-5">
            {membershipAlerts.map(alert => {
              const c = ALERT_COLORS[alert.severity];
              return (
                <motion.div
                  key={alert.serviceType}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3.5"
                  style={{ background: c.bg, borderLeft: `4px solid ${c.accent}` }}
                >
                  <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: "1.55" }}>
                    {alert.message}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Accepted invitations — GCal prompt */}
        {Object.values(justAccepted).length > 0 && (
          <div className="space-y-3 mb-5">
            {Object.values(justAccepted).map(inv => {
              const isPersonalized = inv.session.serviceType === "personal_training" || inv.session.serviceType === "kinesiology";
              const gcalUrl = buildGCalURL({
                title: `${inv.session.programName} — Primary Performance`,
                sessionDate: inv.session.sessionDate,
                startTime: inv.session.startTime,
                endTime: inv.session.endTime,
                description: `Instructor: ${inv.session.coachName}`,
              });
              return (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border p-4"
                  style={{ background: "var(--card)", borderColor: "#22c55e40" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "#22c55e20" }}>
                      <Check className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "#22c55e" }}>¡Confirmado!</p>
                    <button
                      onClick={() => setJustAccepted(prev => { const n = { ...prev }; delete n[inv.id]; return n; })}
                      className="ml-auto p-1 rounded hover:bg-white/5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: "var(--text-primary)" }}>
                    {inv.session.programName}
                  </p>
                  <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
                    {inv.session.sessionDate} · {inv.session.startTime}–{inv.session.endTime} · {inv.session.coachName}
                  </p>
                  <a
                    href={gcalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                    style={isPersonalized
                      ? { background: "#4285F4", color: "white" }
                      : { background: "var(--background)", color: "var(--text-secondary)", border: "1px solid var(--card-border)" }}
                  >
                    <CalendarPlus className="w-4 h-4" />
                    Agregar a Google Calendar
                  </a>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pending invitations */}
        <div
          className="rounded-2xl border"
          style={{ background: "var(--card)", borderColor: "#4fc3f740" }}
        >
          <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: "var(--card-border)" }}>
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                Invitaciones pendientes
              </h2>
              {!invitationsLoading && invitations.length > 0 && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#4fc3f720", color: "#4fc3f7" }}
                >
                  {invitations.length}
                </span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Confirmar asistencia reservará tu cupo si aún hay disponibilidad.
            </p>
          </div>

          <div className="p-4">
            {invitationsLoading ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>
                Cargando...
              </p>
            ) : sorted.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
                No tienes solicitudes pendientes.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                <div className="space-y-3">
                  {sorted.map(inv => {
                    const busy     = respondingId === inv.id;
                    const err      = inviteErrors[inv.id];
                    const svcLabel = SVC_SHORT[inv.session.serviceType] ?? inv.session.serviceType;
                    return (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div
                          className="p-4 rounded-xl border"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        >
                          <p className="font-bold text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>
                            {inv.session.programName}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {svcLabel} · {inv.session.sessionDate} {inv.session.startTime} · {inv.session.coachName}
                          </p>
                          {inv.session.spotsLeft !== null && (
                            <p className="text-xs mt-0.5" style={{ color: inv.session.spotsLeft === 0 ? "#ef4444" : "#22c55e" }}>
                              {inv.session.spotsLeft === 0
                                ? "Sin cupos disponibles"
                                : `${inv.session.spotsLeft} cupo${inv.session.spotsLeft !== 1 ? "s" : ""} disponible${inv.session.spotsLeft !== 1 ? "s" : ""}`}
                            </p>
                          )}
                          {inv.message && (
                            <p className="text-xs mt-1 italic" style={{ color: "var(--text-secondary)", opacity: 0.75 }}>
                              &ldquo;{inv.message}&rdquo;
                            </p>
                          )}
                          {err && (
                            <p className="text-xs px-2 py-1 rounded mt-2" style={{ background: "#ef444420", color: "#ef4444" }}>
                              {err}
                            </p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleRespond(inv, "accepted")}
                              disabled={busy}
                              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                              style={{ background: "#4fc3f7", color: "#000" }}
                            >
                              {busy ? "..." : "Asistiré"}
                            </button>
                            <button
                              onClick={() => handleRespond(inv, "declined")}
                              disabled={busy}
                              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                              style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                            >
                              No asistiré
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
