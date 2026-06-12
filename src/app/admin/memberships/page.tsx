"use client";

import { useState, useEffect, useCallback } from "react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, Pencil } from "lucide-react";
import {
  Membership, MembershipStatus, MembershipPlan, PaymentStatus, ServiceType, Member, GrantType,
} from "@/lib/types";
import { ServiceBadge, MembershipBadge, PaymentBadge } from "@/components/Badge";
import { GestionTabs } from "@/components/GestionTabs";
import {
  SERVICE_LABELS,
  MEMBERSHIP_STATUS_LABELS as STATUS_LABELS,
  PAYMENT_STATUS_LABELS as PAYMENT_LABELS,
  GRANT_TYPE_LABELS,
} from "@/lib/labels";

// ─── Constants ─────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<MembershipPlan, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};
const PLAN_DAYS: Record<MembershipPlan, number> = {
  mensual: 30, trimestral: 90, semestral: 180, anual: 365,
};
const ALL_SERVICES: ServiceType[] = ["group", "personal_training", "kinesiology"];

const NON_COMMERCIAL = new Set<GrantType>(["gift", "compensation", "trial"]);

const GRANT_BADGE: Record<string, { bg: string; color: string }> = {
  renewal:      { bg: "#4fc3f715", color: "#4fc3f7"  },
  reactivation: { bg: "#4fc3f715", color: "#4fc3f7"  },
  gift:         { bg: "#a78bfa15", color: "#a78bfa"  },
  compensation: { bg: "#f59e0b15", color: "#f59e0b"  },
  trial:        { bg: "#22c55e15", color: "#22c55e"  },
};

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

// Returns true if membership `a` is more recent than `b` for the same member+service.
// endDate === "" means no end date (unlimited) → treated as "infinite future" → always more recent.
function isMoreRecent(a: Membership, b: Membership): boolean {
  const aNoEnd = a.endDate === "";
  const bNoEnd = b.endDate === "";
  if (aNoEnd && bNoEnd) return a.startDate > b.startDate;
  if (aNoEnd) return true;
  if (bNoEnd) return false;
  if (a.endDate !== b.endDate) return a.endDate > b.endDate;
  return a.startDate > b.startDate; // tiebreak by start date
}

function computeRenewDates(m: Membership): { startDate: string; endDate: string } {
  const today = todayStr();
  const newStart = m.endDate && m.endDate >= today ? addDays(m.endDate, 1) : today;
  const durationDays =
    m.startDate && m.endDate
      ? Math.max(Math.round((new Date(m.endDate).getTime() - new Date(m.startDate).getTime()) / 86400000), 1)
      : 30;
  return { startDate: newStart, endDate: addDays(newStart, durationDays) };
}

function computeFromTodayDates(m: Membership): { startDate: string; endDate: string } {
  const today = todayStr();
  const durationDays =
    m.startDate && m.endDate
      ? Math.max(Math.round((new Date(m.endDate).getTime() - new Date(m.startDate).getTime()) / 86400000), 1)
      : 30;
  return { startDate: today, endDate: addDays(today, durationDays) };
}

function defaultRenewMode(m: Membership): "next_cycle" | "from_today" {
  if (m.membershipStatus !== "active") return "from_today";
  if (m.totalSessions != null && (m.usedSessions ?? 0) >= m.totalSessions) return "from_today";
  return "next_cycle";
}

interface RenewState {
  planName: string; totalSessions: string;
  startDate: string; endDate: string;
  amount: string; paymentStatus: PaymentStatus;
  renewMode: "next_cycle" | "from_today";
}

interface Group { studentId: string; studentName: string; studentEmail: string; memberships: Membership[]; }
interface EditState {
  plan: MembershipPlan; membershipStatus: MembershipStatus; paymentStatus: PaymentStatus;
  amount: number; startDate: string; endDate: string; totalSessions: number | null;
}
interface AddServiceForm {
  studentId: string; serviceType: ServiceType; plan: MembershipPlan;
  membershipStatus: MembershipStatus; paymentStatus: PaymentStatus;
  amount: string; startDate: string; endDate: string; coachId: string; notes: string;
  totalSessions: string;
  grantType: GrantType; grantReason: string;
}

