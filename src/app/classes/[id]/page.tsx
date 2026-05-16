"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useCurrentUser } from "@/lib/useCurrentUser";

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
}

const BOOKING_STATUS_LABELS: Record<string, string> = {
  CONFIRMED:  "Confirmado",
  INVITED:    "Invitado",
  ATTENDED:   "Asistió",
  ABSENT:     "Ausente",
  WAITLISTED: "En espera",
  CANCELLED:  "Cancelado",
};

const statusStyle = (s: string): React.CSSProperties => {
  if (s === "ATTENDED")   return { background: "#22c55e20", color: "#22c55e" };
  if (s === "ABSENT")     return { background: "#ef444420", color: "#ef4444" };
  if (s === "CANCELLED")  return { background: "#71717a20", color: "#71717a" };
  return { background: "#4fc3f720", color: "#4fc3f7" };
};

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const activeUser = useCurrentUser();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null); // bookingId being acted on
  const [actionError, setActionError] = useState("");

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
      // Update local attendees state
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
      // Mark as CANCELLED in local state
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
          <Link href="/classes" className="text-sm hover:underline" style={{ color: "#4fc3f7" }}>
            ← Volver a clases
          </Link>
        </div>
      </div>
    );
  }

  const pct = session.capacity > 0 ? (session.reservedCount / session.capacity) * 100 : 0;
  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
  const canSeeAttendees = session.attendees !== undefined;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link href="/classes" className="text-xs hover:underline mb-6 inline-block" style={{ color: "#4fc3f7" }}>
        ← Volver a clases
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
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{session.serviceType}</span>
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

      {/* Attendees — ADMIN / authorized COACH only */}
      {canSeeAttendees && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 border"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
            Inscritos ({session.attendees!.filter(a => a.status !== "CANCELLED").length})
          </p>

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
                    {/* Member info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {a.memberName || "—"}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        {a.memberEmail}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                      style={statusStyle(a.status)}
                    >
                      {BOOKING_STATUS_LABELS[a.status] ?? a.status}
                    </span>

                    {/* Actions — hidden for cancelled bookings */}
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

      {/* MEMBER: only count, no names */}
      {!canSeeAttendees && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-6 border text-center"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <p className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            {session.reservedCount}
          </p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {session.reservedCount === 1 ? "persona inscrita" : "personas inscritas"} de {session.capacity} cupos
          </p>
        </motion.div>
      )}
    </div>
  );
}
