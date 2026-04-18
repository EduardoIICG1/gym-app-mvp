"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search } from "lucide-react";
import {
  Membership, MembershipStatus, MembershipPlan, PaymentStatus, ServiceType, Member,
} from "@/lib/types";
import { ServiceBadge, MembershipBadge, PaymentBadge } from "@/components/Badge";

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa", expired: "Vencida", cancelled: "Cancelada", pending: "Pendiente",
};
const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado", pending: "Pendiente", overdue: "Vencido",
};
const PLAN_LABELS: Record<MembershipPlan, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};
const PLAN_DAYS: Record<MembershipPlan, number> = {
  mensual: 30, trimestral: 90, semestral: 180, anual: 365,
};
const SERVICE_LABELS: Record<ServiceType, string> = {
  group: "Grupal", personal_training: "Personal", kinesiology: "Kinesio", blocked_time: "Bloqueado",
};
const ALL_SERVICES: ServiceType[] = ["group", "personal_training", "kinesiology"];

function formatDate(s: string) { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; }
function daysUntil(s: string) {
  const target = new Date(s); const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function addDays(date: string, days: number): string {
  const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}

interface Group { studentId: string; studentName: string; studentEmail: string; memberships: Membership[]; }
interface EditState {
  plan: MembershipPlan; membershipStatus: MembershipStatus; paymentStatus: PaymentStatus;
  amount: number; startDate: string; endDate: string;
}
interface AddServiceForm {
  studentId: string; serviceType: ServiceType; plan: MembershipPlan;
  membershipStatus: MembershipStatus; paymentStatus: PaymentStatus;
  amount: string; startDate: string; endDate: string; coachId: string; notes: string;
}

const defaultAddService = (studentId = ""): AddServiceForm => ({
  studentId, serviceType: "group", plan: "mensual",
  membershipStatus: "active", paymentStatus: "pending",
  amount: "1200", startDate: todayStr(), endDate: addDays(todayStr(), 30),
  coachId: "", notes: "",
});

const inputCls = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/40";
const inputStyle = { background: "var(--card-border)", border: "1px solid var(--card-border)", color: "var(--text-primary)" };

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<MembershipStatus | "all">("all");
  const [filterPlan, setFilterPlan] = useState<MembershipPlan | "all">("all");
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<Membership | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const [showAddService, setShowAddService] = useState(false);
  const [addServiceForm, setAddServiceForm] = useState<AddServiceForm>(defaultAddService());
  const [addingService, setAddingService] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const coaches = allMembers.filter((m) => m.role === "coach");
  const memberOptions = allMembers.filter((m) => m.role !== "coach");

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterPlan !== "all") params.set("plan", filterPlan);
    const res = await fetch(`/api/memberships?${params}`);
    setMemberships(await res.json());
    setLoading(false);
  }, [filterStatus, filterPlan]);

  useEffect(() => { fetchMemberships(); }, [fetchMemberships]);
  useEffect(() => { fetch("/api/members").then((r) => r.json()).then(setAllMembers); }, []);

  const filtered = memberships.filter((m) =>
    search === "" || m.studentName.toLowerCase().includes(search.toLowerCase()) || m.studentEmail.toLowerCase().includes(search.toLowerCase())
  );

  const groups: Group[] = filtered.reduce((acc: Group[], m) => {
    const existing = acc.find((g) => g.studentId === m.studentId);
    if (existing) existing.memberships.push(m);
    else acc.push({ studentId: m.studentId, studentName: m.studentName, studentEmail: m.studentEmail, memberships: [m] });
    return acc;
  }, []);

  const total = memberships.length;
  const active = memberships.filter((m) => m.membershipStatus === "active").length;
  const expiringSoon = memberships.filter((m) => { if (m.membershipStatus !== "active") return false; const d = daysUntil(m.endDate); return d >= 0 && d <= 7; }).length;
  const totalRevenue = memberships.filter((m) => m.paymentStatus === "paid").reduce((s, m) => s + m.amount, 0);

  const kpis = [
    { label: "Total Membresías", value: total, sub: "registradas", accent: "#4fc3f7" },
    { label: "Activas", value: active, sub: `de ${total} membresías`, accent: "#22c55e" },
    { label: "Por Vencer", value: expiringSoon, sub: "próximos 7 días", accent: "#f59e0b" },
    { label: "Ingresos", value: `$${totalRevenue.toLocaleString()}`, sub: "membresías pagadas", accent: "#22c55e" },
  ];

  const openEdit = (m: Membership) => {
    setEditing(m);
    setEditState({ plan: m.plan, membershipStatus: m.membershipStatus, paymentStatus: m.paymentStatus, amount: m.amount, startDate: m.startDate, endDate: m.endDate });
  };
  const handleSave = async () => {
    if (!editing || !editState) return;
    setSaving(true);
    const res = await fetch(`/api/memberships/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editState),
    });
    if (res.ok) { const updated: Membership = await res.json(); setMemberships((prev) => prev.map((m) => m.id === updated.id ? updated : m)); showToast("Membresía actualizada"); }
    else { showToast("Error al actualizar", false); }
    setSaving(false); setEditing(null); setEditState(null);
  };

  const openAddServiceForGroup = (studentId: string) => { setAddServiceForm(defaultAddService(studentId)); setShowAddService(true); };
  const openAddServiceGeneral = () => { setAddServiceForm(defaultAddService("")); setShowAddService(true); };
  const handleAddService = async () => {
    if (!addServiceForm.studentId) { showToast("Selecciona un miembro", false); return; }
    setAddingService(true);
    const coachObj = addServiceForm.coachId ? coaches.find((c) => c.id === addServiceForm.coachId) : null;
    const body = { ...addServiceForm, amount: Number(addServiceForm.amount), ...(coachObj && { coachId: coachObj.id, coachName: coachObj.name }) };
    const res = await fetch("/api/memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setAddingService(false);
    if (res.ok) { setShowAddService(false); showToast("Servicio agregado correctamente"); await fetchMemberships(); }
    else { const err = await res.json(); showToast(err.error || "Error al agregar servicio", false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Membresías</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Gestiona planes, pagos y servicios contratados</p>
        </div>
        <button
          onClick={openAddServiceGeneral}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
        >
          <Plus className="w-4 h-4" />
          Añadir servicio
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {kpis.map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          <input type="text" placeholder="Buscar por nombre o email..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MembershipStatus | "all")}
          className="rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
          {(["all", "active", "expired", "pending", "cancelled"] as const).map((v) => (
            <option key={v} value={v}>{v === "all" ? "Todos los estados" : STATUS_LABELS[v]}</option>
          ))}
        </select>
        <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value as MembershipPlan | "all")}
          className="rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
          {(["all", "mensual", "trimestral", "semestral", "anual"] as const).map((v) => (
            <option key={v} value={v}>{v === "all" ? "Todos los planes" : PLAN_LABELS[v]}</option>
          ))}
        </select>
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
        {loading ? "Cargando..." : `${filtered.length} membresía${filtered.length !== 1 ? "s" : ""} — ${groups.length} usuario${groups.length !== 1 ? "s" : ""}`}
      </p>

      {/* Grouped list */}
      {loading ? (
        <div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>Cargando membresías...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>No se encontraron membresías</div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <motion.div
              key={group.studentId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {/* Group header */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
                >
                  {initials(group.studentName)}
                </div>
                <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{group.studentName}</span>
                <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>{group.studentEmail}</span>
                {group.memberships.length > 1 && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    {group.memberships.length} servicios
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => openAddServiceForGroup(group.studentId)}
                    className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80 font-medium"
                    style={{ background: "#22c55e10", color: "#22c55e", border: "1px solid #22c55e20" }}
                  >
                    + Añadir servicio
                  </button>
                  <Link href={`/profile?userId=${group.studentId}`}
                    className="text-xs transition-colors hover:opacity-80"
                    style={{ color: "#4fc3f7" }}>
                    Ver perfil →
                  </Link>
                </div>
              </div>

              {/* Membership cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.memberships.map((m) => {
                  const days = daysUntil(m.endDate);
                  const isExpiringSoon = m.membershipStatus === "active" && days >= 0 && days <= 7;
                  const start = new Date(m.startDate);
                  const end = new Date(m.endDate);
                  const tot = Math.round((end.getTime() - start.getTime()) / 86400000);
                  const pct = tot > 0 ? Math.max(0, Math.min((days / tot) * 100, 100)) : 0;

                  return (
                    <div
                      key={m.id}
                      className="rounded-xl p-5 border transition-colors"
                      style={{
                        background: "var(--card)",
                        borderColor: isExpiringSoon ? "#f59e0b50" : "var(--card-border)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <ServiceBadge type={m.serviceType} />
                          <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "#4fc3f715", color: "#4fc3f7" }}>
                            {PLAN_LABELS[m.plan]}
                          </span>
                        </div>
                        <MembershipBadge status={m.membershipStatus} />
                      </div>

                      <div className="space-y-1.5 text-xs mb-3">
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Monto</span>
                          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>${m.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Pago</span>
                          <PaymentBadge status={m.paymentStatus} />
                        </div>
                        {m.coachName && (
                          <div className="flex justify-between">
                            <span style={{ color: "var(--text-secondary)" }}>Profesional</span>
                            <span style={{ color: "var(--text-primary)" }}>{m.coachName}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Inicio</span>
                          <span style={{ color: "var(--text-primary)" }}>{formatDate(m.startDate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Vencimiento</span>
                          <span style={{ color: "var(--text-primary)" }}>{formatDate(m.endDate)}</span>
                        </div>
                      </div>

                      {isExpiringSoon && (
                        <p className="text-xs font-medium mb-3" style={{ color: "#f59e0b" }}>
                          ⚠ Vence en {days === 0 ? "hoy" : `${days} día${days !== 1 ? "s" : ""}`}
                        </p>
                      )}
                      {m.membershipStatus === "expired" && (
                        <p className="text-xs font-medium mb-3" style={{ color: "#ef4444" }}>
                          Venció hace {Math.abs(days)} día{Math.abs(days) !== 1 ? "s" : ""}
                        </p>
                      )}

                      {m.membershipStatus === "active" && days > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: "var(--text-secondary)" }}>Vigencia</span>
                            <span style={{ color: isExpiringSoon ? "#f59e0b" : "var(--text-secondary)" }}>{days}d restantes</span>
                          </div>
                          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "var(--card-border)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: isExpiringSoon ? "#f59e0b" : "#22c55e" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      )}

                      {m.notes && <p className="text-xs mb-3 italic" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{m.notes}</p>}

                      <button
                        onClick={() => openEdit(m)}
                        className="w-full text-xs py-1.5 rounded-lg transition-colors hover:bg-white/5 font-medium"
                        style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                      >
                        Editar membresía
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      <AnimatePresence>
        {showAddService && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowAddService(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Añadir Servicio</h2>
                  <button onClick={() => setShowAddService(false)} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Miembro *</label>
                    <select value={addServiceForm.studentId}
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, studentId: e.target.value }))}
                      className={inputCls} style={inputStyle}>
                      <option value="">Seleccionar miembro...</option>
                      {memberOptions.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>Tipo de servicio</label>
                    <div className="flex gap-2 flex-wrap">
                      {ALL_SERVICES.map((svc) => (
                        <button key={svc} type="button"
                          onClick={() => setAddServiceForm((f) => ({ ...f, serviceType: svc }))}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                          style={addServiceForm.serviceType === svc
                            ? { background: "#4fc3f720", borderColor: "#4fc3f750", color: "#4fc3f7" }
                            : { background: "var(--card-border)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                          {SERVICE_LABELS[svc]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Plan</label>
                      <select value={addServiceForm.plan}
                        onChange={(e) => { const plan = e.target.value as MembershipPlan; setAddServiceForm((f) => ({ ...f, plan, endDate: addDays(f.startDate || todayStr(), PLAN_DAYS[plan]) })); }}
                        className={inputCls} style={inputStyle}>
                        {(["mensual", "trimestral", "semestral", "anual"] as const).map((v) => <option key={v} value={v}>{PLAN_LABELS[v]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Monto ($)</label>
                      <input type="number" value={addServiceForm.amount}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, amount: e.target.value }))}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado membresía</label>
                      <select value={addServiceForm.membershipStatus}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, membershipStatus: e.target.value as MembershipStatus }))}
                        className={inputCls} style={inputStyle}>
                        {(["active", "pending", "expired", "cancelled"] as const).map((v) => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado pago</label>
                      <select value={addServiceForm.paymentStatus}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
                        className={inputCls} style={inputStyle}>
                        {(["paid", "pending", "overdue"] as const).map((v) => <option key={v} value={v}>{PAYMENT_LABELS[v]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Fecha inicio</label>
                      <input type="date" value={addServiceForm.startDate}
                        onChange={(e) => { const startDate = e.target.value; setAddServiceForm((f) => ({ ...f, startDate, endDate: addDays(startDate, PLAN_DAYS[f.plan]) })); }}
                        className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Fecha fin</label>
                      <input type="date" value={addServiceForm.endDate}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, endDate: e.target.value }))}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  {(addServiceForm.serviceType === "personal_training" || addServiceForm.serviceType === "kinesiology") && (
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Coach / Profesional</label>
                      <select value={addServiceForm.coachId}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, coachId: e.target.value }))}
                        className={inputCls} style={inputStyle}>
                        <option value="">Sin asignar</option>
                        {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Notas (opcional)</label>
                    <textarea value={addServiceForm.notes} rows={2} placeholder="Observaciones del servicio..."
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, notes: e.target.value }))}
                      className={`${inputCls} resize-none`} style={inputStyle} />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowAddService(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    Cancelar
                  </button>
                  <button onClick={handleAddService} disabled={addingService}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}>
                    {addingService ? "Guardando..." : "Agregar servicio"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && editState && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-2xl border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>{editing.studentName}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ServiceBadge type={editing.serviceType} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>#{editing.id}</span>
                    </div>
                  </div>
                  <button onClick={() => setEditing(null)} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Plan</label>
                      <select value={editState.plan}
                        onChange={(e) => setEditState({ ...editState, plan: e.target.value as MembershipPlan })}
                        className={inputCls} style={inputStyle}>
                        {(["mensual", "trimestral", "semestral", "anual"] as const).map((v) => <option key={v} value={v}>{PLAN_LABELS[v]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Monto ($)</label>
                      <input type="number" value={editState.amount}
                        onChange={(e) => setEditState({ ...editState, amount: Number(e.target.value) })}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado membresía</label>
                      <select value={editState.membershipStatus}
                        onChange={(e) => setEditState({ ...editState, membershipStatus: e.target.value as MembershipStatus })}
                        className={inputCls} style={inputStyle}>
                        {(["active", "expired", "pending", "cancelled"] as const).map((v) => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado pago</label>
                      <select value={editState.paymentStatus}
                        onChange={(e) => setEditState({ ...editState, paymentStatus: e.target.value as PaymentStatus })}
                        className={inputCls} style={inputStyle}>
                        {(["paid", "pending", "overdue"] as const).map((v) => <option key={v} value={v}>{PAYMENT_LABELS[v]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Fecha inicio</label>
                      <input type="date" value={editState.startDate}
                        onChange={(e) => setEditState({ ...editState, startDate: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Fecha fin</label>
                      <input type="date" value={editState.endDate}
                        onChange={(e) => setEditState({ ...editState, endDate: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setEditing(null)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    Cancelar
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}>
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold z-50 shadow-2xl"
            style={toast.ok ? { background: "#22c55e", color: "#fff" } : { background: "#ef4444", color: "#fff" }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
