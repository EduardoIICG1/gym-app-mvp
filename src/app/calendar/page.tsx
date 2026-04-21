"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Users, X, Pencil, ClipboardList } from "lucide-react";
import type { GymClass, Reservation, ServiceType, EventType, Member, AttendanceStatus } from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ServiceBadge, OccupancyBadge } from "@/components/Badge";
import {
  getClassBookingStatus,
  canMemberBookClass,
  bookingCutoffLabel,
  hasClassOccurred,
  type ClassBookingStatus,
} from "@/lib/calendarHelpers";
import { getEffectiveDisplayStatus } from "@/lib/cycleHelpers";
import { DAY_NAMES_SHORT, MONTH_NAMES_SHORT, ATTENDANCE_STATUS_LABELS } from "@/lib/labels";

const DAY_SHORT = DAY_NAMES_SHORT;
const MONTHS = MONTH_NAMES_SHORT;

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
  name: string; eventType: EventType; serviceType: ServiceType; dayOfWeek: number;
  startTime: string; endTime: string; coach: string; maxCapacity: number; note: string;
  hasBookingCutoff: boolean; bookingCutoffValue: number; bookingCutoffUnit: "minutes" | "hours";
  bookingMode: "regular" | "makeup_only";
}

function defaultCreate(dayOfWeek: number): CreateState {
  return {
    name: "", eventType: "class", serviceType: "group", dayOfWeek,
    startTime: "09:00", endTime: "10:00", coach: "", maxCapacity: 20, note: "",
    hasBookingCutoff: true, bookingCutoffValue: 3, bookingCutoffUnit: "hours", bookingMode: "regular",
  };
}

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors";
const inputStyle = { background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" };

// Status labels and styles for member view
const STATUS_CONFIG: Record<ClassBookingStatus, { label: string; bg: string; color: string }> = {
  available:        { label: "Disponible",      bg: "#22c55e20", color: "#22c55e" },
  almost_full:      { label: "Pocos cupos",     bg: "#f59e0b20", color: "#f59e0b" },
  full:             { label: "Completa",        bg: "#ef444420", color: "#ef4444" },
  booking_closed:   { label: "Reserva cerrada", bg: "#71717a20", color: "#71717a" },
  makeup_only:      { label: "Recuperación",    bg: "#a78bfa20", color: "#a78bfa" },
  open_for_booking: { label: "Abierta",         bg: "#22c55e20", color: "#22c55e" },
};

// ── Member Class Modal ──────────────────────────────────────────────────────
function ClassModal({
  cls, dateStr, reserved, canBook, bookingStatus, loading,
  onClose, onReserve, onCancel,
}: {
  cls: GymClass; dateStr: string; reserved: boolean; canBook: boolean;
  bookingStatus: ClassBookingStatus; loading: boolean;
  onClose: () => void; onReserve: () => void; onCancel: () => void;
}) {
  const pct = cls.maxCapacity > 0 ? Math.min((cls.reservedCount / cls.maxCapacity) * 100, 100) : 0;
  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
  const statusCfg = STATUS_CONFIG[bookingStatus];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
        <div className="h-1" style={{ background: cls.bookingMode === "makeup_only" ? "linear-gradient(to right, #a78bfa, #ec4899)" : "linear-gradient(to right, #4fc3f7, #22c55e)" }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ServiceBadge type={cls.serviceType} />
                {cls.bookingMode === "makeup_only" && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#a78bfa20", color: "#a78bfa" }}>Recuperación</span>
                )}
              </div>
              <h2 className="text-xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>{cls.name}</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--text-secondary)" }}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 text-sm mb-5 mt-4">
            {[
              ["Instructor", cls.coach],
              ["Horario", `${cls.startTime} – ${cls.endTime}`],
              ["Fecha", dateStr],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
            {cls.hasBookingCutoff && (
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }}>Cierre reserva</span>
                <span className="font-medium text-xs" style={{ color: "var(--text-secondary)" }}>{bookingCutoffLabel(cls)}</span>
              </div>
            )}
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
              initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
              className="h-full rounded-full" style={{ backgroundColor: barColor }}
            />
          </div>

          {/* Status chip */}
          {!reserved && (
            <div className="mb-3 flex justify-center">
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                {statusCfg.label}
              </span>
            </div>
          )}

          {/* CTA */}
          {reserved ? (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onCancel} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: "#ef4444" }}
            >
              {loading ? "Procesando..." : "Cancelar Reserva"}
            </motion.button>
          ) : bookingStatus === "booking_closed" ? (
            <button disabled className="w-full py-3 rounded-xl font-semibold text-sm cursor-not-allowed"
              style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
              Reserva cerrada
            </button>
          ) : bookingStatus === "full" ? (
            <button disabled className="w-full py-3 rounded-xl font-semibold text-sm cursor-not-allowed"
              style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
              Clase llena
            </button>
          ) : bookingStatus === "makeup_only" && !canBook ? (
            <button disabled className="w-full py-3 rounded-xl font-semibold text-sm cursor-not-allowed"
              style={{ background: "#a78bfa20", color: "#a78bfa" }}>
              Solo disponible para recuperación
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={onReserve} disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: cls.bookingMode === "makeup_only" ? "linear-gradient(to right, #a78bfa, #ec4899)" : "linear-gradient(to right, #4fc3f7, #22c55e)" }}
            >
              {loading ? "Procesando..." : cls.bookingMode === "makeup_only" ? "Reservar (Recuperación)" : "Reservar Clase"}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Admin/Coach Manage Modal ────────────────────────────────────────────────