const defaultAddService = (studentId = "", serviceType: ServiceType = "group"): AddServiceForm => ({
  studentId, serviceType, plan: "mensual",
  membershipStatus: "active", paymentStatus: "pending",
  amount: "1200", startDate: todayStr(), endDate: addDays(todayStr(), 30),
  coachId: "", notes: "", totalSessions: "",
  grantType: "purchased", grantReason: "",
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

  const activeUser = useCurrentUser();
  const [renewSource, setRenewSource] = useState<Membership | null>(null);
  const [renewState,  setRenewState]  = useState<RenewState | null>(null);
  const [renewing,    setRenewing]    = useState(false);
  const [renewError,  setRenewError]  = useState<string | null>(null);

  const coaches = allMembers.filter((m) => m.roles.includes("coach") || m.roles.includes("kinesiologist"));
  const memberOptions = allMembers.filter((m) => !m.roles.includes("coach") && !m.roles.includes("kinesiologist"));

  // Domain separation: COACH manages GROUP/PT, KINESIOLOGIST manages KINESIOLOGY only
  const availableServices: ServiceType[] =
    activeUser.role === "kinesiologist" ? ["kinesiology"] :
    activeUser.role === "coach"         ? ["group", "personal_training"] :
    ALL_SERVICES;
  const defaultServiceType: ServiceType = availableServices[0];

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

  // One Renovar button per (studentId, serviceType) — only the most recent membership.
  const renewableIds: Set<string> = (() => {
    const latest = new Map<string, Membership>();
    for (const m of memberships) {
      const key = `${m.studentId}:${m.serviceType}`;
      const prev = latest.get(key);
      if (!prev || isMoreRecent(m, prev)) latest.set(key, m);
    }
    return new Set(Array.from(latest.values()).map(m => m.id));
  })();

  const showOverlapWarning =
    renewSource !== null &&
    renewState?.renewMode === "from_today" &&
    renewSource.membershipStatus === "active" &&
    renewSource.endDate !== "" &&
    renewSource.endDate >= todayStr();

  const total = memberships.length;
  const active = memberships.filter((m) => m.membershipStatus === "active").length;
  const expiringSoon = memberships.filter((m) => { if (m.membershipStatus !== "active") return false; const d = daysUntil(m.endDate); return d >= 0 && d <= 7; }).length;
  const totalRevenue = memberships
    .filter((m) => m.paymentStatus === "paid" && !NON_COMMERCIAL.has(m.grantType ?? "purchased"))
    .reduce((s, m) => s + m.amount, 0);

  const kpis = [
    { label: "Total Membresías", value: total, sub: "registradas", accent: "#4fc3f7" },
    { label: "Activas", value: active, sub: `de ${total} membresías`, accent: "#22c55e" },
    { label: "Por Vencer", value: expiringSoon, sub: "próximos 7 días", accent: "#f59e0b" },
    { label: "Ingresos", value: `$${totalRevenue.toLocaleString()}`, sub: "membresías pagadas", accent: "#22c55e" },
  ];

  const openEdit = (m: Membership) => {
    setEditing(m);
    setEditState({ plan: m.plan, membershipStatus: m.membershipStatus, paymentStatus: m.paymentStatus, amount: m.amount, startDate: m.startDate, endDate: m.endDate, totalSessions: m.totalSessions ?? null });
  };
  const handleSave = async () => {
    if (!editing || !editState) return;
    if (editState.totalSessions === 0) {
      showToast("El número de sesiones debe ser al menos 1. Deja el campo vacío para acceso ilimitado.", false);
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/memberships/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editState),
    });
    if (res.ok) { const updated: Membership = await res.json(); setMemberships((prev) => prev.map((m) => m.id === updated.id ? updated : m)); showToast("Membresía actualizada"); }
    else { showToast("Error al actualizar", false); }
    setSaving(false); setEditing(null); setEditState(null);
  };

  const openRenew = (m: Membership) => {
    const mode = defaultRenewMode(m);
    const { startDate, endDate } = mode === "from_today" ? computeFromTodayDates(m) : computeRenewDates(m);
    setRenewSource(m);
    setRenewState({
      planName:      m.plan,
      totalSessions: m.totalSessions != null ? String(m.totalSessions) : "",
      startDate,
      endDate,
      amount:        String(m.amount),
      paymentStatus: "pending",
      renewMode:     mode,
    });
    setRenewError(null);
  };

  const handleRenewModeChange = (mode: "next_cycle" | "from_today") => {
    if (!renewSource || !renewState) return;
    const { startDate, endDate } = mode === "from_today"
      ? computeFromTodayDates(renewSource)
      : computeRenewDates(renewSource);
    setRenewState({ ...renewState, renewMode: mode, startDate, endDate });
  };

  const handleRenew = async () => {
    if (!renewSource || !renewState || renewing) return;
    if (renewState.totalSessions !== "" && Number(renewState.totalSessions) === 0) {
      setRenewError("El número de sesiones debe ser al menos 1. Deja el campo vacío para acceso ilimitado.");
      return;
    }
    setRenewing(true);
    setRenewError(null);
    const isAdmin = activeUser.role === "admin";
    const renewGrantType = renewState.renewMode === "from_today" ? "reactivation" : "renewal";
    const body: Record<string, unknown> = {
      planName:      renewState.planName,
      totalSessions: renewState.totalSessions !== "" ? Number(renewState.totalSessions) : null,
      startDate:     renewState.startDate,
      endDate:       renewState.endDate,
      grantType:     renewGrantType,
      ...(isAdmin && {
        amount:        Number(renewState.amount),
        paymentStatus: renewState.paymentStatus,
      }),
    };
    const res = await fetch(`/api/memberships/${renewSource.id}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const created: Membership = await res.json();
      setMemberships(prev => [created, ...prev]);
      setRenewSource(null);
      setRenewState(null);
      showToast("Membresía renovada correctamente");
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      const msg =
        res.status === 403 ? (data.error ?? "No tienes permiso para renovar esta membresía.") :
        res.status === 409 ? "Ya existe una membresía activa para este servicio en el período seleccionado." :
        res.status === 404 ? "La membresía original ya no existe." :
        (data.error ?? "No se pudo renovar la membresía. Intenta nuevamente.");
      setRenewError(msg);
    }
    setRenewing(false);
  };

  const openAddServiceForGroup = (studentId: string) => { setAddServiceForm(defaultAddService(studentId, defaultServiceType)); setShowAddService(true); };
  const openAddServiceGeneral = () => { setAddServiceForm(defaultAddService("", defaultServiceType)); setShowAddService(true); };
  const handleAddService = async () => {
    if (!addServiceForm.studentId) { showToast("Selecciona un miembro", false); return; }
    if (addServiceForm.totalSessions !== "" && Number(addServiceForm.totalSessions) === 0) {
      showToast("El número de sesiones debe ser al menos 1. Deja el campo vacío para acceso ilimitado.", false);
      return;
    }
    setAddingService(true);
    const coachObj = addServiceForm.coachId ? coaches.find((c) => c.id === addServiceForm.coachId) : null;
    const isNonCommercialAdd = NON_COMMERCIAL.has(addServiceForm.grantType);
    const body = {
      ...addServiceForm,
      amount: isNonCommercialAdd ? 0 : Number(addServiceForm.amount),
      paymentStatus: isNonCommercialAdd ? "waived" : addServiceForm.paymentStatus,
      totalSessions: addServiceForm.totalSessions !== "" ? Number(addServiceForm.totalSessions) : null,
      grantReason: addServiceForm.grantReason.trim() || undefined,
      ...(coachObj && { coachId: coachObj.id, coachName: coachObj.name }),
    };
    const res = await fetch("/api/memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setAddingService(false);
    if (res.ok) { setShowAddService(false); showToast("Servicio agregado correctamente"); await fetchMemberships(); }
    else { const err = await res.json(); showToast(err.error || "Error al agregar servicio", false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
      {/* Mobile Gestión tabs (Miembros / Membresías) */}
      <GestionTabs />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Membresías</h1>
          <p className="text-xs sm:text-sm mt-0.5 hidden sm:block" style={{ color: "var(--text-secondary)" }}>Gestiona planes, pagos y servicios contratados</p>
        </div>
        <button
          onClick={openAddServiceGeneral}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 shrink-0"
          style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Añadir servicio</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-8">
        {kpis.map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl p-3 sm:p-4 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <p className="text-[11px] sm:text-xs mb-1 truncate" style={{ color: "var(--text-secondary)" }}>{label}</p>
            <p className="text-xl sm:text-2xl font-bold" style={{ color: accent }}>{value}</p>
            <p className="text-[11px] sm:text-xs mt-0.5 truncate" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{sub}</p>
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
              {/* Group header — mobile: nombre prioritario + servicios como metadata secundaria */}
              <div className="sm:hidden flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
                >
                  {initials(group.studentName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{group.studentName}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                    {group.memberships.length} servicio{group.memberships.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openAddServiceForGroup(group.studentId)}
                    className="p-2 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: "#22c55e10", color: "#22c55e", border: "1px solid #22c55e20" }}
                    title="Añadir servicio"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <Link href={`/profile?userId=${group.studentId}`}
                    className="text-xs px-2.5 py-2 rounded-lg transition-colors hover:bg-white/5 font-medium"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    Perfil
                  </Link>
                </div>
              </div>

              {/* Group header — desktop */}
              <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                  style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
                >
                  {initials(group.studentName)}
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-initial">
                  <span className="font-semibold text-sm truncate min-w-0" style={{ color: "var(--text-primary)" }}>{group.studentName}</span>
                  <span className="text-xs truncate min-w-0" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>{group.studentEmail}</span>
                </div>
                {group.memberships.length > 1 && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    {group.memberships.length} servicios
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openAddServiceForGroup(group.studentId)}
                    className="text-xs px-3 py-1 rounded-lg transition-opacity hover:opacity-80 font-medium"
                    style={{ background: "#22c55e10", color: "#22c55e", border: "1px solid #22c55e20" }}
                    title="Añadir servicio"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                      onClick={() => openEdit(m)}
                      className="rounded-xl p-4 border transition-colors cursor-pointer hover:border-[var(--text-secondary)] active:bg-white/[0.02]"
                      style={{
                        background: "var(--card)",
                        borderColor: isExpiringSoon ? "#f59e0b50" : "var(--card-border)",
                      }}
                    >
                      {/* Desktop: header servicio+plan+estado + detalle completo */}
                      <div className="hidden sm:block">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <ServiceBadge type={m.serviceType} />
                            <span className="text-xs font-medium truncate" style={{ color: "var(--text-secondary)" }}>
                              {PLAN_LABELS[m.plan]}
                            </span>
                            {m.grantType && m.grantType !== "purchased" && GRANT_BADGE[m.grantType] && (
                              <span className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                                style={{ background: GRANT_BADGE[m.grantType].bg, color: GRANT_BADGE[m.grantType].color }}>
                                {GRANT_TYPE_LABELS[m.grantType] ?? m.grantType}
                              </span>
                            )}
                          </div>
                          <MembershipBadge status={m.membershipStatus} />
                        </div>

                        <div className="space-y-2 text-xs mb-3">
                          {/* Vigencia */}
                          <div>
                            <div className="flex justify-between items-center gap-2">
                              <span style={{ color: "var(--text-primary)" }}>{formatDate(m.startDate)} – {formatDate(m.endDate)}</span>
                              {m.membershipStatus === "active" && days >= 0 && (
                                <span className="font-medium shrink-0" style={{ color: isExpiringSoon ? "#f59e0b" : "var(--text-secondary)" }}>
                                  {days === 0 ? "Vence hoy" : `${days}d restantes`}
                                </span>
                              )}
                              {m.membershipStatus === "expired" && (
                                <span className="font-medium shrink-0" style={{ color: "#ef4444" }}>
                                  Venció hace {Math.abs(days)}d
                                </span>
                              )}
                            </div>
                            {m.membershipStatus === "active" && days > 0 && (
                              <div className="w-full rounded-full h-1.5 overflow-hidden mt-1.5" style={{ background: "var(--card-border)" }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: isExpiringSoon ? "#f59e0b" : "#22c55e" }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.6, ease: "easeOut" }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Sesiones */}
                          {m.totalSessions != null && (
                            <div className="flex justify-between">
                              <span style={{ color: "var(--text-secondary)" }}>Sesiones</span>
                              <span style={{ color: (m.usedSessions ?? 0) >= m.totalSessions ? "#ef4444" : "var(--text-primary)" }}>
                                {m.usedSessions ?? 0} / {m.totalSessions} usadas
                              </span>
                            </div>
                          )}

                          {/* Pago */}
                          <div className="flex justify-between items-center">
                            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>${m.amount.toLocaleString()}</span>
                            <PaymentBadge status={m.paymentStatus} />
                          </div>

                          {m.coachName && (
                            <div className="flex justify-between">
                              <span style={{ color: "var(--text-secondary)" }}>Profesional</span>
                              <span className="truncate ml-2" style={{ color: "var(--text-primary)" }}>{m.coachName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mobile: jerarquía compacta — servicio/estado → vigencia → sesiones → pago */}
                      <div className="sm:hidden space-y-1.5 mb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <ServiceBadge type={m.serviceType} />
                            {m.grantType && m.grantType !== "purchased" && GRANT_BADGE[m.grantType] && (
                              <span className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                                style={{ background: GRANT_BADGE[m.grantType].bg, color: GRANT_BADGE[m.grantType].color }}>
                                {GRANT_TYPE_LABELS[m.grantType] ?? m.grantType}
                              </span>
                            )}
                          </div>
                          <MembershipBadge status={m.membershipStatus} />
                        </div>

                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {formatDate(m.startDate)}–{formatDate(m.endDate)}
                          {m.membershipStatus === "active" && days >= 0 && (
                            <span className="font-medium" style={{ color: isExpiringSoon ? "#f59e0b" : "var(--text-secondary)" }}>
                              {" · "}{days === 0 ? "Vence hoy" : `${days}d restantes`}
                            </span>
                          )}
                          {m.membershipStatus === "expired" && (
                            <span className="font-medium" style={{ color: "#ef4444" }}>
                              {" · "}Venció hace {Math.abs(days)}d
                            </span>
                          )}
                        </p>

                        {m.totalSessions != null && (
                          <p className="text-xs" style={{ color: (m.usedSessions ?? 0) >= m.totalSessions ? "#ef4444" : "var(--text-secondary)" }}>
                            {m.usedSessions ?? 0}/{m.totalSessions} usadas
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>${m.amount.toLocaleString()}</span>
                          <PaymentBadge status={m.paymentStatus} />
                        </div>
                      </div>

                      {m.notes && <p className="text-xs mb-3 italic" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{m.notes}</p>}
                      {m.grantReason && <p className="text-xs mb-3 italic" style={{ color: "var(--text-muted)" }}>Motivo: {m.grantReason}</p>}

                      {renewableIds.has(m.id) ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openRenew(m)}
                            className="flex-1 text-xs py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                            style={{ background: "#4fc3f7", color: "#0a0a0c" }}
                          >
                            ↻ Renovar
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            className="p-2 rounded-lg transition-colors hover:bg-white/5"
                            style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                          className="w-full text-xs py-1.5 rounded-lg transition-colors hover:bg-white/5 font-medium"
                          style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                        >
                          Editar
                        </button>
                      )}
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
                    {availableServices.length > 1 ? (
                      <div className="flex gap-2 flex-wrap">
                        {availableServices.map((svc) => (
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
                    ) : (
                      <div className="text-xs px-3 py-1.5 rounded-lg font-medium border inline-block"
                        style={{ background: "#4fc3f720", borderColor: "#4fc3f750", color: "#4fc3f7" }}>
                        {SERVICE_LABELS[availableServices[0]]}
                      </div>
                    )}
                  </div>
                  {/* Grant type selector */}
                  <div>
                    <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>Tipo de acceso</label>
                    <div className="flex gap-2 flex-wrap">
                      {(activeUser.role === "admin"
                        ? (["purchased", "gift", "compensation", "trial"] as GrantType[])
                        : (["purchased", "gift"] as GrantType[])
                      ).map((gt) => {
                        const selected = addServiceForm.grantType === gt;
                        const badge = GRANT_BADGE[gt];
                        return (
                          <button key={gt} type="button"
                            onClick={() => setAddServiceForm((f) => ({
                              ...f,
                              grantType: gt,
                              amount:        NON_COMMERCIAL.has(gt) ? "0" : (f.amount === "0" ? "1200" : f.amount),
                              paymentStatus: NON_COMMERCIAL.has(gt) ? "waived" : (f.paymentStatus === "waived" ? "pending" : f.paymentStatus),
                              grantReason:   NON_COMMERCIAL.has(gt) ? f.grantReason : "",
                            }))}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                            style={selected
                              ? { background: badge ? badge.bg : "#4fc3f720", borderColor: badge ? badge.color + "50" : "#4fc3f750", color: badge ? badge.color : "#4fc3f7" }
                              : { background: "var(--card-border)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                            {GRANT_TYPE_LABELS[gt] ?? gt}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Motivo — visible only for non-commercial */}
                  {NON_COMMERCIAL.has(addServiceForm.grantType) && (
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Motivo <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(recomendado)</span>
                      </label>
                      <input type="text"
                        value={addServiceForm.grantReason}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, grantReason: e.target.value }))}
                        placeholder={
                          addServiceForm.grantType === "gift"         ? "Ej: Regalía por permanencia" :
                          addServiceForm.grantType === "compensation"  ? "Ej: Compensación por clase cancelada" :
                          "Ej: Trial primera semana"
                        }
                        className={inputCls} style={inputStyle} />
                    </div>
                  )}

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
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Monto ($){NON_COMMERCIAL.has(addServiceForm.grantType) && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> — gratuito</span>}
                      </label>
                      <input type="number" value={addServiceForm.amount}
                        readOnly={NON_COMMERCIAL.has(addServiceForm.grantType)}
                        onChange={(e) => !NON_COMMERCIAL.has(addServiceForm.grantType) && setAddServiceForm((f) => ({ ...f, amount: e.target.value }))}
                        className={inputCls}
                        style={{ ...inputStyle, ...(NON_COMMERCIAL.has(addServiceForm.grantType) ? { opacity: 0.45, cursor: "default" } : {}) }} />
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
                      {NON_COMMERCIAL.has(addServiceForm.grantType) ? (
                        <input type="text" readOnly value="Exonerado"
                          className={inputCls} style={{ ...inputStyle, opacity: 0.45, cursor: "default" }} />
                      ) : (
                        <select value={addServiceForm.paymentStatus}
                          onChange={(e) => setAddServiceForm((f) => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
                          className={inputCls} style={inputStyle}>
                          {(["paid", "pending", "overdue"] as const).map((v) => <option key={v} value={v}>{PAYMENT_LABELS[v]}</option>)}
                        </select>
                      )}
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
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Sesiones totales (pack)</label>
                    <input type="number" min="1" placeholder="Dejar vacío para ilimitado"
                      value={addServiceForm.totalSessions}
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, totalSessions: e.target.value }))}
                      className={inputCls} style={inputStyle} />
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
                  {editing.grantType && editing.grantType !== "purchased" && (
                    <div className="rounded-lg px-3 py-2.5 text-xs" style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "var(--text-secondary)" }}>Tipo de acceso</span>
                        {GRANT_BADGE[editing.grantType] && (
                          <span className="px-2 py-0.5 rounded font-semibold"
                            style={{ background: GRANT_BADGE[editing.grantType].bg, color: GRANT_BADGE[editing.grantType].color }}>
                            {GRANT_TYPE_LABELS[editing.grantType] ?? editing.grantType}
                          </span>
                        )}
                      </div>
                      {editing.grantReason && (
                        <p className="mt-1 italic" style={{ color: "var(--text-muted)" }}>Motivo: {editing.grantReason}</p>
                      )}
                    </div>
                  )}
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
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        Monto ($){editing.grantType && NON_COMMERCIAL.has(editing.grantType) && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> — gratuito</span>}
                      </label>
                      <input type="number" value={editState.amount}
                        readOnly={!!(editing.grantType && NON_COMMERCIAL.has(editing.grantType))}
                        onChange={(e) => { if (!(editing.grantType && NON_COMMERCIAL.has(editing.grantType))) setEditState({ ...editState, amount: Number(e.target.value) }); }}
                        className={inputCls}
                        style={{ ...inputStyle, ...(editing.grantType && NON_COMMERCIAL.has(editing.grantType) ? { opacity: 0.45, cursor: "default" } : {}) }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Sesiones totales</label>
                      <input type="number" min="1" placeholder="Ilimitado"
                        value={editState.totalSessions ?? ""}
                        onChange={(e) => setEditState({ ...editState, totalSessions: e.target.value !== "" ? Number(e.target.value) : null })}
                        className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Sesiones usadas</label>
                      <input type="text" readOnly
                        value={editing.usedSessions ?? 0}
                        className={inputCls} style={{ ...inputStyle, opacity: 0.5, cursor: "default" }} />
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
                      {editing.grantType && NON_COMMERCIAL.has(editing.grantType) ? (
                        <input type="text" readOnly value="Exonerado"
                          className={inputCls} style={{ ...inputStyle, opacity: 0.45, cursor: "default" }} />
                      ) : (
                        <select value={editState.paymentStatus}
                          onChange={(e) => setEditState({ ...editState, paymentStatus: e.target.value as PaymentStatus })}
                          className={inputCls} style={inputStyle}>
                          {(["paid", "pending", "overdue"] as const).map((v) => <option key={v} value={v}>{PAYMENT_LABELS[v]}</option>)}
                        </select>
                      )}
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

      {/* Renew Modal */}
      <AnimatePresence>
        {renewSource && renewState && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => { setRenewSource(null); setRenewState(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-2xl border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Renovar membresía</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{renewSource.studentName}</span>
                      <span style={{ color: "var(--text-muted)" }}>·</span>
                      <ServiceBadge type={renewSource.serviceType} />
                    </div>
                  </div>
                  <button onClick={() => { setRenewSource(null); setRenewState(null); }} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
                </div>

                {/* Origin reference */}
                <div className="rounded-xl px-4 py-3 mb-4 text-xs space-y-1" style={{ background: "var(--background)", border: "1px solid var(--card-border)" }}>
                  <p className="font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Membresía origen (referencia)</p>
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-secondary)" }}>Vigencia</span>
                    <span style={{ color: "var(--text-primary)" }}>
                      {formatDate(renewSource.startDate)} → {renewSource.endDate ? formatDate(renewSource.endDate) : "Sin fecha fin"}
                    </span>
                  </div>
                  {renewSource.totalSessions != null && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-secondary)" }}>Sesiones</span>
                      <span style={{ color: "var(--text-primary)" }}>{renewSource.usedSessions ?? 0} / {renewSource.totalSessions} usadas</span>
                    </div>
                  )}
                  {(activeUser.role === "coach" || activeUser.role === "kinesiologist") && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-secondary)" }}>Monto de referencia</span>
                      <span style={{ color: "var(--text-primary)" }}>${renewSource.amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Mode selector */}
                <div className="mb-4">
                  <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>Inicio de la renovación</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["next_cycle", "from_today"] as const).map((mode) => {
                      const selected = renewState.renewMode === mode;
                      const label = mode === "next_cycle" ? "Siguiente ciclo" : "Activar desde hoy";
                      const help  = mode === "next_cycle"
                        ? "La nueva membresía comenzará cuando termine la actual."
                        : "El miembro podrá reservar desde hoy si la membresía queda activa.";
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => handleRenewModeChange(mode)}
                          className="text-left p-3 rounded-xl border transition-colors"
                          style={selected
                            ? { background: "#4fc3f715", borderColor: "#4fc3f750", color: "var(--text-primary)" }
                            : { background: "var(--background)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }
                          }
                        >
                          <p className="text-xs font-semibold mb-0.5">{label}</p>
                          <p className="text-xs" style={{ opacity: 0.7 }}>{help}</p>
                        </button>
                      );
                    })}
                  </div>
                  {showOverlapWarning && (
                    <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                      El período anterior aún no termina. Se creará una membresía activa desde hoy para reactivar el servicio.
                    </p>
                  )}
                </div>

                {/* Editable fields */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Plan / nombre</label>
                    <input type="text" value={renewState.planName}
                      onChange={(e) => setRenewState({ ...renewState, planName: e.target.value })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Sesiones totales (pack)</label>
                    <input type="number" min="1" placeholder="Dejar vacío para ilimitado"
                      value={renewState.totalSessions}
                      onChange={(e) => setRenewState({ ...renewState, totalSessions: e.target.value })}
                      className={inputCls} style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Fecha inicio</label>
                      <input type="date" value={renewState.startDate}
                        onChange={(e) => setRenewState({ ...renewState, startDate: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Fecha fin</label>
                      <input type="date" value={renewState.endDate}
                        onChange={(e) => setRenewState({ ...renewState, endDate: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>

                  {/* ADMIN only: amount + paymentStatus */}
                  {activeUser.role === "admin" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Monto ($)</label>
                        <input type="number" value={renewState.amount}
                          onChange={(e) => setRenewState({ ...renewState, amount: e.target.value })}
                          className={inputCls} style={inputStyle} />
                      </div>
                      <div>
                        <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado pago</label>
                        <select value={renewState.paymentStatus}
                          onChange={(e) => setRenewState({ ...renewState, paymentStatus: e.target.value as PaymentStatus })}
                          className={inputCls} style={inputStyle}>
                          {(["paid", "pending", "overdue"] as const).map((v) => <option key={v} value={v}>{PAYMENT_LABELS[v]}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {renewError && (
                  <p className="text-xs mt-3 font-medium" style={{ color: "#ef4444" }}>{renewError}</p>
                )}

                <div className="flex gap-3 mt-6">
                  <button onClick={() => { setRenewSource(null); setRenewState(null); }}
                    className="flex-1 py-2 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    Cancelar
                  </button>
                  <button onClick={handleRenew} disabled={renewing || !renewState.startDate || !renewState.endDate}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}>
                    {renewing ? "Renovando..." : "Crear renovación"}
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
