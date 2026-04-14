"use client";

import { useState, useEffect, useCallback } from "react";
import { GymClass, Reservation, ServiceType } from "@/lib/types";
import { currentUser } from "@/lib/mock-data";

// ─── Constants ─────────────────────────────────────────────────────────────
const CURRENT_USER_ID = currentUser.id;
const IS_ADMIN_OR_COACH = currentUser.role === "admin" || currentUser.role === "coach";
const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const SERVICE_LABELS: Record<ServiceType, string> = {
  group: "Grupal", personal_training: "Personal", kinesiology: "Kinesio", blocked_time: "Bloqueado",
};
const SERVICE_COLORS: Record<ServiceType, string> = {
  group: "bg-blue-500/20 text-blue-400",
  personal_training: "bg-orange-500/20 text-orange-400",
  kinesiology: "bg-purple-500/20 text-purple-400",
  blocked_time: "bg-zinc-600/30 text-zinc-400",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
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
function occupancyInfo(reserved: number, capacity: number) {
  if (reserved >= capacity) return { label: "Lleno", dot: "bg-red-400", text: "text-red-400", border: "border-red-500/30", cardBg: "bg-red-500/5" };
  const pct = capacity > 0 ? reserved / capacity : 0;
  if (pct >= 0.7) return { label: "Pocos cupos", dot: "bg-yellow-400", text: "text-yellow-400", border: "border-yellow-500/30", cardBg: "bg-yellow-500/5" };
  return { label: `${capacity - reserved} cupos`, dot: "bg-green-400", text: "text-green-400", border: "border-zinc-800", cardBg: "" };
}

// ─── Create Class modal default ────────────────────────────────────────────
interface CreateState {
  name: string;
  serviceType: ServiceType;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  coach: string;
  maxCapacity: number;
  note: string;
}

function defaultCreate(dayOfWeek: number): CreateState {
  return { name: "", serviceType: "group", dayOfWeek, startTime: "09:00", endTime: "10:00", coach: "", maxCapacity: 20, note: "" };
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function CalendarPage() {
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

  const weekDates = getWeekDates(weekOffset);
  const todayStr = toDateStr(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, rRes] = await Promise.all([
      fetch("/api/classes"),
      fetch(`/api/reservations?userId=${CURRENT_USER_ID}`),
    ]);
    setClasses(await cRes.json());
    setReservations(await rRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Unique coaches from classes
  const coaches = Array.from(new Set(classes.map((c) => c.coach))).sort();

  const isReserved = (classId: string, dateStr: string) =>
    reservations.some((r) => r.classId === classId && r.classDate === dateStr && r.studentId === CURRENT_USER_ID && r.status !== "cancelled");

  const handleReserve = async (classId: string, dateStr: string) => {
    setActionLoading(true);
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, userId: CURRENT_USER_ID, classDate: dateStr }),
    });
    const data = await res.json();
    if (res.ok) {
      setReservations((prev) => [...prev, data]);
      setClasses((prev) => prev.map((c) => c.id === classId ? { ...c, reservedCount: c.reservedCount + 1 } : c));
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
      setReservations((prev) => prev.filter((r) => !(r.classId === classId && r.classDate === dateStr && r.studentId === CURRENT_USER_ID)));
      setClasses((prev) => prev.map((c) => c.id === classId ? { ...c, reservedCount: Math.max(0, c.reservedCount - 1) } : c));
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
      setClasses((prev) => [...prev, data]);
      setToast({ msg: "Clase creada", ok: true });
      setCreateModal(null);
    } else {
      setToast({ msg: data.error || "Error al crear clase", ok: false });
    }
    setCreating(false);
  };

  const weekLabel = weekDates.length
    ? `${weekDates[0].date.getDate()} ${MONTHS[weekDates[0].date.getMonth()]} — ${weekDates[5].date.getDate()} ${MONTHS[weekDates[5].date.getMonth()]}`
    : "";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario Semanal</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Reserva y gestiona tus clases</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center text-sm">←</button>
          <span className="text-sm font-medium text-white min-w-[170px] text-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">{weekLabel}</span>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center text-sm">→</button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2">Hoy</button>
          )}
        </div>
      </div>

      {/* Coach filter */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-zinc-500 text-xs font-medium">Coach:</span>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCoachFilter("all")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${coachFilter === "all" ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
          >
            Todos
          </button>
          {coaches.map((coach) => (
            <button
              key={coach}
              onClick={() => setCoachFilter(coachFilter === coach ? "all" : coach)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${coachFilter === coach ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
            >
              {coach.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24 text-zinc-600">Cargando clases...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {weekDates.map(({ date, dateStr, dayOfWeek }) => {
            const allDayClasses = classes
              .filter((c) => c.dayOfWeek === dayOfWeek && c.status === "active")
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            const dayClasses = coachFilter === "all"
              ? allDayClasses
              : allDayClasses.filter((c) => c.coach === coachFilter);

            const isToday = dateStr === todayStr;

            return (
              <div key={dateStr}>
                {/* Day header */}
                <div className={`text-center mb-3 py-2 rounded-lg ${isToday ? "bg-blue-600/15 border border-blue-500/30" : ""}`}>
                  <p className={`text-xs font-medium ${isToday ? "text-blue-400" : "text-zinc-500"}`}>{DAY_SHORT[dayOfWeek]}</p>
                  <p className={`text-xl font-bold ${isToday ? "text-blue-400" : "text-white"}`}>{date.getDate()}</p>
                </div>

                {/* Class cards */}
                <div className="space-y-2 min-h-[40px]">
                  {dayClasses.length === 0 ? (
                    IS_ADMIN_OR_COACH ? (
                      <button
                        onClick={() => setCreateModal(defaultCreate(dayOfWeek))}
                        className="w-full text-center text-zinc-700 text-xs py-3 border border-dashed border-zinc-800 rounded-lg hover:border-zinc-600 hover:text-zinc-500 transition-colors"
                      >
                        + clase
                      </button>
                    ) : (
                      <p className="text-center text-zinc-700 text-xs py-3">—</p>
                    )
                  ) : (
                    <>
                      {dayClasses.map((cls) => {
                        const reserved = isReserved(cls.id, dateStr);
                        const info = occupancyInfo(cls.reservedCount, cls.maxCapacity);
                        return (
                          <button
                            key={cls.id}
                            onClick={() => setModal({ cls, dateStr })}
                            className={`w-full text-left rounded-lg border p-2.5 transition-all hover:ring-1 hover:ring-zinc-600 ${
                              reserved
                                ? "bg-blue-600/10 border-blue-500/40"
                                : `bg-zinc-900 ${info.border} ${info.cardBg}`
                            }`}
                          >
                            <p className="font-semibold text-white text-xs leading-tight truncate">{cls.name}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">{cls.startTime}</p>
                            <p className="text-zinc-600 text-xs truncate">{cls.coach.split(" ")[0]}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${reserved ? "bg-blue-400" : info.dot}`} />
                              <span className={`text-xs font-medium ${reserved ? "text-blue-400" : info.text}`}>
                                {reserved ? "Reservado" : info.label}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      {/* Admin: add another class to a day that already has classes */}
                      {IS_ADMIN_OR_COACH && (
                        <button
                          onClick={() => setCreateModal(defaultCreate(dayOfWeek))}
                          className="w-full text-center text-zinc-700 text-xs py-1.5 border border-dashed border-zinc-800 rounded-lg hover:border-zinc-600 hover:text-zinc-500 transition-colors"
                        >
                          +
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Class Detail Modal ──────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`h-1 w-full ${SERVICE_COLORS[modal.cls.serviceType].split(" ")[0].replace("text-", "bg-").replace("/20", "/80")}`} />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_COLORS[modal.cls.serviceType]}`}>
                    {SERVICE_LABELS[modal.cls.serviceType]}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-2">{modal.cls.name}</h2>
                </div>
                <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-white text-2xl leading-none mt-1">×</button>
              </div>
              <div className="space-y-2 text-sm mb-5">
                {[["Coach", modal.cls.coach], ["Horario", `${modal.cls.startTime} – ${modal.cls.endTime}`], ["Cupos", `${modal.cls.reservedCount} / ${modal.cls.maxCapacity}`]].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-zinc-500">{label}</span>
                    <span className="text-white font-medium">{value}</span>
                  </div>
                ))}
                {modal.cls.note && (
                  <div className="pt-1 border-t border-zinc-800">
                    <p className="text-zinc-500 text-xs mb-0.5">Nota</p>
                    <p className="text-zinc-300 text-xs">{modal.cls.note}</p>
                  </div>
                )}
              </div>
              <div className="mb-6">
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      modal.cls.reservedCount >= modal.cls.maxCapacity ? "bg-red-500"
                        : modal.cls.reservedCount / modal.cls.maxCapacity >= 0.7 ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((modal.cls.reservedCount / modal.cls.maxCapacity) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {isReserved(modal.cls.id, modal.dateStr) ? (
                <button onClick={() => handleCancel(modal.cls.id, modal.dateStr)} disabled={actionLoading} className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                  {actionLoading ? "Procesando..." : "Cancelar Reserva"}
                </button>
              ) : modal.cls.reservedCount >= modal.cls.maxCapacity ? (
                <button disabled className="w-full py-2.5 rounded-xl bg-zinc-800 text-zinc-500 font-semibold text-sm cursor-not-allowed">Clase Llena</button>
              ) : (
                <button onClick={() => handleReserve(modal.cls.id, modal.dateStr)} disabled={actionLoading} className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                  {actionLoading ? "Procesando..." : "Reservar Clase"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Class Modal ──────────────────────────────────────────── */}
      {createModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setCreateModal(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Nueva Clase</h2>
                <button onClick={() => setCreateModal(null)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    value={createModal.name}
                    onChange={(e) => setCreateModal({ ...createModal, name: e.target.value })}
                    placeholder="ej. Funcional 6am"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Tipo</label>
                    <select value={createModal.serviceType} onChange={(e) => setCreateModal({ ...createModal, serviceType: e.target.value as ServiceType })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      <option value="group">Grupal</option>
                      <option value="personal_training">Personal</option>
                      <option value="kinesiology">Kinesio</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Día</label>
                    <select value={createModal.dayOfWeek} onChange={(e) => setCreateModal({ ...createModal, dayOfWeek: Number(e.target.value) })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Inicio</label>
                    <input type="time" value={createModal.startTime} onChange={(e) => setCreateModal({ ...createModal, startTime: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Fin</label>
                    <input type="time" value={createModal.endTime} onChange={(e) => setCreateModal({ ...createModal, endTime: e.target.value })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Coach *</label>
                    <input type="text" value={createModal.coach} onChange={(e) => setCreateModal({ ...createModal, coach: e.target.value })} placeholder="Nombre del coach" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Capacidad</label>
                    <input type="number" value={createModal.maxCapacity} min={1} onChange={(e) => setCreateModal({ ...createModal, maxCapacity: Number(e.target.value) })} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500" />
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Nota (opcional)</label>
                  <input type="text" value={createModal.note} onChange={(e) => setCreateModal({ ...createModal, note: e.target.value })} placeholder="ej. Llevar mat" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setCreateModal(null)} className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={handleCreateClass} disabled={creating || !createModal.name || !createModal.coach} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {creating ? "Creando..." : "Crear Clase"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast ───────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium z-50 shadow-2xl ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
