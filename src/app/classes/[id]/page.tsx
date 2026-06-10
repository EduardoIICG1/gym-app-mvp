"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { SERVICE_LABELS } from "@/lib/labels";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Attendee {
  bookingId: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  status: string;
}

interface SessionDetail {
  id: string;
  programName: string;
  serviceType: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  coachName: string;
  capacity: number;
  reservedCount: number;
  status: string;
  attendees?: Attendee[];
  memberStatus?: "confirmed" | "pending_invitation" | null;
  memberBookingId?: string | null;
  memberInvitationId?: string | null;
  attendeeNames?: string[];
}

interface InvitationItem {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  status: string;
  bookingId: string | null;
  message: string | null;
  createdAt: string;
}

interface InvitationSummary {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  cancelled: number;
}

interface InvitationsData {
  summary: InvitationSummary;
  invitations: InvitationItem[];
}

interface MemberOption {
  id: string;
  name: string;
  email: string;
  contractedServices: string[];
}

interface InviteResult {
  created: string[];
  skipped: { memberId: string; reason: string }[];
}

// ─── Labels / styles ──────────────────────────────────────────────────────────

const BOOKING_STATUS_LABELS: Record<string, string> = {
  CONFIRMED:  "Confirmado",
  INVITED:    "Invitado",
  ATTENDED:   "Asistió",
  ABSENT:     "Ausente",
  WAITLISTED: "En espera",
  CANCELLED:  "Cancelado",
};

const INVITATION_STATUS_LABELS: Record<string, string> = {
  pending:   "Pendiente",
  accepted:  "Asistirá",
  declined:  "No asistirá",
  expired:   "Expirada",
  cancelled: "Cancelada",
};

const statusStyle = (s: string): React.CSSProperties => {
  if (s === "ATTENDED")   return { background: "#22c55e20", color: "#22c55e" };
  if (s === "ABSENT")     return { background: "#ef444420", color: "#ef4444" };
  if (s === "CANCELLED")  return { background: "#71717a20", color: "#71717a" };
  return { background: "#4fc3f720", color: "#4fc3f7" };
};

const invStatusStyle = (s: string): React.CSSProperties => {
  if (s === "accepted") return { background: "#22c55e20", color: "#22c55e" };
  if (s === "declined") return { background: "#ef444420", color: "#ef4444" };
  if (s === "expired" || s === "cancelled") return { background: "#71717a20", color: "#71717a" };
  return { background: "#4fc3f720", color: "#4fc3f7" }; // pending
};

