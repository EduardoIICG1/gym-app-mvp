"use client";

import { useState, useEffect, useCallback } from "react";
import { Membership, MembershipStatus, MembershipPlan, PaymentStatus } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa",
  expired: "Vencida",
  cancelled: "Cancelada",
  pending: "Pendiente",
};

const STATUS_COLORS: Record<MembershipStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-600/30 text-zinc-400 border-zinc-600/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
};

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  paid: "text-green-400",
  pending: "text-yellow-400",
  overdue: "text-red-400",
};

const PLAN_LABELS: Record<MembershipPlan, string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

const PLAN_COLORS: Record<MembershipPlan, string> = {
  mensual: "bg-blue-500/15 text-blue-400",
  trimestral: "bg-purple-500/15 text-purple-400",
  semestral: "bg-orange-500/15 text-orange-400",
  anual: "bg-emerald-500/15 text-emerald-400",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function daysUntil(dateStr: string) {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<MembershipStatus | "all">("all");
  const [filterPlan, setFilterPlan] = useState<MembershipPlan | "all">("all");
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPlan !== "all") params.set("plan", filterPlan);
    const res = await fetch(`/api/memberships?${params}`);
    setMemberships(await res.json());
    setLoading(false);
  }, [filterStatus, filterPlan]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = memberships.filter((m) =>
    search === "" ||
    m.studentName.toLowerCase().includes(search.toLowerCase()) ||
    m.studentEmail.toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const total = memberships.length;
  const active = memberships.filter((m) => m.membershipStatus === "active").length;
  const expiringSoon = memberships.filter((m) => {
    if (m.membershipStatus !== "active") return false;
    const days = daysUntil(m.endDate);
    return days >= 0 && days <= 7;
  }).length;
  const totalRevenue = memberships
    .filter((m) => m.paymentStatus === "paid")
    .reduce((sum, m) => sum + m.amount, 0);

  const kpis = [
    { label: "Total Miembros", value: total, sub: "registrados", color: "text-blue-400" },
    { label: "Activas", value: active, sub: `de ${total} membresías`, color: "text-green-400" },
    { label: "Por Vencer", value: expiringSoon, sub: "próximos 7 días", color: "text-yellow-400" },
    {
      label: "Ingresos",
      value: `$${totalRevenue.toLocaleString()}`,
      sub: "membresías pagadas",
      color: "text-emerald-400",
    },
  ];

  const statusOptions: Array<{ value: MembershipStatus | "all"; label: string }> = [
    { value: "all", label: "Todos los estados" },
    { value: "active", label: "Activa" },
    { value: "expired", label: "Vencida" },
    { value: "pending", label: "Pendiente" },
    { value: "cancelled", label: "Cancelada" },
  ];

  const planOptions: Array<{ value: MembershipPlan | "all"; label: string }> = [
    { value: "all", label: "Todos los planes" },
    { value: "mensual", label: "Mensual" },
    { value: "trimestral", label: "Trimestral" },
    { value: "semestral", label: "Semestral" },
    { value: "anual", label: "Anual" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Membresías</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Gestiona planes, pagos y estado de membresías</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {kpis.map(({ label, value, sub, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as MembershipStatus | "all")}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
        >
          {statusOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value as MembershipPlan | "all")}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
        >
          {planOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-zinc-600 text-xs mb-4">
        {loading ? "Cargando..." : `${filtered.length} membresía${filtered.length !== 1 ? "s" : ""} encontrada${filtered.length !== 1 ? "s" : ""}`}
      </p>

      {/* Membership cards */}
      {loading ? (
        <div className="text-center py-24 text-zinc-600">Cargando membresías...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-zinc-600">No se encontraron membresías</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const days = daysUntil(m.endDate);
            const isExpiringSoon = m.membershipStatus === "active" && days >= 0 && days <= 7;

            return (
              <div
                key={m.id}
                className={`bg-zinc-900 border rounded-xl p-5 transition-colors ${
                  isExpiringSoon ? "border-yellow-500/30" : "border-zinc-800"
                }`}
              >
                {/* Top row: avatar + name + status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {initials(m.studentName)}
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm leading-tight">{m.studentName}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{m.studentEmail}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ml-2 ${STATUS_COLORS[m.membershipStatus]}`}>
                    {STATUS_LABELS[m.membershipStatus]}
                  </span>
                </div>

                {/* Plan badge */}
                <div className="mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLAN_COLORS[m.plan]}`}>
                    {PLAN_LABELS[m.plan]}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Monto</span>
                    <span className="text-white font-semibold">${m.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Pago</span>
                    <span className={`font-medium ${PAYMENT_COLORS[m.paymentStatus]}`}>
                      {PAYMENT_LABELS[m.paymentStatus]}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Inicio</span>
                    <span className="text-zinc-300">{formatDate(m.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Vencimiento</span>
                    <span className="text-zinc-300">{formatDate(m.endDate)}</span>
                  </div>
                </div>

                {/* Expiry warning */}
                {isExpiringSoon && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-yellow-400 text-xs font-medium">
                      ⚠ Vence en {days === 0 ? "hoy" : `${days} día${days !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                )}

                {/* Expired info */}
                {m.membershipStatus === "expired" && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <p className="text-red-400 text-xs font-medium">
                      Venció hace {Math.abs(days)} día{Math.abs(days) !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Days remaining bar for active */}
                {m.membershipStatus === "active" && days > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-500">Vigencia</span>
                      <span className={isExpiringSoon ? "text-yellow-400 font-medium" : "text-zinc-400"}>
                        {days} días restantes
                      </span>
                    </div>
                    {/* Calculate total duration in days */}
                    {(() => {
                      const start = new Date(m.startDate);
                      const end = new Date(m.endDate);
                      const total = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      const pct = Math.max(0, Math.min((days / total) * 100, 100));
                      return (
                        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isExpiringSoon ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
