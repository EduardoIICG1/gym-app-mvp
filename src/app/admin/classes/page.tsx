"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { GymClass, Reservation, ServiceType, DayOfWeek, EventType, Member } from "@/lib/types";
import { ServiceBadge } from "@/components/Badge";
import { DAY_NAMES } from "@/lib/labels";
import { CreateClassModal } from "@/components/classes/CreateClassModal";

interface SeriesSession {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  coachId: string;
  coachName: string;
  status: "active" | "cancelled";
  reservedCount: number;
  capacity: number;
  hasActiveBookings: boolean;
}

interface SeriesDetail {
  programId: string;
  programName: string;
  serviceType: ServiceType;
  capacity: number;
  startTime: string;
  endTime: string;
  coachVaries: boolean;
  primaryCoachName: string;
  totalActive: number;
  totalCancelled: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  sessions: SeriesSession[];
}

interface TrimPreview {
  applied: boolean;
  programName: string;
  newEndDate: string;
  affectedCount: number;
  skippedCount: number;
  affected: { id: string; sessionDate: string }[];
  skipped: { id: string; sessionDate: string; reason: string }[];
}

const EMPTY_FORM = {
  name: "", eventType: "class" as EventType, serviceType: "group" as ServiceType,
  dayOfWeek: 0 as DayOfWeek, startTime: "", endTime: "",
  coach: "", maxCapacity: 20, note: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function getMondayOfWeek(offsetWeeks: number): Date {
  const today = new Date();
  const jsDay = today.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const d = new Date(today);
  d.setDate(today.getDate() + diffToMonday + offsetWeeks * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

function getDayNameFromISO(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  const feDay = date.getDay() === 0 ? 6 : date.getDay() - 1;
  return DAY_NAMES[feDay] ?? isoDate;
}

const MONTHS_SHORT = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

// ─── Shared input style ───────────────────────────────────────────────────
const inputCls = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/40";
const inputStyle = {
  background: "var(--card-border)",
  border: "1px solid var(--card-border)",
  color: "var(--text-primary)",
};

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("all");
  const [searchText, setSearchText] = useState("");
  const [coachFilter, setCoachFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "">("");
  const [showScopeSelector, setShowScopeSelector] = useState(false);
  const [editScope, setEditScope] = useState<"this" | "future" | null>(null);
  const [scopeTarget, setScopeTarget] = useState<GymClass | null>(null);
  const [showTrimModal, setShowTrimModal] = useState(false);
  const [trimTarget, setTrimTarget] = useState<GymClass | null>(null);
  const [trimEndDate, setTrimEndDate] = useState("");
  const [trimPreview, setTrimPreview] = useState<TrimPreview | null>(null);
  const [trimLoading, setTrimLoading] = useState(false);
  const [showSeriesModal, setShowSeriesModal] = useState(false);
  const [seriesTarget, setSeriesTarget] = useState<GymClass | null>(null);
  const [seriesDetail, setSeriesDetail] = useState<SeriesDetail | null>(null);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [returnToSeriesSource, setReturnToSeriesSource] = useState<{ id: string; name: string } | null>(null);
  const [seriesBackTarget, setSeriesBackTarget] = useState<GymClass | null>(null);
  const [showSeriesEditModal, setShowSeriesEditModal] = useState(false);
  const [seriesEditTarget, setSeriesEditTarget] = useState<GymClass | null>(null);
  const [seriesEditForm, setSeriesEditForm] = useState({ name: "", serviceType: "group" as ServiceType, maxCapacity: 20, note: "" });
  const [seriesEditSaving, setSeriesEditSaving] = useState(false);

  // ─── Week range ──────────────────────────────────────────────────────────
  const mondayDate = getMondayOfWeek(weekOffset);
  const saturdayDate = new Date(mondayDate);
  saturdayDate.setDate(mondayDate.getDate() + 5);
  const weekStartStr = toISODate(mondayDate);
  const weekLabel = `${String(mondayDate.getDate()).padStart(2, "0")} ${MONTHS_SHORT[mondayDate.getMonth()]} – ${String(saturdayDate.getDate()).padStart(2, "0")} ${MONTHS_SHORT[saturdayDate.getMonth()]} ${saturdayDate.getFullYear()}`;

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, rRes, coachRes] = await Promise.all([
      fetch(`/api/classes?weekStart=${weekStartStr}`),
      fetch("/api/reservations"),
      fetch("/api/members?includesRole=coach"),
    ]);
    setClasses(await cRes.json());
    setReservations(await rRes.json());
    const coachMembers: Member[] = await coachRes.json();
    setCoaches(coachMembers.map(m => ({ id: m.id, name: m.name })));
    setLoading(false);
  }, [weekStartStr]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── Filtered & grouped ──────────────────────────────────────────────────
  const hasActiveFilters = Boolean(searchText.trim()) || Boolean(coachFilter) || Boolean(serviceFilter) || statusFilter !== "all";

  const clearFilters = () => {
    setSearchText("");
    setCoachFilter("");
    setServiceFilter("");
    setStatusFilter("all");
  };

  const filteredClasses = classes.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (coachFilter && c.coach !== coachFilter) return false;
    if (serviceFilter && c.serviceType !== serviceFilter) return false;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.coach.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const groupedDates = Array.from(
    new Set(filteredClasses.map(c => c.sessionDate ?? ""))
  ).filter(Boolean).sort();

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const active = classes.filter((c) => c.status === "active");
  const activeClasses = active.filter((c) => c.eventType !== "blocked_time");
  const totalCapacity = activeClasses.reduce((s, c) => s + c.maxCapacity, 0);
  const totalReserved = activeClasses.reduce((s, c) => s + c.reservedCount, 0);
  const avgOccupancy = activeClasses.length > 0
    ? Math.round(activeClasses.reduce((s, c) => s + (c.reservedCount / c.maxCapacity) * 100, 0) / activeClasses.length)
    : 0;
  const todayReservations = reservations.filter((r) => {
    const today = new Date();
    return r.classDate === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  // ─── Modal helpers ───────────────────────────────────────────────────────
  const openCreate = () => setShowCreateModal(true);
  const openEdit = (cls: GymClass) => {
    if ((cls.seriesCount ?? 1) > 1) {
      setScopeTarget(cls);
      setShowScopeSelector(true);
      return;
    }
    setEditScope(null);
    setEditingClass(cls);
    setForm({ name: cls.name, eventType: cls.eventType ?? "class", serviceType: cls.serviceType, dayOfWeek: cls.dayOfWeek, startTime: cls.startTime, endTime: cls.endTime, coach: cls.coach, maxCapacity: cls.maxCapacity, note: cls.note || "" });
    setIsModalOpen(true);
  };

  const confirmScope = (scope: "this" | "future") => {
    const cls = scopeTarget!;
    setShowScopeSelector(false);
    setScopeTarget(null);
    setEditScope(scope);
    setEditingClass(cls);
    setForm({ name: cls.name, eventType: cls.eventType ?? "class", serviceType: cls.serviceType, dayOfWeek: cls.dayOfWeek, startTime: cls.startTime, endTime: cls.endTime, coach: cls.coach, maxCapacity: cls.maxCapacity, note: cls.note || "" });
    setIsModalOpen(true);
  };

  const closeEditModal = () => { setIsModalOpen(false); setEditScope(null); setReturnToSeriesSource(null); };

  // ─── Trim recurring series ───────────────────────────────────────────────
  const openTrim = (cls: GymClass) => {
    setShowScopeSelector(false);
    setScopeTarget(null);
    setTrimTarget(cls);
    setTrimEndDate(cls.sessionDate ?? "");
    setTrimPreview(null);
    setShowTrimModal(true);
  };

  // ─── View recurring series detail (read-only) ───────────────────────────
  const openSeries = async (cls: GymClass) => {
    setShowScopeSelector(false);
    setScopeTarget(null);
    setSeriesTarget(cls);
    setSeriesDetail(null);
    setShowSeriesModal(true);
    setSeriesLoading(true);
    const res = await fetch(`/api/classes/${cls.id}/series`);
    if (res.ok) {
      setSeriesDetail(await res.json());
    } else {
      const d = await res.json();
      setToast({ msg: d.error || "Error al cargar la serie", ok: false });
      setShowSeriesModal(false);
    }
    setSeriesLoading(false);
  };

  const closeSeriesModal = () => {
    setShowSeriesModal(false);
    setSeriesTarget(null);
    setSeriesDetail(null);
    setSeriesBackTarget(null);
  };

  const backToScopeSelector = () => {
    const back = seriesBackTarget;
    if (!back) return;
    setSeriesBackTarget(null);
    closeSeriesModal();
    setScopeTarget(back);
    setShowScopeSelector(true);
  };

  // ─── Edit entire series (Program metadata) ───────────────────────────────
  const openSeriesEdit = (cls: GymClass) => {
    setShowScopeSelector(false);
    setScopeTarget(null);
    setSeriesEditTarget(cls);
    setSeriesEditForm({ name: cls.name, serviceType: cls.serviceType, maxCapacity: cls.maxCapacity, note: cls.note ?? "" });
    setShowSeriesEditModal(true);
  };

  const openSeriesEditFromPanel = () => {
    if (!seriesTarget) return;
    const cls = seriesTarget;
    closeSeriesModal();
    setSeriesEditTarget(cls);
    setSeriesEditForm({ name: cls.name, serviceType: cls.serviceType, maxCapacity: cls.maxCapacity, note: cls.note ?? "" });
    setShowSeriesEditModal(true);
  };

  const handleSeriesSave = async () => {
    if (!seriesEditTarget) return;
    setSeriesEditSaving(true);
    const res = await fetch(`/api/classes/${seriesEditTarget.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: seriesEditForm.name,
        serviceType: seriesEditForm.serviceType,
        maxCapacity: seriesEditForm.maxCapacity,
        note: seriesEditForm.note,
        scope: "series",
      }),
    });
    if (res.ok) {
      setShowSeriesEditModal(false);
      setSeriesEditTarget(null);
      setToast({ msg: "Serie actualizada", ok: true });
      await fetchData();
    } else {
      const d = await res.json();
      setToast({ msg: d.error || "Error al guardar", ok: false });
    }
    setSeriesEditSaving(false);
  };

  // ─── Actions launched from the series panel ──────────────────────────────
  const editFromSeries = (s: SeriesSession) => {
    if (!seriesDetail) return;
    const detail = seriesDetail;
    setReturnToSeriesSource({ id: s.id, name: detail.programName });
    closeSeriesModal();
    setEditScope("this");
    setEditingClass({
      id: s.id,
      name: detail.programName,
      eventType: "class",
      serviceType: detail.serviceType,
      dayOfWeek: 0,
      startTime: s.startTime,
      endTime: s.endTime,
      coach: s.coachName,
      coachId: s.coachId,
      maxCapacity: detail.capacity,
      reservedCount: s.reservedCount,
      status: "active",
      hasBookingCutoff: false,
      bookingCutoffValue: 0,
      bookingCutoffUnit: "minutes",
      bookingMode: "regular",
      sessionDate: s.sessionDate,
      programId: detail.programId,
    });
    setForm({
      name: detail.programName,
      eventType: "class",
      serviceType: detail.serviceType,
      dayOfWeek: 0,
      startTime: s.startTime,
      endTime: s.endTime,
      coach: s.coachName,
      maxCapacity: detail.capacity,
      note: "",
    });
    setIsModalOpen(true);
  };

  const editFutureFromSeries = (s: SeriesSession) => {
    if (!seriesDetail) return;
    const detail = seriesDetail;
    setReturnToSeriesSource({ id: s.id, name: detail.programName });
    closeSeriesModal();
    setEditScope("future");
    setEditingClass({
      id: s.id,
      name: detail.programName,
      eventType: "class",
      serviceType: detail.serviceType,
      dayOfWeek: 0,
      startTime: s.startTime,
      endTime: s.endTime,
      coach: s.coachName,
      coachId: s.coachId,
      maxCapacity: detail.capacity,
      reservedCount: s.reservedCount,
      status: "active",
      hasBookingCutoff: false,
      bookingCutoffValue: 0,
      bookingCutoffUnit: "minutes",
      bookingMode: "regular",
      sessionDate: s.sessionDate,
      programId: detail.programId,
    });
    setForm({
      name: detail.programName,
      eventType: "class",
      serviceType: detail.serviceType,
      dayOfWeek: 0,
      startTime: s.startTime,
      endTime: s.endTime,
      coach: s.coachName,
      maxCapacity: detail.capacity,
      note: "",
    });
    setIsModalOpen(true);
  };

  const trimFromSeries = (s: SeriesSession) => {
    if (!seriesDetail) return;
    const detail = seriesDetail;
    setReturnToSeriesSource({ id: s.id, name: detail.programName });
    closeSeriesModal();
    setTrimTarget({
      id: s.id,
      name: detail.programName,
      eventType: "class",
      serviceType: detail.serviceType,
      dayOfWeek: 0,
      startTime: s.startTime,
      endTime: s.endTime,
      coach: s.coachName,
      coachId: s.coachId,
      maxCapacity: detail.capacity,
      reservedCount: s.reservedCount,
      status: "active",
      hasBookingCutoff: false,
      bookingCutoffValue: 0,
      bookingCutoffUnit: "minutes",
      bookingMode: "regular",
      sessionDate: s.sessionDate,
      programId: detail.programId,
    });
    setTrimEndDate(s.sessionDate);
    setTrimPreview(null);
    setShowTrimModal(true);
  };

  const goBackToSeries = () => {
    const source = returnToSeriesSource;
    if (!source) return;
    setReturnToSeriesSource(null);
    setIsModalOpen(false);
    setEditScope(null);
    setShowTrimModal(false);
    setTrimTarget(null);
    setTrimPreview(null);
    setTrimEndDate("");
    openSeries({
      id: source.id,
      name: source.name,
      eventType: "class",
      serviceType: "group",
      dayOfWeek: 0,
      startTime: "",
      endTime: "",
      coach: "",
      maxCapacity: 0,
      reservedCount: 0,
      status: "active",
      hasBookingCutoff: false,
      bookingCutoffValue: 0,
      bookingCutoffUnit: "minutes",
      bookingMode: "regular",
    });
  };

  const closeTrimModal = () => {
    setShowTrimModal(false);
    setTrimTarget(null);
    setTrimPreview(null);
    setTrimEndDate("");
    setReturnToSeriesSource(null);
  };

  const requestTrim = async (confirm: boolean) => {
    if (!trimTarget || !trimEndDate) return;
    setTrimLoading(true);
    const res = await fetch(`/api/classes/${trimTarget.id}/trim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endDate: trimEndDate, confirm }),
    });
    const data = await res.json();
    if (res.ok) {
      setTrimPreview(data);
      if (confirm) {
        await fetchData();
        setToast({
          msg: data.affectedCount > 0
            ? `Serie acortada: ${data.affectedCount} sesión(es) cancelada(s)`
            : "No había sesiones futuras para cancelar",
          ok: true,
        });
      }
    } else {
      setToast({ msg: data.error || "Error al acortar la serie", ok: false });
    }
    setTrimLoading(false);
  };

  const handleSave = async () => {
    const isSessionScoped = editingClass !== null && (editScope === "this" || editScope === "future");
    if (!form.startTime || !form.endTime || !form.coach) {
      setToast({ msg: "Completa los campos requeridos", ok: false }); return;
    }
    if (!isSessionScoped && !form.name) {
      setToast({ msg: "Completa los campos requeridos", ok: false }); return;
    }
    setSaving(true);
    const method = editingClass ? "PUT" : "POST";
    const url = editingClass ? `/api/classes/${editingClass.id}` : "/api/classes";
    const payload = isSessionScoped
      ? { startTime: form.startTime, endTime: form.endTime, coach: form.coach, note: form.note, scope: editScope }
      : form;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      await fetchData();
      closeEditModal();
      setToast({ msg: editingClass ? "Clase actualizada" : "Clase creada", ok: true });
    } else {
      const d = await res.json();
      setToast({ msg: d.error || "Error al guardar", ok: false });
    }
    setSaving(false);
  };

  const handleToggleStatus = async (cls: GymClass) => {
    const newStatus = cls.status === "active" ? "cancelled" : "active";
    const res = await fetch(`/api/classes/${cls.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      await fetchData();
      setToast({ msg: newStatus === "cancelled" ? "Clase cancelada" : "Clase activada", ok: true });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta clase? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    if (res.ok) { await fetchData(); setToast({ msg: "Clase eliminada", ok: true }); }
  };

  const kpis = [
    { label: "Clases activas", value: active.length, sub: `${classes.length} esta semana`, accent: "#4fc3f7" },
    { label: "Ocupación promedio", value: `${avgOccupancy}%`, sub: `${totalReserved}/${totalCapacity} cupos`, accent: "#22c55e" },
    { label: "Reservas hoy", value: todayReservations.length, sub: "hoy", accent: "#f97316" },
    { label: "Canceladas", value: classes.filter((c) => c.status === "cancelled").length, sub: "esta semana", accent: "#ef4444" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
            Gestión de Clases
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Administra horarios, cupos y asistencia</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
        >
          <Plus className="w-4 h-4" />
          Nueva Clase
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

      {/* ─── Filter bar ───────────────────────────────────────────────────────── */}
      <div className="space-y-2 mb-6">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-2 min-w-[190px] text-center" style={{ color: "var(--text-primary)" }}>
            {weekLabel}
          </span>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
            title="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {weekOffset !== 0 && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors hover:bg-white/5"
            style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            Esta semana
          </button>
        )}
        {/* Status filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          {(["all", "active", "cancelled"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={statusFilter === s
                ? { background: s === "cancelled" ? "#ef444420" : "#4fc3f720", color: s === "cancelled" ? "#ef4444" : "#4fc3f7" }
                : { background: "var(--card-border)", color: "var(--text-secondary)" }}
            >
              {s === "all" ? "Todas" : s === "active" ? "Activas" : "Canceladas"}
            </button>
          ))}
        </div>
      </div>

      {/* Search + coach + service type */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Buscar por clase o coach..."
          className="rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/40 flex-1 min-w-[180px]"
          style={{ background: "var(--card-border)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
        />
        <select
          value={coachFilter}
          onChange={e => setCoachFilter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/40"
          style={{ background: "var(--card-border)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}
        >
          <option value="">Todos los coaches</option>
          {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select
          value={serviceFilter}
          onChange={e => setServiceFilter(e.target.value as ServiceType | "")}
          className="rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/40"
          style={{ background: "var(--card-border)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}
        >
          <option value="">Todos los tipos</option>
          <option value="group">Grupal</option>
          <option value="personal_training">Entrenamiento personal</option>
          <option value="kinesiology">Kinesiología</option>
          <option value="blocked_time">Bloqueo de horario</option>
        </select>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/5"
            style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      </div>

      {loading ? (
        <div className="text-center py-20" style={{ color: "var(--text-secondary)" }}>Cargando clases...</div>
      ) : groupedDates.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
          <p className="text-sm font-medium">
            {hasActiveFilters
              ? "No encontramos clases con esos filtros en esta semana."
              : "No hay clases para esta semana"}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs font-medium"
              style={{ color: "#4fc3f7" }}
            >
              Limpiar filtros
            </button>
          ) : weekOffset !== 0 ? (
            <button
              onClick={() => setWeekOffset(0)}
              className="mt-3 text-xs font-medium"
              style={{ color: "#4fc3f7" }}
            >
              Ver semana actual
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedDates.map(date => {
            const dateClasses = filteredClasses
              .filter(c => c.sessionDate === date)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={date}>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
                  {getDayNameFromISO(date)} · {toDisplayDate(date)}
                </h2>
                <div className="space-y-2">
                  {dateClasses.map((cls) => {
                    const isBlocked = cls.eventType === "blocked_time";
                    const pct = !isBlocked && cls.maxCapacity > 0 ? (cls.reservedCount / cls.maxCapacity) * 100 : 0;
                    const barColor = pct >= 100 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";

                    return (
                      <motion.div
                        key={cls.id}
                        layout
                        className="rounded-xl overflow-hidden border"
                        style={{
                          background: isBlocked
                            ? "repeating-linear-gradient(45deg, var(--card-border), var(--card-border) 2px, var(--card) 2px, var(--card) 10px)"
                            : "var(--card)",
                          borderColor: "var(--card-border)",
                          opacity: isBlocked ? 0.9 : 1,
                        }}
                      >
                        <div className="flex items-center gap-3 p-4">
                          {isBlocked
                            ? <span className="text-xs px-2 py-0.5 rounded font-semibold shrink-0" style={{ background: "#71717a30", color: "#71717a" }}>Bloqueado</span>
                            : <ServiceBadge type={cls.serviceType} />
                          }

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cls.startTime}–{cls.endTime} · {cls.coach}</p>
                          </div>

                          {!isBlocked && (
                            <div className="hidden sm:flex flex-col items-end gap-1 w-32 shrink-0">
                              <div className="flex items-center gap-2 w-full">
                                <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: "var(--card-border)" }}>
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ backgroundColor: barColor }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(pct, 100)}%` }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                  />
                                </div>
                                <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>{Math.round(pct)}%</span>
                              </div>
                              <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{cls.reservedCount}/{cls.maxCapacity}</p>
                            </div>
                          )}

                          <span
                            className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                            style={cls.status === "active"
                              ? { background: "#22c55e20", color: "#22c55e" }
                              : { background: "#ef444420", color: "#ef4444" }}
                          >
                            {cls.status === "active" ? "Activa" : "Cancelada"}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            {!isBlocked && (
                              <Link
                                href={`/classes/${cls.id}?from=admin-classes`}
                                className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-xs font-medium"
                                style={{ color: "#4fc3f7" }}
                                title="Ver inscritos"
                              >
                                Ver
                              </Link>
                            )}
                            <button onClick={() => openEdit(cls)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-secondary)" }} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggleStatus(cls)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                              {cls.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleDelete(cls.id)} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "#ef4444" }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared create modal */}
      {showCreateModal && (
        <CreateClassModal
          coaches={coaches}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchData}
          onToast={(msg, ok) => setToast({ msg, ok })}
        />
      )}

      {/* Scope Selector Modal */}
      <AnimatePresence>
        {showScopeSelector && scopeTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowScopeSelector(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-2xl border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b" style={{ borderColor: "var(--card-border)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#4fc3f7" }}>Clase recurrente</p>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  ¿Qué quieres editar?
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {scopeTarget.name} · {toDisplayDate(scopeTarget.sessionDate ?? "")}
                </p>
              </div>
              <div className="p-4 space-y-2">
                {/* Option 1: Solo esta clase — enabled */}
                <button
                  onClick={() => confirmScope("this")}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white/5 border"
                  style={{ borderColor: "#4fc3f740", background: "#4fc3f710" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center" style={{ borderColor: "#4fc3f7" }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: "#4fc3f7" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Solo esta clase</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      Edita únicamente la sesión del {toDisplayDate(scopeTarget.sessionDate ?? "")}
                    </p>
                  </div>
                </button>

                {/* Option: Ver sesiones de la serie (read-only) */}
                <button
                  onClick={() => { setSeriesBackTarget(scopeTarget); openSeries(scopeTarget); }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white/5 border"
                  style={{ borderColor: "#a78bfa40", background: "#a78bfa10" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center" style={{ borderColor: "#a78bfa" }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: "#a78bfa" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Ver sesiones de la serie</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      Muestra todas las sesiones de esta serie recurrente, activas y canceladas (solo lectura)
                    </p>
                  </div>
                </button>

                {/* Option 2: Esta y futuras — enabled */}
                <button
                  onClick={() => confirmScope("future")}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white/5 border"
                  style={{ borderColor: "#4fc3f740", background: "#4fc3f710" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center" style={{ borderColor: "#4fc3f7" }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: "#4fc3f7" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Esta y futuras</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Modifica esta sesión y todas las siguientes (no afecta sesiones pasadas)</p>
                  </div>
                </button>

                {/* Option: Acortar serie desde una fecha */}
                <button
                  onClick={() => openTrim(scopeTarget)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white/5 border"
                  style={{ borderColor: "#f9731640", background: "#f9731610" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center" style={{ borderColor: "#f97316" }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: "#f97316" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Acortar serie desde una fecha</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      Cancela las sesiones futuras posteriores a la fecha que elijas. No afecta sesiones pasadas.
                    </p>
                  </div>
                </button>

                {/* Option: Toda la serie — enabled */}
                <button
                  onClick={() => openSeriesEdit(scopeTarget)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white/5 border"
                  style={{ borderColor: "#22c55e40", background: "#22c55e10" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center" style={{ borderColor: "#22c55e" }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: "#22c55e" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Toda la serie</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      Actualiza nombre, tipo y capacidad en todas las sesiones ({scopeTarget.seriesCount ?? "?"} en total)
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setShowScopeSelector(false)}
                  className="w-full py-2 rounded-xl text-sm font-medium mt-2 transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trim Series Modal */}
      <AnimatePresence>
        {showTrimModal && trimTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={closeTrimModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-2xl border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div>
                  {returnToSeriesSource && (
                    <button
                      onClick={goBackToSeries}
                      className="flex items-center gap-1 text-xs font-medium mb-2 transition-opacity hover:opacity-70"
                      style={{ color: "#a78bfa" }}
                    >
                      ← Ver serie
                    </button>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#f97316" }}>Acortar serie</p>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {trimTarget.name}
                  </h2>
                </div>
                <button onClick={closeTrimModal} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "#f9731610", color: "#f97316", border: "1px solid #f9731630" }}>
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span>Se cancelarán las sesiones futuras posteriores a la fecha elegida. No se tocarán sesiones pasadas ni la sesión del día seleccionado.</span>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nueva fecha de término (última sesión a conservar) *</label>
                  <input
                    type="date"
                    value={trimEndDate}
                    onChange={(e) => { setTrimEndDate(e.target.value); setTrimPreview(null); }}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>

                {trimPreview && (
                  <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: "var(--card-border)" }}>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {trimPreview.applied
                        ? `Se cancelaron ${trimPreview.affectedCount} sesión(es)`
                        : `Se cancelarán ${trimPreview.affectedCount} sesión(es) futura(s)`}
                    </p>
                    {trimPreview.affected.length > 0 && (
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {trimPreview.affected.map(s => toDisplayDate(s.sessionDate)).join(", ")}
                      </p>
                    )}
                    {trimPreview.skippedCount > 0 && (
                      <div className="pt-2 mt-2 border-t" style={{ borderColor: "var(--card-border)" }}>
                        <p className="text-xs font-semibold" style={{ color: "#f97316" }}>
                          {trimPreview.skippedCount} sesión(es) con reservas activas — no se modificarán
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                          {trimPreview.skipped.map(s => toDisplayDate(s.sessionDate)).join(", ")}
                        </p>
                      </div>
                    )}
                    {trimPreview.affectedCount === 0 && trimPreview.skippedCount === 0 && (
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>No hay sesiones futuras posteriores a esta fecha.</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {trimPreview?.applied ? (
                    <button
                      onClick={closeTrimModal}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ background: "#22c55e" }}
                    >
                      Listo
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={closeTrimModal}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-secondary)", border: "1px solid var(--card-border)" }}
                      >
                        Cancelar
                      </button>
                      {!trimPreview ? (
                        <button
                          onClick={() => requestTrim(false)}
                          disabled={!trimEndDate || trimLoading}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: "#f97316" }}
                        >
                          {trimLoading ? "Calculando..." : "Vista previa"}
                        </button>
                      ) : (
                        <button
                          onClick={() => requestTrim(true)}
                          disabled={trimLoading || trimPreview.affectedCount === 0}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ background: "#ef4444" }}
                        >
                          {trimLoading ? "Aplicando..." : "Confirmar y cancelar sesiones"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Series Detail Modal (read-only) */}
      <AnimatePresence>
        {showSeriesModal && seriesTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={closeSeriesModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 sticky top-0 border-b z-10" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                <div>
                  {seriesBackTarget && (
                    <button
                      onClick={backToScopeSelector}
                      className="flex items-center gap-1 text-xs font-medium mb-2 transition-opacity hover:opacity-70"
                      style={{ color: "#4fc3f7" }}
                    >
                      ← Volver a opciones
                    </button>
                  )}
                  <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#a78bfa" }}>Serie recurrente</p>
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {seriesTarget.name}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {!seriesLoading && seriesDetail && (
                    <button
                      onClick={openSeriesEditFromPanel}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors hover:bg-white/5 border"
                      style={{ borderColor: "#22c55e40", color: "#22c55e" }}
                    >
                      Editar serie
                    </button>
                  )}
                  <button onClick={closeSeriesModal} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
                </div>
              </div>

              {seriesLoading || !seriesDetail ? (
                <div className="p-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>Cargando serie...</div>
              ) : (
                <div className="p-6 space-y-5">
                  {/* Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Tipo de servicio</p>
                      <div className="mt-1"><ServiceBadge type={seriesDetail.serviceType} /></div>
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Horario</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{seriesDetail.startTime}–{seriesDetail.endTime}</p>
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Capacidad</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{seriesDetail.capacity} cupos</p>
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Coach</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                        {seriesDetail.coachVaries ? "Varía por sesión" : seriesDetail.primaryCoachName}
                      </p>
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Sesiones activas / canceladas</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                        <span style={{ color: "#22c55e" }}>{seriesDetail.totalActive}</span>
                        {" / "}
                        <span style={{ color: "#ef4444" }}>{seriesDetail.totalCancelled}</span>
                      </p>
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)" }}>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Rango de fechas</p>
                      <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>
                        {seriesDetail.rangeStart ? toDisplayDate(seriesDetail.rangeStart) : "—"} → {seriesDetail.rangeEnd ? toDisplayDate(seriesDetail.rangeEnd) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Sessions list */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
                      Sesiones de la serie ({seriesDetail.sessions.length})
                    </p>
                    <div className="space-y-1.5">
                      {seriesDetail.sessions.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm"
                          style={{
                            borderColor: "var(--card-border)",
                            background: s.status === "cancelled" ? "var(--card-border)" : "transparent",
                            opacity: s.status === "cancelled" ? 0.6 : 1,
                          }}
                        >
                          <span className="w-24 shrink-0 font-medium" style={{ color: "var(--text-primary)" }}>{toDisplayDate(s.sessionDate)}</span>
                          <span className="w-28 shrink-0" style={{ color: "var(--text-secondary)" }}>{s.startTime}–{s.endTime}</span>
                          <span className="flex-1 min-w-0 truncate" style={{ color: "var(--text-secondary)" }}>{s.coachName}</span>
                          <span
                            className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                            style={s.status === "active"
                              ? { background: "#22c55e20", color: "#22c55e" }
                              : { background: "#ef444420", color: "#ef4444" }}
                          >
                            {s.status === "active" ? "Activa" : "Cancelada"}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                            style={s.hasActiveBookings
                              ? { background: "#f9731620", color: "#f97316" }
                              : { background: "var(--card-border)", color: "var(--text-secondary)" }}
                            title={s.hasActiveBookings ? "Tiene reservas activas" : "Sin reservas activas"}
                          >
                            {s.reservedCount}/{s.capacity}
                          </span>
                          {s.status === "active" && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => editFromSeries(s)}
                                className="text-xs px-2 py-0.5 rounded font-medium transition-colors hover:bg-white/10"
                                style={{ color: "#4fc3f7" }}
                                title="Editar solo esta sesión"
                              >
                                Editar
                              </button>
                              <span className="text-xs" style={{ color: "var(--card-border)" }}>·</span>
                              <button
                                onClick={() => editFutureFromSeries(s)}
                                className="text-xs px-2 py-0.5 rounded font-medium transition-colors hover:bg-white/10"
                                style={{ color: "#22c55e" }}
                                title="Editar esta y futuras sesiones"
                              >
                                Futuras
                              </button>
                              <span className="text-xs" style={{ color: "var(--card-border)" }}>·</span>
                              <button
                                onClick={() => trimFromSeries(s)}
                                className="text-xs px-2 py-0.5 rounded font-medium transition-colors hover:bg-white/10"
                                style={{ color: "#f97316" }}
                                title="Acortar serie desde esta fecha"
                              >
                                Acortar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && editingClass && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 sticky top-0 border-b" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
                <div>
                  {returnToSeriesSource && (
                    <button
                      onClick={goBackToSeries}
                      className="flex items-center gap-1 text-xs font-medium mb-2 transition-opacity hover:opacity-70"
                      style={{ color: "#a78bfa" }}
                    >
                      ← Ver serie
                    </button>
                  )}
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                    {editScope === "this" ? "Editar solo esta clase" : editScope === "future" ? "Editar esta y futuras clases" : (form.eventType === "blocked_time" ? "Editar bloqueo" : "Editar Clase")}
                  </h2>
                  {(editScope === "this" || editScope === "future") && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {editingClass.name} · {editScope === "future" ? "desde el " : ""}{toDisplayDate(editingClass.sessionDate ?? "")}
                    </p>
                  )}
                </div>
                <button onClick={closeEditModal} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
              </div>
              <div className="p-6 space-y-4">
                {(editScope === "this" || editScope === "future") ? (
                  /* Simplified form for session-scoped edits (this / this+future) */
                  <>
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "#4fc3f710", color: "#4fc3f7", border: "1px solid #4fc3f730" }}>
                      <span className="mt-0.5 shrink-0">ℹ</span>
                      <span>
                        {editScope === "future"
                          ? "Se modifican esta sesión y todas las futuras de la serie. Las sesiones pasadas no se ven afectadas. Nombre, tipo y capacidad se mantienen para toda la serie."
                          : "Solo se modifica esta sesión. Nombre, tipo y capacidad se mantienen para toda la serie."}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Hora inicio *</label>
                        <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className={inputCls} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Hora fin *</label>
                        <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className={inputCls} style={inputStyle} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor *</label>
                        <select value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })}
                          className={inputCls} style={inputStyle}>
                          <option value="">— Seleccionar instructor —</option>
                          {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nota (opcional)</label>
                        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                          rows={2} placeholder="ej. Clase de recuperación, se modifica horario..."
                          className={`${inputCls} resize-none`} style={inputStyle} />
                      </div>
                    </div>
                  </>
                ) : (
                  /* Full form for non-recurring classes */
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo de evento</label>
                      <div className="flex gap-2">
                        {(["class", "blocked_time"] as const).map(et => (
                          <button key={et} type="button" onClick={() => setForm({ ...form, eventType: et })}
                            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={form.eventType === et
                              ? { background: et === "blocked_time" ? "#71717a" : "#4fc3f7", color: "#0a0a0f" }
                              : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                            {et === "class" ? "Clase" : "Tiempo bloqueado"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder={form.eventType === "blocked_time" ? "ej. Mantenimiento de equipo" : "ej. Funcional 6am"}
                          className={inputCls} style={inputStyle} />
                      </div>
                      {form.eventType !== "blocked_time" && (
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo de clase</label>
                          <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value as ServiceType })}
                            className={inputCls} style={inputStyle}>
                            <option value="group">Grupal</option>
                            <option value="personal_training">Entrenamiento personal</option>
                            <option value="kinesiology">Kinesiología</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Día de la semana</label>
                        <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) as DayOfWeek })}
                          className={inputCls} style={inputStyle}>
                          {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => (
                            <option key={d} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Hora inicio *</label>
                        <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                          className={inputCls} style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Hora fin *</label>
                        <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                          className={inputCls} style={inputStyle} />
                      </div>
                      <div className={form.eventType !== "blocked_time" ? "" : "col-span-2"}>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor</label>
                        <select value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })}
                          className={inputCls} style={inputStyle}>
                          <option value="">— Seleccionar instructor —</option>
                          {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      {form.eventType !== "blocked_time" && (
                        <div>
                          <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Capacidad máxima</label>
                          <input type="number" min={1} value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
                            className={inputCls} style={inputStyle} />
                        </div>
                      )}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nota (opcional)</label>
                        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                          rows={2} placeholder={form.eventType === "blocked_time" ? "ej. Acceso restringido" : "Información adicional..."}
                          className={`${inputCls} resize-none`} style={inputStyle} />
                      </div>
                    </div>
                  </>
                )}
                <button
                  onClick={handleSave} disabled={saving}
                  className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Series Edit Modal */}
      <AnimatePresence>
        {showSeriesEditModal && seriesEditTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowSeriesEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-2xl border overflow-hidden"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b" style={{ borderColor: "var(--card-border)" }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#22c55e" }}>Toda la serie</p>
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Editar datos de la serie
                </h2>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  {seriesEditTarget.name} · {seriesEditTarget.seriesCount ?? "?"} sesiones
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: "#4fc3f710", color: "#4fc3f7", border: "1px solid #4fc3f730" }}>
                  <span className="mt-0.5 shrink-0">ℹ</span>
                  <span>No modifica horarios ni reservas. Solo actualiza los datos generales de la serie.</span>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
                  <input
                    type="text"
                    value={seriesEditForm.name}
                    onChange={e => setSeriesEditForm(f => ({ ...f, name: e.target.value }))}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo de servicio</label>
                  <select
                    value={seriesEditForm.serviceType}
                    onChange={e => setSeriesEditForm(f => ({ ...f, serviceType: e.target.value as ServiceType }))}
                    className={inputCls}
                    style={inputStyle}
                  >
                    <option value="group">Grupal</option>
                    <option value="personal_training">Entrenamiento personal</option>
                    <option value="kinesiology">Kinesiología</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Capacidad máxima</label>
                  <input
                    type="number"
                    min={1}
                    value={seriesEditForm.maxCapacity}
                    onChange={e => setSeriesEditForm(f => ({ ...f, maxCapacity: Number(e.target.value) }))}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Nota (opcional)</label>
                  <input
                    type="text"
                    value={seriesEditForm.note}
                    onChange={e => setSeriesEditForm(f => ({ ...f, note: e.target.value }))}
                    placeholder="ej. Llevar mat"
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSeriesEditModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                    style={{ color: "var(--text-secondary)", border: "1px solid var(--card-border)" }}
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSeriesSave}
                    disabled={seriesEditSaving || !seriesEditForm.name.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(to right, #22c55e, #4fc3f7)" }}
                  >
                    {seriesEditSaving ? "Guardando..." : "Guardar toda la serie"}
                  </motion.button>
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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-semibold z-50 shadow-2xl"
            style={toast.ok
              ? { background: "#22c55e", color: "#fff" }
              : { background: "#ef4444", color: "#fff" }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