function ManageModal({
  cls: initialCls, dateStr, updatedByName, coaches, onClose, onSaved, onToast,
}: {
  cls: GymClass; dateStr: string; updatedByName: string;
  coaches: { id: string; name: string }[];
  onClose: () => void;
  onSaved: (updated: GymClass) => void;
  onToast: (msg: string, ok: boolean) => void;
}) {
  type View = "info" | "edit" | "enrolled";
  const [view, setView] = useState<View>("info");
  const [cls, setCls] = useState(initialCls);
  const [editState, setEditState] = useState<CreateState>({
    name: initialCls.name,
    eventType: initialCls.eventType ?? "class",
    serviceType: initialCls.serviceType,
    dayOfWeek: initialCls.dayOfWeek,
    startTime: initialCls.startTime,
    endTime: initialCls.endTime,
    coach: initialCls.coach,
    maxCapacity: initialCls.maxCapacity,
    note: initialCls.note ?? "",
    hasBookingCutoff: initialCls.hasBookingCutoff,
    bookingCutoffValue: initialCls.bookingCutoffValue,
    bookingCutoffUnit: initialCls.bookingCutoffUnit,
    bookingMode: initialCls.bookingMode,
  });
  const [saving, setSaving] = useState(false);
  const [enrolled, setEnrolled] = useState<Reservation[]>([]);
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [attendanceUpdating, setAttendanceUpdating] = useState<string | null>(null);

  const bookingStatus = getClassBookingStatus(cls, dateStr, true);
  const statusCfg = STATUS_CONFIG[bookingStatus];

  const handleViewEnrolled = async () => {
    setView("enrolled");
    setEnrolledLoading(true);
    const res = await fetch(`/api/reservations?classId=${cls.id}`);
    const all: Reservation[] = await res.json();
    setEnrolled(all.filter(r => r.classDate === dateStr && r.status !== "cancelled"));
    setEnrolledLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/classes/${cls.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    const data = await res.json();
    if (res.ok) {
      setCls(data);
      onSaved(data);
      onToast("Clase actualizada", true);
      setView("info");
    } else {
      onToast(data.error || "Error al guardar", false);
    }
    setSaving(false);
  };

  const updateAttendance = async (reservationId: string, newStatus: AttendanceStatus) => {
    setAttendanceUpdating(reservationId);
    const res = await fetch(`/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attendanceStatus: newStatus,
        lastUpdatedBy: updatedByName,
        lastUpdatedAt: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      const updated: Reservation = await res.json();
      setEnrolled(prev => prev.map(r => r.id === reservationId ? updated : r));
      onToast("Asistencia actualizada", true);
    } else {
      onToast("Error al actualizar", false);
    }
    setAttendanceUpdating(null);
  };

  const grantMakeupCredit = async (reservationId: string) => {
    setAttendanceUpdating(reservationId);
    const res = await fetch(`/api/reservations/${reservationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eligibleForMakeup: true,
        lastUpdatedBy: updatedByName,
        lastUpdatedAt: new Date().toISOString(),
      }),
    });
    if (res.ok) {
      const updated: Reservation = await res.json();
      setEnrolled(prev => prev.map(r => r.id === reservationId ? updated : r));
      onToast("Recuperación concedida", true);
    } else {
      onToast("Error al actualizar", false);
    }
    setAttendanceUpdating(null);
  };

  const modalContent = () => {
    if (view === "enrolled") {
      const isPast = hasClassOccurred(dateStr, cls.endTime);
      const ATTENDANCE_STYLE: Record<string, { background: string; color: string }> = {
        attended:            { background: "#22c55e20", color: "#22c55e" },
        absent:              { background: "#ef444420", color: "#ef4444" },
        pending_attendance:  { background: "#f59e0b20", color: "#f59e0b" },
        reserved:            { background: "#4fc3f720", color: "#4fc3f7" },
      };

      return (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setView("info")} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
              Inscritos — {dateStr}
            </h3>
            {isPast && (
              <span className="text-xs px-2 py-0.5 rounded font-semibold ml-auto" style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                Clase pasada
              </span>
            )}
          </div>

          {isPast && (
            <p className="text-xs mb-3 px-1" style={{ color: "var(--text-secondary)" }}>
              Registra la asistencia. Los cambios quedan registrados con tu nombre.
            </p>
          )}

          {enrolledLoading ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>Cargando...</p>
          ) : enrolled.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>Sin reservas para este día</p>
          ) : (
            <div className="space-y-2">
              {enrolled.map(r => {
                const effStatus = getEffectiveDisplayStatus(r);
                const isUpdating = attendanceUpdating === r.id;
                const statusStyle = ATTENDANCE_STYLE[effStatus] ?? ATTENDANCE_STYLE.reserved;
                const statusLabel = ATTENDANCE_STATUS_LABELS[effStatus] ?? effStatus;
                const fmt = (iso: string) => {
                  const d = new Date(iso);
                  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                };

                return (
                  <div key={r.id} className="rounded-lg p-3" style={{ background: "var(--background)" }}>
                    {/* Student info + status */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{r.studentName}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{r.studentEmail}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded font-semibold shrink-0" style={statusStyle}>
                        {statusLabel}
                      </span>
                    </div>

                    {/* Audit trail */}
                    {r.lastUpdatedBy && (
                      <p className="text-xs mb-2" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                        Actualizado por {r.lastUpdatedBy}{r.lastUpdatedAt ? ` · ${fmt(r.lastUpdatedAt)}` : ""}
                        {r.updateNote ? ` — "${r.updateNote}"` : ""}
                      </p>
                    )}

                    {/* Makeup granted badge */}
                    {r.eligibleForMakeup && (
                      <div className="mb-2">
                        <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "#a78bfa20", color: "#a78bfa" }}>
                          ↺ Recuperación concedida
                        </span>
                      </div>
                    )}

                    {/* Attendance action buttons (past classes only) */}
                    {isPast && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button
                          disabled={isUpdating}
                          onClick={() => updateAttendance(r.id, "attended")}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all disabled:opacity-40"
                          style={effStatus === "attended"
                            ? { background: "#22c55e", color: "#fff" }
                            : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                          ✓ Asistió
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() => updateAttendance(r.id, "absent")}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all disabled:opacity-40"
                          style={effStatus === "absent"
                            ? { background: "#ef4444", color: "#fff" }
                            : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                          ✗ Ausente
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() => updateAttendance(r.id, "pending_attendance")}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all disabled:opacity-40"
                          style={effStatus === "pending_attendance"
                            ? { background: "#f59e0b", color: "#fff" }
                            : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                          ? Pendiente
                        </button>
                        {effStatus === "absent" && !r.eligibleForMakeup && (
                          <button
                            disabled={isUpdating}
                            onClick={() => grantMakeupCredit(r.id)}
                            className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all disabled:opacity-40"
                            style={{ background: "#a78bfa20", color: "#a78bfa", border: "1px solid #a78bfa40" }}>
                            ↺ Dar recuperación
                          </button>
                        )}
                        {isUpdating && (
                          <span className="text-xs px-2 py-1" style={{ color: "var(--text-secondary)" }}>Guardando...</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      );
    }

    if (view === "edit") {
      const isEditBlocked = editState.eventType === "blocked_time";
      return (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setView("info")} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Editar</h3>
          </div>

          <div className="space-y-4">
            {/* Event type toggle */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo de evento</label>
              <div className="flex gap-2">
                {(["class", "blocked_time"] as const).map(et => (
                  <button key={et} onClick={() => setEditState({ ...editState, eventType: et })}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={editState.eventType === et
                      ? { background: et === "blocked_time" ? "#71717a" : "#4fc3f7", color: "#0a0a0f" }
                      : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    {et === "class" ? "Clase" : "Tiempo bloqueado"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
              <input type="text" value={editState.name}
                onChange={e => setEditState({ ...editState, name: e.target.value })}
                className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor *</label>
              <select value={editState.coach} onChange={e => setEditState({ ...editState, coach: e.target.value })}
                className={inputCls} style={inputStyle}>
                <option value="">— Seleccionar instructor —</option>
                {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!isEditBlocked && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo</label>
                  <select value={editState.serviceType} onChange={e => setEditState({ ...editState, serviceType: e.target.value as ServiceType })}
                    className={inputCls} style={inputStyle}>
                    <option value="group">Grupal</option>
                    <option value="personal_training">Entrenamiento personal</option>
                    <option value="kinesiology">Kinesiología</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Día</label>
                <select value={editState.dayOfWeek} onChange={e => setEditState({ ...editState, dayOfWeek: Number(e.target.value) })}
                  className={inputCls} style={inputStyle}>
                  {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"].map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Inicio</label>
                <input type="time" value={editState.startTime} onChange={e => setEditState({ ...editState, startTime: e.target.value })}
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Fin</label>
                <input type="time" value={editState.endTime} onChange={e => setEditState({ ...editState, endTime: e.target.value })}
                  className={inputCls} style={inputStyle} />
              </div>
            </div>

            {!isEditBlocked && (
              <>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Capacidad máxima</label>
                  <input type="number" min={1} value={editState.maxCapacity}
                    onChange={e => setEditState({ ...editState, maxCapacity: Number(e.target.value) })}
                    className={inputCls} style={inputStyle} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Cierre de reserva</label>
                    <button
                      type="button"
                      onClick={() => setEditState({ ...editState, hasBookingCutoff: !editState.hasBookingCutoff })}
                      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
                      style={{ background: editState.hasBookingCutoff ? "#4fc3f7" : "var(--card-border)" }}
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full shadow transition-transform mt-0.5"
                        style={{ background: "var(--card)", marginLeft: editState.hasBookingCutoff ? "18px" : "2px" }} />
                    </button>
                  </div>
                  {editState.hasBookingCutoff ? (
                    <>
                      <div className="flex gap-2">
                        <input type="number" min={1} value={editState.bookingCutoffValue}
                          onChange={e => setEditState({ ...editState, bookingCutoffValue: Number(e.target.value) })}
                          className={inputCls + " flex-1"} style={inputStyle} />
                        <select value={editState.bookingCutoffUnit}
                          onChange={e => setEditState({ ...editState, bookingCutoffUnit: e.target.value as "minutes" | "hours" })}
                          className={inputCls + " flex-1"} style={inputStyle}>
                          <option value="minutes">minutos</option>
                          <option value="hours">horas</option>
                        </select>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>antes del inicio de la clase</p>
                    </>
                  ) : (
                    <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--background)", color: "var(--text-secondary)" }}>
                      Sin restricción — el miembro puede reservar mientras haya cupos
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Modalidad</label>
                  <div className="flex gap-2">
                    {(["regular", "makeup_only"] as const).map(mode => (
                      <button key={mode} onClick={() => setEditState({ ...editState, bookingMode: mode })}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={editState.bookingMode === mode
                          ? { background: mode === "makeup_only" ? "#a78bfa" : "#4fc3f7", color: "#0a0a0f" }
                          : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                        {mode === "regular" ? "Normal" : "Solo recuperación"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nota (opcional)</label>
              <input type="text" value={editState.note} placeholder={isEditBlocked ? "ej. Revisión de equipos" : "ej. Llevar mat"}
                onChange={e => setEditState({ ...editState, note: e.target.value })}
                className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setView("info")}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleSave} disabled={saving || !editState.name}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </motion.button>
          </div>
        </>
      );
    }

    // info view
    const isBlocked = cls.eventType === "blocked_time";
    return (
      <>
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isBlocked
                ? <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "#71717a30", color: "#71717a" }}>Bloqueado</span>
                : <ServiceBadge type={cls.serviceType} />
              }
              {!isBlocked && cls.bookingMode === "makeup_only" && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#a78bfa20", color: "#a78bfa" }}>Recuperación</span>
              )}
            </div>
            <h2 className="text-lg font-bold mt-1" style={{ color: "var(--text-primary)" }}>{cls.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-sm my-4">
          {(isBlocked
            ? [["Instructor", cls.coach], ["Horario", `${cls.startTime} – ${cls.endTime}`]]
            : [["Instructor", cls.coach], ["Horario", `${cls.startTime} – ${cls.endTime}`], ["Capacidad", `${cls.reservedCount}/${cls.maxCapacity}`]]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>{label}</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
            </div>
          ))}
          {!isBlocked && (
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>Cierre reserva</span>
              <span className="font-medium text-xs" style={{ color: cls.hasBookingCutoff ? "var(--text-primary)" : "#22c55e" }}>
                {bookingCutoffLabel(cls)}
              </span>
            </div>
          )}
          {cls.note && (
            <div className="pt-2" style={{ borderTop: "1px solid var(--card-border)" }}>
              <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>Nota</p>
              <p className="text-xs" style={{ color: "var(--text-primary)" }}>{cls.note}</p>
            </div>
          )}
        </div>

        {!isBlocked && (
          <div className="mb-4 px-3 py-2 rounded-lg" style={{ background: statusCfg.bg }}>
            <p className="text-xs font-semibold" style={{ color: statusCfg.color }}>
              Estado: {statusCfg.label}
            </p>
            {bookingStatus === "booking_closed" && (
              <p className="text-xs mt-0.5" style={{ color: statusCfg.color, opacity: 0.8 }}>
                El cierre de reserva ya pasó. Ajusta el cierre para reabrir.
              </p>
            )}
          </div>
        )}

        <div className={isBlocked ? "" : "grid grid-cols-2 gap-3"}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setView("edit")}
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white w-full"
            style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }}>
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </motion.button>
          {!isBlocked && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleViewEnrolled}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "var(--card-border)", color: "var(--text-primary)" }}>
              <ClipboardList className="w-3.5 h-3.5" />
              Ver inscritos
            </motion.button>
          )}
        </div>
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
        <div className="h-1" style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }} />
        <div className={`p-6 ${view === "edit" ? "max-h-[88vh] overflow-y-auto" : ""}`}>
          {modalContent()}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Small status chip for calendar cards ───────────────────────────────────
function BookingStatusChip({ status }: { status: ClassBookingStatus }) {
  if (status === "available" || status === "open_for_booking") return null;
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const currentUser = useCurrentUser();
  const CURRENT_USER_ID = currentUser.id;
  const IS_ADMIN_OR_COACH = currentUser.hasRole("admin") || currentUser.hasRole("coach");

  const [weekOffset, setWeekOffset] = useState(0);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<{ cls: GymClass; dateStr: string } | null>(null);
  const [manageModal, setManageModal] = useState<{ cls: GymClass; dateStr: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [coachFilter, setCoachFilter] = useState("all");
  const [createModal, setCreateModal] = useState<CreateState | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  const weekDates = getWeekDates(weekOffset);
  const todayStr = toDateStr(new Date());

  useEffect(() => {
    const todayIdx = weekDates.findIndex(d => d.dateStr === todayStr);
    setSelectedDay(todayIdx >= 0 ? todayIdx : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, rRes, mRes, coachRes] = await Promise.all([
      fetch("/api/classes"),
      fetch(`/api/reservations?userId=${CURRENT_USER_ID}`),
      fetch("/api/members"),
      fetch("/api/members?includesRole=coach"),
    ]);
    setClasses(await cRes.json());
    setReservations(await rRes.json());
    const allMembers: Member[] = await mRes.json();
    setCurrentMember(allMembers.find(m => m.id === CURRENT_USER_ID) ?? null);
    const coachMembers: Member[] = await coachRes.json();
    setCoaches(coachMembers.map(m => ({ id: m.id, name: m.name })));
    setLoading(false);
  }, [CURRENT_USER_ID]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const canBookMakeup = currentMember?.canBookMakeupClasses === true;
  const coachFilterNames = Array.from(new Set(classes.filter(c => c.eventType !== "blocked_time").map(c => c.coach))).sort();

  const isReserved = (classId: string, dateStr: string) =>
    reservations.some(r => r.classId === classId && r.classDate === dateStr && r.studentId === CURRENT_USER_ID && r.status !== "cancelled");

  const handleCardClick = (cls: GymClass, dateStr: string) => {
    if (IS_ADMIN_OR_COACH) {
      setManageModal({ cls, dateStr });
    } else {
      setModal({ cls, dateStr });
    }
  };

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

  const handleClassUpdated = (updated: GymClass) => {
    setClasses(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (manageModal) setManageModal({ cls: updated, dateStr: manageModal.dateStr });
  };

  const weekLabel = weekDates.length
    ? `${weekDates[0].date.getDate()} ${MONTHS[weekDates[0].date.getMonth()]} — ${weekDates[5].date.getDate()} ${MONTHS[weekDates[5].date.getMonth()]}`
    : "";

  const getColClasses = (dayOfWeek: number) =>
    classes
      .filter(c => c.dayOfWeek === dayOfWeek && c.status === "active")
      // Members never see blocked_time entries
      .filter(c => IS_ADMIN_OR_COACH || c.eventType !== "blocked_time")
      .filter(c => coachFilter === "all" || c.coach === coachFilter)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Render a single class card (shared between mobile and desktop)
  const renderCard = (cls: GymClass, dateStr: string, opts: { delay?: number; scale?: boolean }) => {
    if (cls.eventType === "blocked_time") {
      return (
        <motion.div
          key={cls.id}
          initial={{ opacity: 0, y: opts.scale ? undefined : 12, scale: opts.scale ? 0.95 : undefined }}
          animate={{ opacity: 1, y: opts.scale ? undefined : 0, scale: opts.scale ? 1 : undefined }}
          transition={{ delay: opts.delay ?? 0 }}
          className="w-full text-left rounded-xl p-3 border"
          style={{
            background: "repeating-linear-gradient(45deg, var(--card-border), var(--card-border) 2px, var(--card) 2px, var(--card) 10px)",
            borderColor: "var(--card-border)",
            opacity: 0.85,
          }}
        >
          <div className="mb-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#71717a30", color: "#71717a" }}>Bloqueado</span>
          </div>
          <p className="font-bold text-xs mb-0.5 leading-tight" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
          <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>{cls.startTime}–{cls.endTime}</p>
          {cls.note && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{cls.note}</p>}
        </motion.div>
      );
    }

    const reserved = isReserved(cls.id, dateStr);
    const bookingStatus = getClassBookingStatus(cls, dateStr, IS_ADMIN_OR_COACH);
    const pct = cls.maxCapacity > 0 ? (cls.reservedCount / cls.maxCapacity) * 100 : 0;
    const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
    const isMakeup = cls.bookingMode === "makeup_only";
    const isClosed = !IS_ADMIN_OR_COACH && bookingStatus === "booking_closed";

    return (
      <motion.button
        key={cls.id}
        initial={{ opacity: 0, y: opts.scale ? undefined : 12, scale: opts.scale ? 0.95 : undefined }}
        animate={{ opacity: isClosed ? 0.55 : 1, y: opts.scale ? undefined : 0, scale: opts.scale ? 1 : undefined }}
        transition={{ delay: opts.delay ?? 0 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => handleCardClick(cls, dateStr)}
        className="w-full text-left rounded-xl p-3 border transition-colors"
        style={{
          background: "var(--card)",
          borderColor: isMakeup ? "#a78bfa50" : reserved ? "#4fc3f750" : "var(--card-border)",
        }}
      >
        <div className="flex items-start justify-between mb-1.5 gap-1 flex-wrap">
          <ServiceBadge type={cls.serviceType} />
          <OccupancyBadge reserved={cls.reservedCount} capacity={cls.maxCapacity} />
        </div>
        <p className="font-bold text-xs mb-0.5 leading-tight" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
        <p className="text-xs mb-0.5" style={{ color: "var(--text-secondary)" }}>{cls.startTime}</p>
        <p className="text-xs mb-2 truncate" style={{ color: "var(--text-secondary)" }}>{cls.coach}</p>
        <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "var(--card-border)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, delay: (opts.delay ?? 0) + 0.1 }}
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>
        {/* Status/role chips */}
        <div className="flex flex-wrap gap-1">
          {isMakeup && (
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#a78bfa20", color: "#a78bfa" }}>Recup.</span>
          )}
          {reserved && (
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#4fc3f720", color: "#4fc3f7" }}>Reservada</span>
          )}
          {IS_ADMIN_OR_COACH ? null : <BookingStatusChip status={bookingStatus} />}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="p-6 pb-24 lg:pb-6" style={{ maxWidth: "1400px", margin: "0 auto" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold" style={{ color: "var(--text-primary)" }}>Calendario</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {IS_ADMIN_OR_COACH ? "Gestiona y administra las clases de la semana" : "Reserva y gestiona tus clases"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--text-secondary)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center px-3 py-2 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Semana</p>
            <p className="font-semibold text-sm min-w-[140px] sm:min-w-[170px]" style={{ color: "var(--text-primary)" }}>{weekLabel}</p>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--text-secondary)" }}>
            <ChevronRight className="w-5 h-5" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs px-3 py-1.5 rounded-lg" style={{ color: "#4fc3f7" }}>
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* Coach filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Instructor:</span>
        <div className="flex gap-2 flex-wrap">
          {["all", ...coachFilterNames].map(c => (
            <button key={c} onClick={() => setCoachFilter(coachFilter === c ? "all" : c)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
              style={coachFilter === c
                ? { backgroundColor: "#4fc3f7", color: "#0a0a0f" }
                : { background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
              {c === "all" ? "Todos" : c.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>Cargando clases...</div>
      ) : (
        <>
          {/* ── Mobile: day pills + single column ─────── */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 snap-x">
              {weekDates.map(({ date, dateStr, dayOfWeek }) => {
                const isToday = dateStr === todayStr;
                const isSelected = dayOfWeek === selectedDay;
                return (
                  <button key={dateStr} onClick={() => setSelectedDay(dayOfWeek)}
                    className="flex-shrink-0 snap-start flex flex-col items-center px-4 py-2 rounded-xl transition-all"
                    style={isSelected
                      ? { background: "#4fc3f7", color: "#0a0a0f" }
                      : isToday
                        ? { background: "#4fc3f720", border: "1px solid #4fc3f750", color: "#4fc3f7" }
                        : { background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                    <span className="text-xs font-medium">{DAY_SHORT[dayOfWeek]}</span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              {getColClasses(selectedDay).length === 0 ? (
                IS_ADMIN_OR_COACH ? (
                  <button onClick={() => setCreateModal(defaultCreate(selectedDay))}
                    className="w-full py-6 rounded-xl border border-dashed text-sm font-medium hover:opacity-70"
                    style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                    + Añadir clase
                  </button>
                ) : (
                  <p className="text-center py-8 text-sm" style={{ color: "var(--text-secondary)" }}>Sin clases este día</p>
                )
              ) : (
                getColClasses(selectedDay).map((cls, i) =>
                  renderCard(cls, weekDates[selectedDay].dateStr, { delay: i * 0.04 })
                )
              )}
              {IS_ADMIN_OR_COACH && getColClasses(selectedDay).length > 0 && (
                <button onClick={() => setCreateModal(defaultCreate(selectedDay))}
                  className="w-full py-3 rounded-xl border border-dashed text-xs font-medium hover:opacity-70"
                  style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                  + clase
                </button>
              )}
            </div>
          </div>

          {/* ── Desktop: 6-column grid ─────────────────── */}
          <div className="hidden lg:grid grid-cols-6 gap-4">
            {weekDates.map(({ date, dateStr, dayOfWeek }, dayIndex) => {
              const isToday = dateStr === todayStr;
              const dayClasses = getColClasses(dayOfWeek);
              return (
                <motion.div key={dateStr} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIndex * 0.05 }}>
                  <div className="mb-4 pb-3" style={{ borderBottom: `2px solid ${isToday ? "#4fc3f7" : "var(--card-border)"}` }}>
                    <p className="text-sm font-semibold" style={{ color: isToday ? "#4fc3f7" : "var(--text-secondary)" }}>{DAY_SHORT[dayOfWeek]}</p>
                    <p className="text-2xl font-bold" style={{ color: isToday ? "var(--text-primary)" : "var(--text-secondary)" }}>{date.getDate()}</p>
                  </div>
                  <div className="space-y-3">
                    {dayClasses.length === 0 ? (
                      IS_ADMIN_OR_COACH ? (
                        <button onClick={() => setCreateModal(defaultCreate(dayOfWeek))}
                          className="w-full py-4 rounded-xl border border-dashed text-xs hover:opacity-70"
                          style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                          + clase
                        </button>
                      ) : (
                        <p className="text-center text-xs py-4" style={{ color: "var(--card-border)" }}>—</p>
                      )
                    ) : (
                      <>
                        {dayClasses.map((cls, clsIdx) =>
                          renderCard(cls, dateStr, { delay: dayIndex * 0.05 + clsIdx * 0.02, scale: true })
                        )}
                        {IS_ADMIN_OR_COACH && (
                          <button onClick={() => setCreateModal(defaultCreate(dayOfWeek))}
                            className="w-full py-2 rounded-xl border border-dashed text-xs hover:opacity-70"
                            style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
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

      {/* ── Member Class Detail Modal ──────────────── */}
      <AnimatePresence>
        {modal && (() => {
          const bookingStatus = getClassBookingStatus(modal.cls, modal.dateStr, false);
          const canBook = canMemberBookClass(modal.cls, modal.dateStr, canBookMakeup);
          return (
            <ClassModal
              cls={modal.cls}
              dateStr={modal.dateStr}
              reserved={isReserved(modal.cls.id, modal.dateStr)}
              canBook={canBook}
              bookingStatus={bookingStatus}
              loading={actionLoading}
              onClose={() => setModal(null)}
              onReserve={() => handleReserve(modal.cls.id, modal.dateStr)}
              onCancel={() => handleCancel(modal.cls.id, modal.dateStr)}
            />
          );
        })()}
      </AnimatePresence>

      {/* ── Admin/Coach Manage Modal ───────────────── */}
      <AnimatePresence>
        {manageModal && (
          <ManageModal
            cls={manageModal.cls}
            dateStr={manageModal.dateStr}
            updatedByName={currentUser.name}
            coaches={coaches}
            onClose={() => setManageModal(null)}
            onSaved={handleClassUpdated}
            onToast={(msg, ok) => setToast({ msg, ok })}
          />
        )}
      </AnimatePresence>

      {/* ── Create Class Modal ─────────────────────── */}
      <AnimatePresence>
        {createModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setCreateModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                    {createModal.eventType === "blocked_time" ? "Nuevo tiempo bloqueado" : "Nueva Clase"}
                  </h2>
                  <button onClick={() => setCreateModal(null)} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Event type toggle */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo de evento</label>
                    <div className="flex gap-2">
                      {(["class", "blocked_time"] as const).map(et => (
                        <button key={et} onClick={() => setCreateModal({ ...createModal, eventType: et })}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                          style={createModal.eventType === et
                            ? { background: et === "blocked_time" ? "#71717a" : "#4fc3f7", color: "#0a0a0f" }
                            : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                          {et === "class" ? "Clase" : "Tiempo bloqueado"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
                    <input type="text" value={createModal.name}
                      onChange={e => setCreateModal({ ...createModal, name: e.target.value })}
                      placeholder={createModal.eventType === "blocked_time" ? "ej. Mantenimiento de equipo" : "ej. Funcional 6am"}
                      className={inputCls} style={inputStyle} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor</label>
                    <select value={createModal.coach} onChange={e => setCreateModal({ ...createModal, coach: e.target.value })}
                      className={inputCls} style={inputStyle}>
                      <option value="">— Seleccionar instructor —</option>
                      {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {createModal.eventType !== "blocked_time" && (
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo</label>
                        <select value={createModal.serviceType} onChange={e => setCreateModal({ ...createModal, serviceType: e.target.value as ServiceType })}
                          className={inputCls} style={inputStyle}>
                          <option value="group">Grupal</option>
                          <option value="personal_training">Personal</option>
                          <option value="kinesiology">Kinesio</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Día</label>
                      <select value={createModal.dayOfWeek} onChange={e => setCreateModal({ ...createModal, dayOfWeek: Number(e.target.value) })}
                        className={inputCls} style={inputStyle}>
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
                        className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Fin</label>
                      <input type="time" value={createModal.endTime} onChange={e => setCreateModal({ ...createModal, endTime: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>

                  {createModal.eventType !== "blocked_time" && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Capacidad</label>
                        <input type="number" min={1} value={createModal.maxCapacity} onChange={e => setCreateModal({ ...createModal, maxCapacity: Number(e.target.value) })}
                          className={inputCls} style={inputStyle} />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Cierre de reserva</label>
                          <button
                            type="button"
                            onClick={() => setCreateModal({ ...createModal, hasBookingCutoff: !createModal.hasBookingCutoff })}
                            className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
                            style={{ background: createModal.hasBookingCutoff ? "#4fc3f7" : "var(--card-border)" }}
                          >
                            <span className="inline-block h-4 w-4 transform rounded-full shadow transition-transform mt-0.5"
                              style={{ background: "var(--card)", marginLeft: createModal.hasBookingCutoff ? "18px" : "2px" }} />
                          </button>
                        </div>
                        {createModal.hasBookingCutoff ? (
                          <>
                            <div className="flex gap-2">
                              <input type="number" min={1} value={createModal.bookingCutoffValue}
                                onChange={e => setCreateModal({ ...createModal, bookingCutoffValue: Number(e.target.value) })}
                                className={inputCls + " flex-1"} style={inputStyle} />
                              <select value={createModal.bookingCutoffUnit}
                                onChange={e => setCreateModal({ ...createModal, bookingCutoffUnit: e.target.value as "minutes" | "hours" })}
                                className={inputCls + " flex-1"} style={inputStyle}>
                                <option value="minutes">minutos</option>
                                <option value="hours">horas</option>
                              </select>
                            </div>
                            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>antes del inicio</p>
                          </>
                        ) : (
                          <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "var(--background)", color: "var(--text-secondary)" }}>
                            Sin restricción — reserva abierta mientras haya cupos
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Modalidad</label>
                        <div className="flex gap-2">
                          {(["regular", "makeup_only"] as const).map(mode => (
                            <button key={mode} onClick={() => setCreateModal({ ...createModal, bookingMode: mode })}
                              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                              style={createModal.bookingMode === mode
                                ? { background: mode === "makeup_only" ? "#a78bfa" : "#4fc3f7", color: "#0a0a0f" }
                                : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                              {mode === "regular" ? "Normal" : "Solo recuperación"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nota (opcional)</label>
                    <input type="text" value={createModal.note} onChange={e => setCreateModal({ ...createModal, note: e.target.value })}
                      placeholder={createModal.eventType === "blocked_time" ? "ej. Acceso restringido" : "ej. Llevar mat"}
                      className={inputCls} style={inputStyle} />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setCreateModal(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleCreateClass}
                    disabled={creating || !createModal.name}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }}>
                    {creating ? "Creando..." : createModal.eventType === "blocked_time" ? "Crear bloqueo" : "Crear Clase"}
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
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
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
