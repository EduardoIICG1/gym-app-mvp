"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { GymClass, Reservation, ServiceType, DayOfWeek, EventType, Member } from "@/lib/types";
import { ServiceBadge } from "@/components/Badge";
import { DAY_NAMES } from "@/lib/labels";
import { CreateClassModal } from "@/components/classes/CreateClassModal";

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
  const [showScopeSelector, setShowScopeSelector] = useState(false);
  const [editScope, setEditScope] = useState<"this" | "future" | null>(null);
  const [scopeTarget, setScopeTarget] = useState<GymClass | null>(null);

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
  const filteredClasses = statusFilter === "all" ? classes : classes.filter(c => c.status === statusFilter);
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

  const closeEditModal = () => { setIsModalOpen(false); setEditScope(null); };

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
      <div className="flex flex-wrap items-center gap-3 mb-6 px-4 py-3 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
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

      {loading ? (
        <div className="text-center py-20" style={{ color: "var(--text-secondary)" }}>Cargando clases...</div>
      ) : groupedDates.length === 0 ? (
        <div className="text-center py-16 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
          <p className="text-sm font-medium">No hay clases para esta semana</p>
          {(weekOffset !== 0 || statusFilter !== "all") && (
            <button
              onClick={() => { setWeekOffset(0); setStatusFilter("all"); }}
              className="mt-3 text-xs font-medium"
              style={{ color: "#4fc3f7" }}
            >
              Ver semana actual
            </button>
          )}
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

                {/* Option 3: Toda la serie — disabled */}
                <div
                  className="w-full flex items-start gap-3 p-3 rounded-xl border opacity-50 cursor-not-allowed"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0" style={{ borderColor: "var(--text-secondary)" }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Toda la serie</p>
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#f97316", color: "#0a0a0f" }}>Próxima fase</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>Aplica los cambios a todas las sesiones ({scopeTarget.seriesCount ?? "?"} en total)</p>
                  </div>
                </div>

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
