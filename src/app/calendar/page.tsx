"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Users, Plus, X } from "lucide-react";
import type { GymClass, Reservation, ServiceType } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ServiceBadge, OccupancyBadge } from "@/components/Badge";

const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getWeekDates(offset: number) {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: d, dateStr, dayOfWeek: i };
  });
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CreateState {
  name: string; serviceType: ServiceType; dayOfWeek: number;
  startTime: string; endTime: string; coach: string; maxCapacity: number; note: string;
}

function defaultCreate(dayOfWeek: number): CreateState {
  return { name: "", serviceType: "group", dayOfWeek, startTime: "09:00", endTime: "10:00", coach: "", maxCapacity: 20, note: "" };
}

// ── Class Detail Modal ──────────────────────────────────────────────────────
function ClassModal({ cls, dateStr, reserved, loading, onClose, onReserve, onCancel }: {
  cls: GymClass; dateStr: string; reserved: boolean; loading: boolean;
  onClose: () => void; onReserve: () => void; onCancel: () => void;
}) {
  const pct = cls.maxCapacity > 0 ? Math.min((cls.reservedCount / cls.maxCapacity) * 100, 100) : 0;
  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
  const isFull = cls.reservedCount >= cls.maxCapacity;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className="w-full max-w-sm rounded-2xl border overflow-hidden shadow-2xl"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Accent bar */}
        <div className="h-1" style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <ServiceBadge type={cls.serviceType} />
              <h2 className="text-xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>{cls.name}</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--text-secondary)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 text-sm mb-5">
            {[
              ["Coach", cls.coach],
              ["Horario", `${cls.startTime} – ${cls.endTime}`],
              ["Fecha", dateStr],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
            {cls.note && (
              <div className="pt-2" style={{ borderTop: "1px solid var(--card-border)" }}>
                <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Nota</p>
                <p className="text-xs" style={{ color: "var(--text-primary)" }}>{cls.note}</p>
              </div>
            )}
          </div>

          {/* Capacity bar */}
          <div className="mb-2 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-secondary)" }} />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{cls.reservedCount}/{cls.maxCapacity}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-5" style={{ background: "var(--card-border)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4 }}
              className="h-full rounded-full"
              style={{ backgroundColor: barColor }}
            />
          </div>

          {reserved ? (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onCancel} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:opacity-50"
              style={{ background: "#ef4444" }}
            >
              {loading ? "Procesando..." : "Cancelar Reserva"}
            </motion.button>
          ) : isFull ? (
            <button disabled className="w-full py-3 rounded-xl font-semibold text-sm cursor-not-allowed"
              style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
              Clase Llena
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onReserve} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }}
            >
              {loading ? "Procesando..." : "Reservar Clase"}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const currentUser = useCurrentUser();
  const CURRENT_USER_ID = currentUser.id;
  const IS_ADMIN_OR_COACH = currentUser.role === "admin" || currentUser.role === "coach";

  const [weekOffset, setWeekOffset] = useState(0);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<{ cls: GymClass; dateStr: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [coachFilter, setCoachFilter] = useState("all");
  const [createModal, setCreateModal] = useState<CreateState | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0); // mobile

  const weekDates = getWeekDates(weekOffset);
  const todayStr = toDateStr(new Date());

  // Reset selectedDay on week change
  useEffect(() => {
    const todayIdx = weekDates.findIndex(d => d.dateStr === todayStr);
    setSelectedDay(todayIdx >= 0 ? todayIdx : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, rRes] = await Promise.all([
      fetch("/api/classes"),
      fetch(`/api/reservations?userId=${CURRENT_USER_ID}`),
    ]);
    setClasses(await cRes.json());
    setReservations(await rRes.json());
    setLoading(false);
  }, [CURRENT_USER_ID]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const coaches = Array.from(new Set(classes.map(c => c.coach))).sort();

  const isReserved = (classId: string, dateStr: string) =>
    reservations.some(r => r.classId === classId && r.classDate === dateStr && r.studentId === CURRENT_USER_ID && r.status !== "cancelled");

  const handleReserve = async (classId: string, dateStr: string) => {
    setActionLoading(true);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, userId: CURRENT_USER_ID, classDate: dateStr }),
    });
    const data = await res.json();
    if (res.ok) {
      setReservations(prev => [...prev, data]);
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, reservedCount: c.reservedCount + 1 } : c));
      setToast({ msg: "¡Clase reservada!", ok: true });
      setModal(null);
    } else {
      setToast({ msg: data.error || "Error al reservar", ok: false });
    }
    setActionLoading(false);
  };

  const handleCancel = async (classId: string, dateStr: string) => {
    setActionLoading(true);
    const res = await fetch("/api/reservations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, userId: CURRENT_USER_ID, classDate: dateStr }),
    });
    if (res.ok) {
      setReservations(prev => prev.filter(r => !(r.classId === classId && r.classDate === dateStr && r.studentId === CURRENT_USER_ID)));
      setClasses(prev => prev.map(c => c.id === classId ? { ...c, reservedCount: Math.max(0, c.reservedCount - 1) } : c));
      setToast({ msg: "Reserva cancelada", ok: true });
      setModal(null);
    } else {
      setToast({ msg: "Error al cancelar", ok: false });
    }
    setActionLoading(false);
  };

  const handleCreateClass = async () => {
    if (!createModal || !createModal.name || !createModal.coach) return;
    setCreating(true);
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createModal),
    });
    const data = await res.json();
    if (res.ok) {
      setClasses(prev => [...prev, data]);
      setToast({ msg: "Clase creada", ok: true });
      setCreateModal(null);
    } else {
      setToast({ msg: data.error || "Error al crear", ok: false });
    }
    setCreating(false);
  };

  const weekLabel = weekDates.length
    ? `${weekDates[0].date.getDate()} ${MONTHS[weekDates[0].date.getMonth()]} — ${weekDates[5].date.getDate()} ${MONTHS[weekDates[5].date.getMonth()]}`
    : "";

  // Filtered classes per column
  const getColClasses = (dayOfWeek: number) =>
    classes
      .filter(c => c.dayOfWeek === dayOfWeek && c.status === "active")
      .filter(c => coachFilter === "all" || c.coach === coachFilter)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="p-6 pb-24 lg:pb-6" style={{ maxWidth: "1400px", margin: "0 auto" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>Calendario</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Reserva y gestiona tus clases</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center px-3 py-2 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Semana</p>
            <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{weekLabel}</p>
          </div>
          <button
            onClick={() => setWeekOffset(w => w + 1)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "#4fc3f7" }}
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Coach filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Coach:</span>
        <div className="flex gap-2 flex-wrap">
          {["all", ...coaches].map(c => (
            <button
              key={c}
              onClick={() => setCoachFilter(coachFilter === c ? "all" : c)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={
                coachFilter === c
                  ? { backgroundColor: "#4fc3f7", color: "#0a0a0f" }
                  : { background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }
              }
            >
              {c === "all" ? "Todos" : c.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>Cargando clases...</div>
      ) : (
        <>
          {/* ── Mobile: day pills + single column ────────────────── */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 snap-x">
              {weekDates.map(({ date, dateStr, dayOfWeek }) => {
                const isToday = dateStr === todayStr;
                const isSelected = dayOfWeek === selectedDay;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(dayOfWeek)}
                    className="flex-shrink-0 snap-start flex flex-col items-center px-4 py-2 rounded-xl transition-all"
                    style={
                      isSelected
                        ? { background: "#4fc3f7", color: "#0a0a0f" }
                        : isToday
                          ? { background: "#4fc3f720", border: "1px solid #4fc3f750", color: "#4fc3f7" }
                          : { background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }
                    }
                  >
                    <span className="text-xs font-medium">{DAY_SHORT[dayOfWeek]}</span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* Single day classes */}
            <div className="space-y-3">
              {getColClasses(selectedDay).length === 0 ? (
                IS_ADMIN_OR_COACH ? (
                  <button
                    onClick={() => setCreateModal(defaultCreate(selectedDay))}
                    className="w-full py-6 rounded-xl border border-dashed text-sm font-medium transition-colors hover:opacity-70"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                  >
                    + Añadir clase
                  </button>
                ) : (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>Sin clases este día</p>
                )
              ) : (
                getColClasses(selectedDay).map((cls, i) => {
                  const reserved = isReserved(cls.id, weekDates[selectedDay].dateStr);
                  const pct = cls.maxCapacity > 0 ? (cls.reservedCount / cls.maxCapacity) * 100 : 0;
                  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
                  return (
                    <motion.button
                      key={cls.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setModal({ cls, dateStr: weekDates[selectedDay].dateStr })}
                      className="w-full text-left rounded-xl p-4 border transition-colors"
                      style={{
                        background: "var(--card)",
                        borderColor: reserved ? "#4fc3f750" : "var(--card-border)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <ServiceBadge type={cls.serviceType} />
                        <OccupancyBadge reserved={cls.reservedCount} capacity={cls.maxCapacity} />
                      </div>
                      <p className="font-bold text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                      <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>{cls.startTime} – {cls.endTime}</p>
                      <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>{cls.coach}</p>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </motion.button>
                  );
                })
              )}
              {IS_ADMIN_OR_COACH && getColClasses(selectedDay).length > 0 && (
                <button
                  onClick={() => setCreateModal(defaultCreate(selectedDay))}
                  className="w-full py-3 rounded-xl border border-dashed text-xs font-medium transition-colors hover:opacity-70"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                >
                  + clase
                </button>
              )}
            </div>
          </div>

          {/* ── Desktop: 6-column grid ────────────────────────────── */}
          <div className="hidden lg:grid grid-cols-6 gap-4">
            {weekDates.map(({ date, dateStr, dayOfWeek }, dayIndex) => {
              const isToday = dateStr === todayStr;
              const dayClasses = getColClasses(dayOfWeek);

              return (
                <motion.div
                  key={dateStr}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.05 }}
                >
                  {/* Day header */}
                  <div className="mb-4 pb-3" style={{ borderBottom: `2px solid ${isToday ? "#4fc3f7" : "var(--card-border)"}` }}>
                    <p className="text-sm font-semibold" style={{ color: isToday ? "#4fc3f7" : "var(--text-secondary)" }}>
                      {DAY_SHORT[dayOfWeek]}
                    </p>
                    <p className="text-2xl font-bold" style={{ color: isToday ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {date.getDate()}
                    </p>
                  </div>

                  {/* Class cards */}
                  <div className="space-y-3">
                    {dayClasses.length === 0 ? (
                      IS_ADMIN_OR_COACH ? (
                        <button
                          onClick={() => setCreateModal(defaultCreate(dayOfWeek))}
                          className="w-full py-4 rounded-xl border border-dashed text-xs transition-colors hover:opacity-70"
                          style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                        >
                          + clase
                        </button>
                      ) : (
                        <p className="text-center text-xs py-4" style={{ color: "var(--card-border)" }}>—</p>
                      )
                    ) : (
                      <>
                        {dayClasses.map((cls, clsIdx) => {
                          const reserved = isReserved(cls.id, dateStr);
                          const pct = cls.maxCapacity > 0 ? (cls.reservedCount / cls.maxCapacity) * 100 : 0;
                          const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";

                          return (
                            <motion.button
                              key={cls.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: dayIndex * 0.05 + clsIdx * 0.02 }}
                              whileHover={{ scale: 1.02 }}
                              onClick={() => setModal({ cls, dateStr })}
                              className="w-full text-left rounded-xl p-3 border transition-colors"
                              style={{
                                background: "var(--card)",
                                borderColor: reserved ? "#4fc3f750" : "var(--card-border)",
                              }}
                            >
                              <div className="flex items-start justify-between mb-2 gap-1 flex-wrap">
                                <ServiceBadge type={cls.serviceType} />
                                <OccupancyBadge reserved={cls.reservedCount} capacity={cls.maxCapacity} />
                              </div>
                              <p className="font-bold text-xs mb-0.5 leading-tight" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                              <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>{cls.startTime}</p>
                              <p className="text-xs mb-2 truncate" style={{ color: "var(--text-secondary)" }}>{cls.coach}</p>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Users className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
                                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{cls.reservedCount}/{cls.maxCapacity}</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.5, delay: dayIndex * 0.05 + clsIdx * 0.02 + 0.1 }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: barColor }}
                                />
                              </div>
                            </motion.button>
                          );
                        })}
                        {IS_ADMIN_OR_COACH && (
                          <button
                            onClick={() => setCreateModal(defaultCreate(dayOfWeek))}
                            className="w-full py-2 rounded-xl border border-dashed text-xs transition-colors hover:opacity-70"
                            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
                          >
                            +
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Class Detail Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <ClassModal
            cls={modal.cls}
            dateStr={modal.dateStr}
            reserved={isReserved(modal.cls.id, modal.dateStr)}
            loading={actionLoading}
            onClose={() => setModal(null)}
            onReserve={() => handleReserve(modal.cls.id, modal.dateStr)}
            onCancel={() => handleCancel(modal.cls.id, modal.dateStr)}
          />
        )}
      </AnimatePresence>

      {/* ── Create Class Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {createModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setCreateModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Nueva Clase</h2>
                  <button onClick={() => setCreateModal(null)} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "Nombre *", key: "name", type: "text", placeholder: "ej. Funcional 6am" },
                    { label: "Coach *", key: "coach", type: "text", placeholder: "Nombre del coach" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>{f.label}</label>
                      <input
                        type={f.type}
                        value={(createModal as unknown as Record<string, string>)[f.key]}
                        onChange={e => setCreateModal({ ...createModal, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
                        style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
                      />
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo</label>
                      <select value={createModal.serviceType} onChange={e => setCreateModal({ ...createModal, serviceType: e.target.value as ServiceType })}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
                        <option value="group">Grupal</option>
                        <option value="personal_training">Personal</option>
                        <option value="kinesiology">Kinesio</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Día</label>
                      <select value={createModal.dayOfWeek} onChange={e => setCreateModal({ ...createModal, dayOfWeek: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
                        {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"].map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Inicio</label>
                      <input type="time" value={createModal.startTime} onChange={e => setCreateModal({ ...createModal, startTime: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Fin</label>
                      <input type="time" value={createModal.endTime} onChange={e => setCreateModal({ ...createModal, endTime: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                        style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Capacidad</label>
                    <input type="number" min={1} value={createModal.maxCapacity} onChange={e => setCreateModal({ ...createModal, maxCapacity: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nota (opcional)</label>
                    <input type="text" value={createModal.note} onChange={e => setCreateModal({ ...createModal, note: e.target.value })} placeholder="ej. Llevar mat"
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                      style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }} />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setCreateModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleCreateClass}
                    disabled={creating || !createModal.name || !createModal.coach}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }}>
                    {creating ? "Creando..." : "Crear Clase"}
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
            className="fixed bottom-20 lg:bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium z-50 shadow-2xl text-white"
            style={{ background: toast.ok ? "#22c55e" : "#ef4444" }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