const BACK_MAP: Record<string, { href: string; label: string }> = {
  "admin-classes": { href: "/admin/classes", label: "← Volver a gestión" },
  "calendar":      { href: "/calendar",      label: "← Volver al calendario" },
  "home":          { href: "/",              label: "← Volver al inicio" },
  "classes":       { href: "/classes",       label: "← Volver a clases" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "";
  const back = BACK_MAP[from] ?? { href: "/classes", label: "← Volver a clases" };
  const activeUser = useCurrentUser();

  // Session state
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Invitations state
  const [invData, setInvData] = useState<InvitationsData | null>(null);
  const [invLoading, setInvLoading] = useState(false);

  // Convocar modal state
  const [showConvocar, setShowConvocar] = useState(false);
  const [modalMembers, setModalMembers] = useState<MemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  // ── Load session ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeUser.isLoading || !id) return;
    fetch(`/api/classes/${id}`)
      .then(async r => {
        if (r.status === 403) throw new Error("No tienes acceso a esta clase");
        if (r.status === 404) throw new Error("Clase no encontrada");
        if (!r.ok) throw new Error("Error al cargar la clase");
        return r.json();
      })
      .then(data => setSession(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, activeUser.isLoading]);

  // ── Load invitations (admin/coach only, after session loads) ────────────────
  const loadInvitations = async () => {
    if (!id) return;
    setInvLoading(true);
    try {
      const r = await fetch(`/api/sessions/${id}/invitations`);
      if (r.ok) setInvData(await r.json());
    } finally {
      setInvLoading(false);
    }
  };

  useEffect(() => {
    if (!session) return;
    // Only load invitations for admins/coaches (attendees array present = authorized)
    if (session.attendees !== undefined && activeUser.role !== "member") {
      loadInvitations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, activeUser.role]);

  // ── Open Convocar modal — lazy load members ──────────────────────────────────
  const openConvocar = async () => {
    setShowConvocar(true);
    setInviteResult(null);
    setSelectedIds(new Set());
    setInviteMessage("");
    if (modalMembers.length > 0) return; // already loaded
    setMembersLoading(true);
    try {
      const r = await fetch("/api/members?includesRole=member&status=active");
      if (!r.ok) return;
      const all: MemberOption[] = await r.json();
      const svcType = session?.serviceType ?? "";
      // Filter to members who have the matching service contracted
      // For blocked_time sessions: show all active members
      const eligible = svcType === "blocked_time"
        ? all
        : all.filter(m => Array.isArray(m.contractedServices) && m.contractedServices.includes(svcType));
      setModalMembers(eligible);
    } finally {
      setMembersLoading(false);
    }
  };

  const closeConvocar = () => {
    setShowConvocar(false);
    setInviteResult(null);
  };

  const toggleMember = (memberId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  // ── Send invitations ─────────────────────────────────────────────────────────
  const handleConvocar = async () => {
    if (selectedIds.size === 0 || !id) return;
    setInviteLoading(true);
    setInviteResult(null);
    try {
      const r = await fetch(`/api/sessions/${id}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: Array.from(selectedIds),
          message: inviteMessage.trim() || undefined,
        }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error ?? "Error al convocar");
      }
      const result: InviteResult = await r.json();
      setInviteResult(result);
      setSelectedIds(new Set());
      setInviteMessage("");
      // Refresh invitation list
      await loadInvitations();
    } catch (err) {
      setInviteResult({
        created: [],
        skipped: [{ memberId: "", reason: err instanceof Error ? err.message : "Error al convocar" }],
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Attendance / cancel handlers (unchanged) ─────────────────────────────────
  const handleAttendance = async (bookingId: string, attendanceStatus: "attended" | "absent" | "pending_attendance") => {
    setActionLoading(bookingId);
    setActionError("");
    try {
      const res = await fetch(`/api/reservations/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al actualizar");
      }
      setSession(prev => prev ? {
        ...prev,
        attendees: prev.attendees?.map(a =>
          a.bookingId === bookingId
            ? { ...a, status: attendanceStatus === "attended" ? "ATTENDED" : attendanceStatus === "absent" ? "ABSENT" : "CONFIRMED" }
            : a
        ),
      } : prev);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (bookingId: string, memberName: string) => {
    if (!confirm(`¿Cancelar la inscripción de ${memberName || "este alumno"}?`)) return;
    setActionLoading(bookingId);
    setActionError("");
    try {
      const res = await fetch(`/api/reservations/${bookingId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al cancelar");
      }
      setSession(prev => prev ? {
        ...prev,
        reservedCount: Math.max(0, prev.reservedCount - 1),
        attendees: prev.attendees?.map(a =>
          a.bookingId === bookingId ? { ...a, status: "CANCELLED" } : a
        ),
      } : prev);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al cancelar");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reload session (used after member actions) ───────────────────────────────
  const reloadSession = async () => {
    if (!id) return;
    const r = await fetch(`/api/classes/${id}`);
    if (r.ok) setSession(await r.json());
  };

  // ── Member self-cancel ────────────────────────────────────────────────────────
  const handleMemberCancel = async () => {
    if (!session) return;
    if (!confirm("¿Cancelar tu inscripción?")) return;
    setActionLoading("member-cancel");
    setActionError("");
    try {
      const res = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: session.id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al cancelar");
      }
      const data = await res.json();
      if (data.late) setActionError("Cancelación tardía: la sesión no fue recuperada.");
      await reloadSession();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al cancelar");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Member invitation response ────────────────────────────────────────────────
  const handleInvitationResponse = async (invId: string, status: "accepted" | "declined") => {
    setActionLoading(`inv-${invId}`);
    setActionError("");
    try {
      const res = await fetch(`/api/invitations/${invId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Error al responder");
      }
      await reloadSession();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Error al responder");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Render guards ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center" style={{ color: "var(--text-secondary)" }}>
        Cargando...
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-center mb-4" style={{ color: "#ef4444" }}>
          {error || "Clase no encontrada"}
        </p>
        <div className="text-center">
          <Link href={back.href} className="text-sm hover:underline" style={{ color: "#4fc3f7" }}>
            {back.label}
          </Link>
        </div>
      </div>
    );
  }

  const pct = session.capacity > 0 ? (session.reservedCount / session.capacity) * 100 : 0;
  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
  // Server is the authoritative gate (MEMBER never receives attendees from API).
  // The role check here prevents the DevPanel edge case where the real JWT is ADMIN
  // but the visual role is set to "member", which would otherwise expose the attendee UI.
  const canSeeAttendees = session.attendees !== undefined && activeUser.role !== "member";
  const canConvocar = canSeeAttendees && session.status === "active" && session.serviceType !== "blocked_time";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link href={back.href} className="text-xs hover:underline mb-6 inline-block" style={{ color: "#4fc3f7" }}>
        {back.label}
      </Link>

      {/* Session header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 border mb-5"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {session.programName}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {session.sessionDate} · {session.startTime} – {session.endTime}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded font-semibold shrink-0"
            style={session.status === "active"
              ? { background: "#22c55e20", color: "#22c55e" }
              : { background: "#ef444420", color: "#ef4444" }}
          >
            {session.status === "active" ? "Activa" : "Cancelada"}
          </span>
        </div>

        {/* Info rows */}
        <div className="space-y-2 text-sm mb-5">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Coach</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{session.coachName}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Servicio</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {SERVICE_LABELS[session.serviceType] ?? session.serviceType}
            </span>
          </div>
        </div>

        {/* Occupancy bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Cupos
            </span>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {session.reservedCount} / {session.capacity}
            </span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pct, 100)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
            />
          </div>
        </div>
      </motion.div>

      {/* Attendees + Convocar — ADMIN / authorized COACH only */}
      {canSeeAttendees && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 border mb-5"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          {/* Header row with Convocar button */}
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Inscritos ({session.attendees!.filter(a => a.status !== "CANCELLED").length})
            </p>
            {canConvocar && (
              <button
                onClick={openConvocar}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: "#4fc3f720", color: "#4fc3f7" }}
              >
                Convocar alumnos
              </button>
            )}
          </div>

          {/* Capacity note for admin/coach */}
          {session.capacity > 0 && (
            <p className="text-xs mb-3" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
              Inscritos confirmados: {session.reservedCount} / {session.capacity} · Las convocatorias pendientes no ocupan cupo
            </p>
          )}

          {/* Action error */}
          {actionError && (
            <p className="text-xs mb-3 px-2 py-1 rounded" style={{ background: "#ef444420", color: "#ef4444" }}>
              {actionError}
            </p>
          )}

          {session.attendees!.length === 0 ? (
            <p className="text-sm mt-4" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
              Sin inscritos
            </p>
          ) : (
            <div className="space-y-0 mt-4">
              {session.attendees!.map(a => {
                const isBusy = actionLoading === a.bookingId;
                const isCancelled = a.status === "CANCELLED";
                return (
                  <div
                    key={a.bookingId}
                    className="flex items-center gap-3 py-3"
                    style={{
                      borderBottom: "1px solid var(--card-border)",
                      opacity: isCancelled ? 0.45 : 1,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {a.memberName || "—"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {a.memberEmail}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                      style={statusStyle(a.status)}
                    >
                      {BOOKING_STATUS_LABELS[a.status] ?? a.status}
                    </span>
                    {!isCancelled && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleAttendance(a.bookingId, "attended")}
                          disabled={isBusy || a.status === "ATTENDED"}
                          title="Marcar asistencia"
                          className="w-7 h-7 rounded-lg text-xs font-bold transition-colors disabled:opacity-30"
                          style={a.status === "ATTENDED"
                            ? { background: "#22c55e", color: "#fff" }
                            : { background: "#22c55e20", color: "#22c55e" }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleAttendance(a.bookingId, "absent")}
                          disabled={isBusy || a.status === "ABSENT"}
                          title="Marcar ausencia"
                          className="w-7 h-7 rounded-lg text-xs font-bold transition-colors disabled:opacity-30"
                          style={a.status === "ABSENT"
                            ? { background: "#ef4444", color: "#fff" }
                            : { background: "#ef444420", color: "#ef4444" }}
                        >
                          ✗
                        </button>
                        <button
                          onClick={() => handleCancel(a.bookingId, a.memberName)}
                          disabled={isBusy}
                          title="Cancelar inscripción"
                          className="w-7 h-7 rounded-lg text-xs font-bold transition-colors disabled:opacity-30"
                          style={{ background: "#71717a20", color: "#71717a" }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Invitations section — ADMIN / authorized COACH only */}
      {canSeeAttendees && (invData || invLoading) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-6 border mb-5"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
            Convocatoria
          </p>

          {invLoading && !invData ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
              Cargando...
            </p>
          ) : invData ? (
            <>
              {/* Summary chips */}
              {invData.summary.total > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {(["pending", "accepted", "declined", "expired", "cancelled"] as const).map(key => {
                    const count = invData.summary[key];
                    if (count === 0) return null;
                    return (
                      <span key={key} className="text-xs px-2 py-0.5 rounded font-semibold" style={invStatusStyle(key)}>
                        {INVITATION_STATUS_LABELS[key]}: {count}
                      </span>
                    );
                  })}
                </div>
              )}

              {invData.invitations.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                  Sin convocatorias
                </p>
              ) : (
                <div className="space-y-0">
                  {invData.invitations.map(inv => (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 py-2.5"
                      style={{ borderBottom: "1px solid var(--card-border)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {inv.memberName || "—"}
                        </p>
                        {inv.message && (
                          <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                            {inv.message}
                          </p>
                        )}
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                        style={invStatusStyle(inv.status)}
                      >
                        {INVITATION_STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </motion.div>
      )}

      {/* MEMBER: own status + actions + sanitized attendee names */}
      {!canSeeAttendees && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 border mb-5"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Tu inscripción
              </p>
              {session.memberStatus === "confirmed" && (
                <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "#4fc3f720", color: "#4fc3f7" }}>
                  Reservada
                </span>
              )}
              {session.memberStatus === "pending_invitation" && (
                <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                  Invitado
                </span>
              )}
            </div>

            {actionError && (
              <p className="text-xs mb-3 px-2 py-1 rounded" style={{ background: "#ef444420", color: "#ef4444" }}>
                {actionError}
              </p>
            )}

            {session.memberStatus === "pending_invitation" && session.memberInvitationId && (
              <div>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  Tienes una solicitud pendiente para esta clase.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleInvitationResponse(session.memberInvitationId!, "accepted")}
                    disabled={actionLoading !== null}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                    style={{ background: "#22c55e", color: "#fff" }}
                  >
                    {actionLoading !== null ? "..." : "Asistiré"}
                  </button>
                  <button
                    onClick={() => handleInvitationResponse(session.memberInvitationId!, "declined")}
                    disabled={actionLoading !== null}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                  >
                    {actionLoading !== null ? "..." : "No asistiré"}
                  </button>
                </div>
              </div>
            )}

            {session.memberStatus === "confirmed" && (
              <div>
                <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                  Estás inscrito/a en esta clase.
                </p>
                <button
                  onClick={handleMemberCancel}
                  disabled={actionLoading !== null}
                  className="w-full py-2 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
                  style={{ background: "#ef444420", color: "#ef4444" }}
                >
                  {actionLoading === "member-cancel" ? "Cancelando..." : "Cancelar inscripción"}
                </button>
              </div>
            )}

            {!session.memberStatus && (
              <div className="text-center">
                <p className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                  {session.reservedCount}
                </p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {session.reservedCount === 1 ? "persona inscrita" : "personas inscritas"} de {session.capacity} cupos
                </p>
              </div>
            )}
          </motion.div>

          {session.attendeeNames && session.attendeeNames.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl p-6 border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                Compañeros inscritos ({session.attendeeNames.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {session.attendeeNames.map((name, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg font-medium"
                    style={{ background: "var(--card-border)", color: "var(--text-primary)" }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ── Convocar alumnos modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showConvocar && (
          <motion.div
            key="convocar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={e => { if (e.target === e.currentTarget) closeConvocar(); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="w-full max-w-md rounded-2xl p-6 flex flex-col"
              style={{
                background: "var(--card)",
                borderColor: "var(--card-border)",
                border: "1px solid var(--card-border)",
                maxHeight: "85vh",
              }}
            >
              {/* Modal header */}
              <div className="flex items-start justify-between mb-4 shrink-0">
                <div>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    Convocar alumnos
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {session.programName} · {session.sessionDate} {session.startTime}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    Coach: {session.coachName} · {session.reservedCount}/{session.capacity} inscritos confirmados
                  </p>
                </div>
                <button
                  onClick={closeConvocar}
                  className="text-lg leading-none ml-4 shrink-0"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ×
                </button>
              </div>

              {/* Aclaratory note */}
              <p className="text-xs px-3 py-2 rounded-lg mb-4 shrink-0" style={{ background: "#4fc3f720", color: "#4fc3f7" }}>
                Las convocatorias pendientes no ocupan cupo. El cupo se valida cuando el miembro confirma asistencia.
              </p>

              {/* Result banner */}
              {inviteResult && (
                <div
                  className="text-xs px-3 py-2 rounded-lg mb-4 shrink-0"
                  style={
                    inviteResult.created.length > 0
                      ? { background: "#22c55e20", color: "#22c55e" }
                      : { background: "#ef444420", color: "#ef4444" }
                  }
                >
                  {inviteResult.created.length > 0 && inviteResult.skipped.filter(s => s.memberId).length === 0
                    ? `Se convocaron ${inviteResult.created.length} ${inviteResult.created.length === 1 ? "alumno" : "alumnos"}.`
                    : inviteResult.created.length > 0
                      ? `Se convocaron ${inviteResult.created.length} ${inviteResult.created.length === 1 ? "alumno" : "alumnos"}. ${inviteResult.skipped.filter(s => s.memberId).length} omitidos.`
                      : inviteResult.skipped[0]?.reason ?? "Error al convocar"}
                </div>
              )}

              {/* Message field */}
              <div className="mb-3 shrink-0">
                <textarea
                  value={inviteMessage}
                  onChange={e => setInviteMessage(e.target.value)}
                  placeholder="Ej: Esta semana volvemos al horario normal"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                  style={{
                    background: "var(--input-bg, #1a1a2e)",
                    border: "1px solid var(--card-border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>

              {/* Member list */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {membersLoading ? (
                  <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)" }}>
                    Cargando alumnos...
                  </p>
                ) : modalMembers.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                    Sin alumnos elegibles para este servicio
                  </p>
                ) : (
                  <div className="space-y-0">
                    {modalMembers.map(m => {
                      const selected = selectedIds.has(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleMember(m.id)}
                          className="w-full flex items-center gap-3 py-2.5 text-left transition-colors"
                          style={{ borderBottom: "1px solid var(--card-border)" }}
                        >
                          {/* Checkbox visual */}
                          <span
                            className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-xs font-bold"
                            style={selected
                              ? { background: "#4fc3f7", color: "#000" }
                              : { border: "1.5px solid var(--card-border)", color: "transparent" }}
                          >
                            {selected ? "✓" : ""}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                              {m.name || m.email}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 mt-4 shrink-0">
                <button
                  onClick={closeConvocar}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                >
                  Cerrar
                </button>
                <button
                  onClick={handleConvocar}
                  disabled={selectedIds.size === 0 || inviteLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
                  style={{ background: "#4fc3f7", color: "#000" }}
                >
                  {inviteLoading
                    ? "Convocando..."
                    : selectedIds.size === 0
                      ? "Convocar"
                      : `Convocar (${selectedIds.size})`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
