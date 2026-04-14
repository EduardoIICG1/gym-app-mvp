"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Membership, MembershipStatus, MembershipPlan, PaymentStatus } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa", expired: "Vencida", cancelled: "Cancelada", pending: "Pendiente",
};
const STATUS_COLORS: Record<MembershipStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-600/30 text-zinc-400 border-zinc-600/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};
const PAYMENT_LABELS: Record<PaymentStatus, string> = { paid: "Pagado", pending: "Pendiente", overdue: "Vencido" };
const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  paid: "text-green-400", pending: "text-yellow-400", overdue: "text-red-400",
};
const PLAN_LABELS: Record<MembershipPlan, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};
const PLAN_COLORS: Record<MembershipPlan, string> = {
  mensual: "bg-blue-500/15 text-blue-400",
  trimestral: "bg-purple-500/15 text-purple-400",
  semestral: "bg-orange-500/15 text-orange-400",
  anual: "bg-emerald-500/15 text-emerald-400",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(s: string) { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; }
function daysUntil(s: string) {
  const target = new Date(s);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface Group { studentId: string; studentName: string; studentEmail: string; memberships: Membership[] }

interface EditState {
  plan: MembershipPlan;
  membershipStatus: MembershipStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  startDate: string;
  endDate: string;
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<MembershipStatus | "all">("all");
  const [filterPlan, setFilterPlan] = useState<MembershipPlan | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Membership | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

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

  // Group by studentId preserving first-seen order
  const groups: Group[] = filtered.reduce((acc: Group[], m) => {
    const existing = acc.find((g) => g.studentId === m.studentId);
    if (existing) existing.memberships.push(m);
    else acc.push({ studentId: m.studentId, studentName: m.studentName, studentEmail: m.studentEmail, memberships: [m] });
    return acc;
  }, []);

  // KPIs (over full unfiltered set from state)
  const total = memberships.length;
  const active = memberships.filter((m) => m.membershipStatus === "active").length;
  const expiringSoon = memberships.filter((m) => {
    if (m.membershipStatus !== "active") return false;
    const d = daysUntil(m.endDate);
    return d >= 0 && d <= 7;
  }).length;
  const totalRevenue = memberships.filter((m) => m.paymentStatus === "paid").reduce((s, m) => s + m.amount, 0);

  const kpis = [
    { label: "Total Membresías", value: total, sub: "registradas", color: "text-blue-400" },
    { label: "Activas", value: active, sub: `de ${total} membresías`, color: "text-green-400" },
    { label: "Por Vencer", value: expiringSoon, sub: "próximos 7 días", color: "text-yellow-400" },
    { label: "Ingresos", value: `$${totalRevenue.toLocaleString()}`, sub: "membresías pagadas", color: "text-emerald-400" },
  ];

  const openEdit = (m: Membership) => {
    setEditing(m);
    setEditState({ plan: m.plan, membershipStatus: m.membershipStatus, paymentStatus: m.paymentStatus, amount: m.amount, startDate: m.startDate, endDate: m.endDate });
  };

  const handleSave = async () => {
    if (!editing || !editState) return;
    setSaving(true);
    const res = await fetch(`/api/memberships/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    if (res.ok) {
      const updated: Membership = await res.json();
      setMemberships((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    }
    setSaving(false);
    setEditing(null);
    setEditState(null);
  };

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
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MembershipStatus | "all")} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
          {(["all", "active", "expired", "pending", "cancelled"] as const).map((v) => (
            <option key={v} value={v}>{v === "all" ? "Todos los estados" : STATUS_LABELS[v]}</option>
          ))}
        </select>
        <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value as MembershipPlan | "all")} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
          {(["all", "mensual", "trimestral", "semestral", "anual"] as const).map((v) => (
            <option key={v} value={v}>{v === "all" ? "Todos los planes" : PLAN_LABELS[v]}</option>
          ))}
        </select>
      </div>

      <p className="text-zinc-600 text-xs mb-4">
        {loading ? "Cargando..." : `${filtered.length} membresía${filtered.length !== 1 ? "s" : ""} — ${groups.length} usuario${groups.length !== 1 ? "s" : ""}`}
      </p>

      {/* Grouped list */}
      {loading ? (
        <div className="text-center py-24 text-zinc-600">Cargando membresías...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-24 text-zinc-600">No se encontraron membresías</div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.studentId}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                  {initials(group.studentName)}
                </div>
                <span className="text-white font-semibold text-sm">{group.studentName}</span>
                <span className="text-xs text-zinc-600">{group.studentEmail}</span>
                {group.memberships.length > 1 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                    {group.memberships.length} servicios
                  </span>
                )}
                <Link href={`/profile?userId=${group.studentId}`} className="text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto">
                  Ver perfil →
                </Link>
              </div>

              {/* Membership cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.memberships.map((m) => {
                  const days = daysUntil(m.endDate);
                  const isExpiringSoon = m.membershipStatus === "active" && days >= 0 && days <= 7;
                  return (
                    <div
                      key={m.id}
                      className={`bg-zinc-900 border rounded-xl p-5 transition-colors ${isExpiringSoon ? "border-yellow-500/30" : "border-zinc-800"}`}
                    >
                      {/* Plan + status */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLAN_COLORS[m.plan]}`}>
                          {PLAN_LABELS[m.plan]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[m.membershipStatus]}`}>
                          {STATUS_LABELS[m.membershipStatus]}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Monto</span>
                          <span className="text-white font-semibold">${m.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Pago</span>
                          <span className={`font-medium ${PAYMENT_COLORS[m.paymentStatus]}`}>{PAYMENT_LABELS[m.paymentStatus]}</span>
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
                        <p className="text-yellow-400 text-xs font-medium mb-3">
                          ⚠ Vence en {days === 0 ? "hoy" : `${days} día${days !== 1 ? "s" : ""}`}
                        </p>
                      )}
                      {m.membershipStatus === "expired" && (
                        <p className="text-red-400 text-xs font-medium mb-3">
                          Venció hace {Math.abs(days)} día{Math.abs(days) !== 1 ? "s" : ""}
                        </p>
                      )}

                      {/* Progress bar for active */}
                      {m.membershipStatus === "active" && days > 0 && (() => {
                        const start = new Date(m.startDate);
                        const end = new Date(m.endDate);
                        const tot = Math.round((end.getTime() - start.getTime()) / 86400000);
                        const pct = Math.max(0, Math.min((days / tot) * 100, 100));
                        return (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-zinc-500">Vigencia</span>
                              <span className={isExpiringSoon ? "text-yellow-400 font-medium" : "text-zinc-400"}>{days}d restantes</span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full ${isExpiringSoon ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}

                      {/* Edit button */}
                      <button
                        onClick={() => openEdit(m)}
                        className="w-full text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Editar membresía
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────────── */}
      {editing && editState && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">{editing.studentName}</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">Editar membresía #{editing.id}</p>
                </div>
                <button onClick={() => setEditing(null)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Plan</label>
                    <select value={editState.plan} onChange={(e) => setEditState({ ...editState, plan: e.target.value as MembershipPlan })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      {(["mensual", "trimestral", "semestral", "anual"] as const).map((v) => <option key={v} value={v}>{PLAN_LABELS[v]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Monto ($)</label>
                    <input type="number" value={editState.amount} onChange={(e) => setEditState({ ...editState, amount: Number(e.target.value) })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Estado membresía</label>
                    <select value={editState.membershipStatus} onChange={(e) => setEditState({ ...editState, membershipStatus: e.target.value as MembershipStatus })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      {(["active", "expired", "pending", "cancelled"] as const).map((v) => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Estado pago</label>
                    <select value={editState.paymentStatus} onChange={(e) => setEditState({ ...editState, paymentStatus: e.target.value as PaymentStatus })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      {(["paid", "pending", "overdue"] as const).map((v) => <option key={v} value={v}>{PAYMENT_LABELS[v]}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Fecha inicio</label>
                    <input type="date" value={editState.startDate} onChange={(e) => setEditState({ ...editState, startDate: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Fecha fin</label>
                    <input type="date" value={editState.endDate} onChange={(e) => setEditState({ ...editState, endDate: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
