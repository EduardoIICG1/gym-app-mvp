"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Member, Membership, Reservation, MembershipStatus, PaymentStatus, ServiceType } from "@/lib/types";
import { currentUser } from "@/lib/mock-data";

// ─── Constants ─────────────────────────────────────────────────────────────
const SERVICE_LABELS: Record<ServiceType, string> = {
  group: "Grupal",
  personal_training: "Entrenamiento Personal",
  kinesiology: "Kinesiología",
  blocked_time: "Bloqueado",
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  group: "bg-blue-500/15 text-blue-400",
  personal_training: "bg-orange-500/15 text-orange-400",
  kinesiology: "bg-purple-500/15 text-purple-400",
  blocked_time: "bg-zinc-700/30 text-zinc-500",
};

const MS_STATUS_COLORS: Record<MembershipStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-600/30 text-zinc-400 border-zinc-600/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const MS_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
  pending: "Pendiente",
};

const PAY_COLORS: Record<PaymentStatus, string> = {
  paid: "text-green-400",
  pending: "text-yellow-400",
  overdue: "text-red-400",
};

const PAY_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
};

const PLAN_LABELS: Record<string, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  coach: "Coach",
  member: "Miembro",
  student: "Estudiante",
  owner: "Owner",
};

function formatDate(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Inner component (uses useSearchParams) ────────────────────────────────
function ProfileContent() {
  const searchParams = useSearchParams();
  const viewUserId = searchParams.get("userId") ?? currentUser.id;
  const isOwnProfile = viewUserId === currentUser.id;

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
    const found = allMembers.find((m) => m.id === viewUserId) ?? null;
    setMember(found);
    setMemberships(await memshipsRes.json());
    setReservations(await resvRes.json());
    setLoading(false);
  }, [viewUserId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = reservations
    .filter((r) => r.status === "reserved" && new Date(r.classDate) >= today)
    .sort((a, b) => a.classDate.localeCompare(b.classDate));
  const past = reservations
    .filter((r) => r.status !== "reserved" || new Date(r.classDate) < today)
    .sort((a, b) => b.classDate.localeCompare(a.classDate))
    .slice(0, 8);

  const activeMemberships = memberships.filter((m) => m.membershipStatus === "active");

  if (loading) {
    return <div className="text-center py-24 text-zinc-600">Cargando perfil...</div>;
  }

  const displayName = member?.name ?? (isOwnProfile ? currentUser.name : "Usuario");
  const displayEmail = member?.email ?? (isOwnProfile ? currentUser.email : "");
  const displayRole = member?.role ?? currentUser.role;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-white font-bold text-xl shrink-0">
          {initials(displayName)}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{displayEmail}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-500/15 text-purple-400 border-purple-500/30 font-medium">
              {ROLE_LABELS[displayRole] ?? displayRole}
            </span>
            {member?.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                member.status === "active"
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : "bg-zinc-600/30 text-zinc-400 border-zinc-600/30"
              }`}>
                {member.status === "active" ? "Activo" : "Inactivo"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col */}
        <div className="space-y-6">
          {/* Coach asignado */}
          {member?.assignedCoachName && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-500 text-xs font-medium mb-3">Coach Asignado</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                  {initials(member.assignedCoachName)}
                </div>
                <p className="text-white font-semibold text-sm">{member.assignedCoachName}</p>
              </div>
            </div>
          )}

          {/* Servicios contratados */}
          {member && member.contractedServices.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-500 text-xs font-medium mb-3">Servicios Contratados</p>
              <div className="space-y-2">
                {member.contractedServices.filter(s => s !== "blocked_time").map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${SERVICE_COLORS[s]}`}>
                      {SERVICE_LABELS[s]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estadísticas rápidas */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs font-medium mb-3">Estadísticas</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Membresías activas</span>
                <span className="text-white font-semibold">{activeMemberships.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total reservas</span>
                <span className="text-white font-semibold">{reservations.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Próximas clases</span>
                <span className="text-white font-semibold">{upcoming.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-2 space-y-6">
          {/* Membresías */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs font-medium mb-4">
              Membresías
              {memberships.length > 1 && (
                <span className="ml-2 px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">{memberships.length}</span>
              )}
            </p>
            {memberships.length === 0 ? (
              <p className="text-zinc-600 text-sm">Sin membresías registradas</p>
            ) : (
              <div className="space-y-3">
                {memberships.map((ms) => (
                  <div key={ms.id} className="border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {ms.serviceType && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SERVICE_COLORS[ms.serviceType]}`}>
                              {SERVICE_LABELS[ms.serviceType]}
                            </span>
                          )}
                          <p className="text-white font-semibold text-sm">{PLAN_LABELS[ms.plan] ?? ms.plan}</p>
                        </div>
                        <p className="text-zinc-500 text-xs">${ms.amount.toLocaleString()}</p>
                        {ms.coachName && (
                          <p className="text-zinc-600 text-xs mt-0.5">Prof: <span className="text-zinc-400">{ms.coachName}</span></p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${PAY_COLORS[ms.paymentStatus]}`}>
                          {PAY_LABELS[ms.paymentStatus]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${MS_STATUS_COLORS[ms.membershipStatus]}`}>
                          {MS_STATUS_LABELS[ms.membershipStatus]}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-zinc-500">
                      <span>Inicio: <span className="text-zinc-300">{formatDate(ms.startDate)}</span></span>
                      <span>Vence: <span className="text-zinc-300">{formatDate(ms.endDate)}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Próximas clases */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <p className="text-zinc-500 text-xs font-medium mb-4">Próximas Reservas</p>
            {upcoming.length === 0 ? (
              <p className="text-zinc-600 text-sm">Sin reservas próximas</p>
            ) : (
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{r.classDate}</p>
                      <p className="text-zinc-500 text-xs">Clase #{r.classId}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      Reservado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial */}
          {past.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-500 text-xs font-medium mb-4">Historial Reciente</p>
              <div className="space-y-2">
                {past.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{r.classDate}</p>
                      <p className="text-zinc-500 text-xs">Clase #{r.classId}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      r.status === "attended"
                        ? "bg-green-500/15 text-green-400 border-green-500/30"
                        : r.status === "absent"
                        ? "bg-red-500/15 text-red-400 border-red-500/30"
                        : "bg-zinc-600/30 text-zinc-400 border-zinc-600/30"
                    }`}>
                      {r.status === "attended" ? "Asistió" : r.status === "absent" ? "Ausente" : "Cancelado"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page (wraps with Suspense for useSearchParams) ────────────────────────
export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="text-center py-24 text-zinc-600">Cargando...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
