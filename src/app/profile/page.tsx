"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import { Member, Membership, Reservation, GymClass, ServiceType } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { computeMembershipCycle } from "@/lib/cycleHelpers";

import { ServiceBadge, MembershipBadge, PaymentBadge, RoleBadge } from "@/components/Badge";
import { SERVICE_LABELS } from "@/lib/labels";

// ─── Constants ─────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};

const CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000;

function safeFormatDate(s?: string | null): string {
  if (!s || typeof s !== "string" || !s.includes("-")) return "Sin fecha";
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return "Sin fecha";
  return `${d}/${m}/${y}`;
}
function safeInitials(name?: string | null): string {
  const clean = typeof name === "string" && name.trim() ? name.trim() : "U";
  return clean.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "U";
}
function formatAmount(amount?: number | null): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "Sin monto";
  return `$${amount.toLocaleString("es-CL")}`;
}

// ─── Inner component ───────────────────────────────────────────────────────
function ProfileContent() {
  const activeUser = useCurrentUser();
  const searchParams = useSearchParams();
  const viewUserId = searchParams.get("userId") ?? activeUser.id;
  const isOwnProfile = viewUserId === activeUser.id;

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allClasses, setAllClasses] = useState<GymClass[]>([]);
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [healthSessions, setHealthSessions] = useState<{ id: string; sessionDate: string; status: string; patientNotes: string | null }[]>([]);
  const [healthRestrictions, setHealthRestrictions] = useState<{ id: string; label: string; severity: string; isActive: boolean }[]>([]);
  const [fetchError, setFetchError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!viewUserId) return;
    setLoading(true);
    setFetchError(false);
    try {
      const [membersRes, memshipsRes, resvRes, classesRes] = await Promise.all([
        fetch("/api/members"),
        fetch(`/api/memberships?studentId=${viewUserId}`),
        fetch(`/api/reservations?userId=${viewUserId}`),
        fetch("/api/classes"),
      ]);
      const allMembersRaw = membersRes.ok ? await membersRes.json() : [];
      const allMembers: Member[] = Array.isArray(allMembersRaw) ? allMembersRaw : [];
      setMember(allMembers.find((m) => m.id === viewUserId) ?? null);

      const msRaw = memshipsRes.ok ? await memshipsRes.json() : [];
      const msData: Membership[] = Array.isArray(msRaw) ? msRaw : [];
      setMemberships(msData);

      const resvRaw = resvRes.ok ? await resvRes.json() : [];
      setReservations(Array.isArray(resvRaw) ? resvRaw : []);

      const classesRaw = classesRes.ok ? await classesRes.json() : [];
      setAllClasses(Array.isArray(classesRaw) ? classesRaw : []);

      const hasKine = msData.some((ms) => ms.serviceType === "kinesiology" && ms.membershipStatus === "active");
      if (hasKine) {
        const [sessRes, restRes] = await Promise.all([
          fetch(`/api/health/sessions?patientId=${viewUserId}`),
          fetch(`/api/health/restrictions?patientId=${viewUserId}&isActive=true`),
        ]);
        if (sessRes.ok) {
          const sessRaw = await sessRes.json();
          if (Array.isArray(sessRaw)) setHealthSessions(sessRaw);
        }
        if (restRes.ok) {
          const restRaw = await restRes.json();
          if (Array.isArray(restRaw)) setHealthRestrictions(restRaw);
        }
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [viewUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = reservations.filter((r) => r.status === "reserved" && new Date(r.classDate) >= today).sort((a, b) => a.classDate.localeCompare(b.classDate));
  const past = reservations.filter((r) => r.status !== "reserved" || new Date(r.classDate) < today).sort((a, b) => b.classDate.localeCompare(a.classDate)).slice(0, 8);
  const activeMemberships = memberships.filter((m) => m.membershipStatus === "active");
  const activeServiceTypes = [...new Set(activeMemberships.map((m) => m.serviceType).filter((s): s is ServiceType => !!s && s !== "blocked_time"))];

  if (loading) {
    return <div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>Cargando perfil...</div>;
  }

  const displayName = member?.name ?? (isOwnProfile ? activeUser.name : "Usuario");
  const displayEmail = member?.email ?? (isOwnProfile ? activeUser.email : "");
  const displayRole = member?.roles?.[0] ?? activeUser.role;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {fetchError && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: "#f59e0b18", color: "#f59e0b", border: "1px solid #f59e0b30" }}>
          Algunos datos del perfil no pudieron cargarse. Intenta recargar la página.
        </div>
      )}
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-5 mb-8"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0"
          style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
        >
          {safeInitials(displayName)}
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            {displayName}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{displayEmail}</p>
          <div className="flex items-center gap-2 mt-2">
            <RoleBadge role={displayRole} />
            {member?.status && (
              <span
                className="text-xs px-2 py-0.5 rounded font-semibold"
                style={member.status === "active"
                  ? { background: "#22c55e20", color: "#22c55e" }
                  : { background: "#71717a20", color: "#71717a" }}
              >
                {member.status === "active" ? "Activo" : "Inactivo"}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="space-y-4">
          {/* Coach */}
          {member?.assignedCoachName && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }}
              className="rounded-xl p-5 border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>Coach Asignado</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #22c55e, #4fc3f7)" }}
                >
                  {safeInitials(member.assignedCoachName)}
                </div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{member.assignedCoachName}</p>
              </div>
            </motion.div>
          )}

          {/* Active services */}
          {activeServiceTypes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl p-5 border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>Servicios Activos</p>
              <div className="space-y-2">
                {activeServiceTypes.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <ServiceBadge type={s} />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{SERVICE_LABELS[s]}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl p-5 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>Estadísticas</p>
            <div className="space-y-3">
              {[
                { label: "Membresías activas", value: activeMemberships.length, accent: "#22c55e" },
                { label: "Total reservas", value: reservations.length, accent: "#4fc3f7" },
                { label: "Próximas clases", value: upcoming.length, accent: "#f97316" },
              ].map(({ label, value, accent }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color: accent }}>{value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-2 space-y-5">
          {/* Memberships */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl p-5 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Membresías</p>
              {memberships.length > 1 && (
                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                  {memberships.length}
                </span>
              )}
            </div>
            {memberships.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>Sin membresías registradas</p>
            ) : (
              <div className="space-y-3">
                {memberships.map((ms) => (
                  <div key={ms.id} className="rounded-lg p-4 border" style={{ borderColor: "var(--card-border)", background: "rgba(0,0,0,0.15)" }}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {ms.serviceType && <ServiceBadge type={ms.serviceType} />}
                          <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{PLAN_LABELS[ms.plan] ?? ms.plan}</p>
                        </div>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatAmount(ms.amount)}</p>
                        {ms.coachName && (
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                            Prof: <span style={{ color: "var(--text-primary)" }}>{ms.coachName}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <PaymentBadge status={ms.paymentStatus} />
                        <MembershipBadge status={ms.membershipStatus} />
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                      <span>Inicio: <span style={{ color: "var(--text-primary)" }}>{safeFormatDate(ms.startDate)}</span></span>
                      <span>Vence: <span style={{ color: "var(--text-primary)" }}>{safeFormatDate(ms.endDate)}</span></span>
                    </div>
                    {ms.totalSessions != null && ms.usedSessions !== undefined && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            Sesiones usadas
                          </span>
                          <span className="text-xs font-semibold" style={{
                            color: ms.usedSessions >= ms.totalSessions ? "#ef4444" : "var(--text-primary)",
                          }}>
                            {ms.usedSessions} / {ms.totalSessions}
                            {ms.totalSessions - ms.usedSessions <= 0
                              ? " — sin sesiones"
                              : ` — ${ms.totalSessions - ms.usedSessions} restante${ms.totalSessions - ms.usedSessions === 1 ? "" : "s"}`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width:      `${Math.min((ms.usedSessions / ms.totalSessions) * 100, 100)}%`,
                              background: ms.usedSessions >= ms.totalSessions ? "#ef4444" : "#4fc3f7",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Membership cycles */}
          {memberships.length > 0 && (() => {
            const cycles = memberships.flatMap((ms) => {
              try {
                return [computeMembershipCycle(ms, reservations, allClasses)];
              } catch {
                return [];
              }
            });
            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="rounded-xl p-5 border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
                  Ciclos de Membresía
                </p>
                <div className="space-y-5">
                  {cycles.map((cycle) => {
                    const pct = cycle.totalCredits > 0 ? Math.min((cycle.usedCredits / cycle.totalCredits) * 100, 100) : 0;
                    const isExpanded = expandedCycles.has(cycle.cycleId);
                    return (
                      <div key={cycle.cycleId}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cycle.membershipName}</p>
                          <span
                            className="text-xs px-2 py-0.5 rounded font-semibold"
                            style={cycle.status === "active"
                              ? { background: "#22c55e20", color: "#22c55e" }
                              : cycle.status === "expired"
                              ? { background: "#ef444420", color: "#ef4444" }
                              : { background: "#71717a20", color: "#71717a" }}
                          >
                            {cycle.status === "active" ? "Activo" : cycle.status === "expired" ? "Vencido" : "Completado"}
                          </span>
                        </div>

                        {/* Credits bar */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct >= 100 ? "#ef4444" : "#22c55e" }}
                            />
                          </div>
                          <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--text-secondary)" }}>
                            {cycle.usedCredits}/{cycle.totalCredits}
                          </span>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          {[
                            { label: "Asistidas", value: cycle.usedCredits, color: "#22c55e" },
                            { label: "Ausentes", value: cycle.absentCount, color: "#ef4444" },
                            { label: "Pendientes", value: cycle.pendingCount, color: "#f59e0b" },
                            { label: "Recuperables", value: cycle.recoverableCount, color: "#a78bfa" },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="rounded-lg p-2 text-center" style={{ background: "rgba(0,0,0,0.15)" }}>
                              <p className="text-sm font-bold" style={{ color }}>{value}</p>
                              <p className="text-xs leading-tight mt-0.5" style={{ color: "var(--text-secondary)" }}>{label}</p>
                            </div>
                          ))}
                        </div>

                        {/* Toggle entry list */}
                        {cycle.entries.length > 0 && (
                          <>
                            <button
                              onClick={() => setExpandedCycles((prev) => {
                                const next = new Set(prev);
                                if (next.has(cycle.cycleId)) next.delete(cycle.cycleId);
                                else next.add(cycle.cycleId);
                                return next;
                              })}
                              className="text-xs font-medium transition-opacity hover:opacity-70"
                              style={{ color: "#4fc3f7" }}
                            >
                              {isExpanded ? "▲ Ocultar entradas" : `▼ Ver ${cycle.entries.length} entradas`}
                            </button>
                            {isExpanded && (
                              <div className="mt-3 space-y-0">
                                {cycle.entries.map((entry) => (
                                  <div
                                    key={entry.reservationId}
                                    className="flex items-center justify-between py-2"
                                    style={{ borderBottom: "1px solid var(--card-border)" }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs tabular-nums font-mono w-5 text-right shrink-0" style={{ color: "var(--text-secondary)" }}>
                                        #{entry.entryNumber}
                                      </span>
                                      <div>
                                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{entry.className}</p>
                                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{entry.classDate}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {entry.eligibleForMakeup && (
                                        <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#a78bfa20", color: "#a78bfa" }}>↺</span>
                                      )}
                                      <span
                                        className="text-xs px-2 py-0.5 rounded font-semibold"
                                        style={
                                          entry.displayStatus === "attended"
                                            ? { background: "#22c55e20", color: "#22c55e" }
                                            : entry.displayStatus === "absent"
                                            ? { background: "#ef444420", color: "#ef4444" }
                                            : entry.displayStatus === "pending_attendance"
                                            ? { background: "#f59e0b20", color: "#f59e0b" }
                                            : { background: "#4fc3f720", color: "#4fc3f7" }
                                        }
                                      >
                                        {entry.displayStatus === "attended" ? "Asistió"
                                          : entry.displayStatus === "absent" ? "Ausente"
                                          : entry.displayStatus === "pending_attendance" ? "Pendiente"
                                          : "Reservado"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}

          {/* Upcoming reservations */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl p-5 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>Próximas Reservas</p>
            {upcoming.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>Sin reservas próximas</p>
            ) : (
              <div className="space-y-0">
                {upcoming.slice(0, 5).map((r) => {
                  const sessionStart = new Date(`${r.classDate}T${r.startTime}:00`);
                  const deadline     = new Date(sessionStart.getTime() - CANCEL_WINDOW_MS);
                  const isLate       = new Date() >= deadline;
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--card-border)" }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.className}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.classDate} · {r.startTime}</p>
                        <p className="text-xs mt-0.5" style={{ color: isLate ? "#f59e0b" : "var(--text-muted)" }}>
                          {isLate
                            ? "Cancelación tardía"
                            : `Cancela antes de las ${deadline.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "#4fc3f720", color: "#4fc3f7" }}>
                        Reservado
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* History */}
          {past.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="rounded-xl p-5 border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>Historial Reciente</p>
              <div className="space-y-0">
                {past.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.className}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.classDate} · {r.startTime}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-semibold"
                      style={r.status === "attended"
                        ? { background: "#22c55e20", color: "#22c55e" }
                        : r.status === "absent"
                        ? { background: "#ef444420", color: "#ef4444" }
                        : { background: "#71717a20", color: "#71717a" }}
                    >
                      {r.status === "attended" ? "Asistió" : r.status === "absent" ? "Ausente" : "Cancelado"}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Kinesiología section — patient journey view */}
          {(healthSessions.length > 0 || healthRestrictions.length > 0) && (() => {
            const kineMembership = memberships.find(
              (ms) => ms.serviceType === "kinesiology" && ms.membershipStatus === "active"
            );
            const sessionsWithNotes = healthSessions.filter((s) => s.patientNotes);
            const closedCount = healthSessions.filter((s) => s.status === "closed").length;
            const totalSessions = kineMembership?.totalSessions ?? null;
            const usedSessions = kineMembership?.usedSessions ?? closedCount;
            const pct = totalSessions ? Math.min((usedSessions / totalSessions) * 100, 100) : 0;

            return (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="rounded-xl border overflow-hidden"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                {/* Header */}
                <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--card-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      Mi plan de kinesiología
                    </p>
                    {!isOwnProfile && (
                      <Link
                        href={`/health/patients/${viewUserId}`}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: "#10b981" }}
                      >
                        Ver ficha clínica →
                      </Link>
                    )}
                  </div>

                  {/* Pack progress */}
                  {kineMembership && (
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                          {kineMembership.plan ?? "Pack kinesiología"}
                        </span>
                        <span className="text-sm font-bold" style={{
                          color: totalSessions && usedSessions >= totalSessions ? "#ef4444" : "#10b981"
                        }}>
                          {totalSessions != null
                            ? `${usedSessions} / ${totalSessions} sesiones`
                            : `${closedCount} sesión${closedCount !== 1 ? "es" : ""} realizadas`}
                        </span>
                      </div>
                      {totalSessions != null && (
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#10b981",
                            }}
                          />
                        </div>
                      )}
                      {totalSessions != null && totalSessions - usedSessions > 0 && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {totalSessions - usedSessions} sesión{totalSessions - usedSessions !== 1 ? "es" : ""} restante{totalSessions - usedSessions !== 1 ? "s" : ""}
                          {kineMembership.endDate ? ` · Vence ${safeFormatDate(kineMembership.endDate)}` : ""}
                        </p>
                      )}
                      {totalSessions != null && usedSessions >= totalSessions && (
                        <p className="text-xs mt-1 font-semibold" style={{ color: "#ef4444" }}>
                          Pack agotado — habla con tu kinesiólogo para renovar
                        </p>
                      )}
                    </div>
                  )}

                  {/* Active restrictions */}
                  {healthRestrictions.length > 0 && (
                    <div>
                      <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>Indicaciones activas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {healthRestrictions.map((r) => (
                          <span
                            key={r.id}
                            className="text-xs px-2 py-0.5 rounded-lg font-medium"
                            style={r.severity === "critical"
                              ? { background: "#ef444420", color: "#ef4444" }
                              : r.severity === "warning"
                              ? { background: "#f59e0b20", color: "#f59e0b" }
                              : { background: "#4fc3f720", color: "#4fc3f7" }}
                          >
                            {r.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Session history — patient notes */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                    Indicaciones del kinesiólogo
                  </p>
                  {sessionsWithNotes.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                      Aún no hay indicaciones registradas.
                    </p>
                  ) : (
                    <div className="space-y-0">
                      {sessionsWithNotes.slice(0, 5).map((s, i) => (
                        <div
                          key={s.id}
                          className="py-3 flex gap-4"
                          style={{ borderBottom: i < sessionsWithNotes.slice(0, 5).length - 1 ? "1px solid var(--card-border)" : "none" }}
                        >
                          <div className="shrink-0 text-right min-w-[72px]">
                            <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                              {new Date(s.sessionDate).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                            </p>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={s.status === "closed"
                                ? { background: "#71717a20", color: "#71717a" }
                                : { background: "#f59e0b20", color: "#f59e0b" }}
                            >
                              {s.status === "closed" ? "Finalizada" : "En curso"}
                            </span>
                          </div>
                          <div className="flex-1 pl-4" style={{ borderLeft: "2px solid #10b98130" }}>
                            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{s.patientNotes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>Cargando...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
