"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Member, Membership, Reservation, MembershipStatus, PaymentStatus, ServiceType } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";

import { ServiceBadge, MembershipBadge, PaymentBadge, RoleBadge } from "@/components/Badge";

// ─── Constants ─────────────────────────────────────────────────────────────
const SERVICE_LABELS: Record<ServiceType, string> = {
  group: "Grupal", personal_training: "Entrenamiento Personal",
  kinesiology: "Kinesiología", blocked_time: "Bloqueado",
};
const MS_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa", expired: "Vencida", cancelled: "Cancelada", pending: "Pendiente",
};
const PAY_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado", pending: "Pendiente", overdue: "Vencido",
};
const PLAN_LABELS: Record<string, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", coach: "Coach", member: "Miembro", student: "Estudiante", owner: "Owner",
};

function formatDate(s: string) { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; }
function initials(name: string) { return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase(); }

// ─── Inner component ───────────────────────────────────────────────────────
function ProfileContent() {
  const activeUser = useCurrentUser();
  const searchParams = useSearchParams();
  const viewUserId = searchParams.get("userId") ?? activeUser.id;
  const isOwnProfile = viewUserId === activeUser.id;

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [membersRes, memshipsRes, resvRes] = await Promise.all([
      fetch("/api/members"),
      fetch(`/api/memberships?studentId=${viewUserId}`),
      fetch(`/api/reservations?userId=${viewUserId}`),
    ]);
    const allMembers: Member[] = await membersRes.json();
    setMember(allMembers.find((m) => m.id === viewUserId) ?? null);
    setMemberships(await memshipsRes.json());
    setReservations(await resvRes.json());
    setLoading(false);
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
  const displayRole = member?.role ?? activeUser.role;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          {initials(displayName)}
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
                  {initials(member.assignedCoachName)}
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
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>${ms.amount.toLocaleString()}</p>
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
                    <div className="flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span>Inicio: <span style={{ color: "var(--text-primary)" }}>{formatDate(ms.startDate)}</span></span>
                      <span>Vence: <span style={{ color: "var(--text-primary)" }}>{formatDate(ms.endDate)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

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
                {upcoming.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2.5" style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.classDate}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Clase #{r.classId}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "#4fc3f720", color: "#4fc3f7" }}>
                      Reservado
                    </span>
                  </div>
                ))}
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
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.classDate}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Clase #{r.classId}</p>
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
