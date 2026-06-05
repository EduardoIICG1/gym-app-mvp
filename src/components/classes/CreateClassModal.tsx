"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { ServiceType, EventType } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES  = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_INITIALS = ["L", "M", "X", "J", "V", "S"];

function countOccurrences(
  startDate: string,
  endDate: string,
  weekdays: number[],
  limit = 60,
): number {
  const start = new Date(startDate + "T00:00:00");
  const end   = new Date(endDate   + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end || weekdays.length === 0) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end && count < limit) {
    const jsDay = cursor.getDay();
    const feDay = jsDay === 0 ? 6 : jsDay - 1;
    if (weekdays.includes(feDay)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputCls = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors";
const inputStyle: React.CSSProperties = {
  background: "var(--background)",
  border: "1px solid var(--card-border)",
  color: "var(--text-primary)",
};

// ─── 24h TimePicker ───────────────────────────────────────────────────────────

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = value.match(/^(\d{1,2}):(\d{2})$/);
  const h = parts ? parseInt(parts[1], 10) : 9;
  const m = parts ? parseInt(parts[2], 10) : 0;

  const update = (newH: number, newM: number) =>
    onChange(`${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`);

  return (
    <div className="flex items-center gap-1">
      <select
        value={h}
        onChange={e => update(Number(e.target.value), m)}
        className="flex-1 px-2 py-2.5 rounded-xl text-sm outline-none text-center"
        style={inputStyle}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
        ))}
      </select>
      <span className="text-sm font-bold shrink-0" style={{ color: "var(--text-secondary)" }}>:</span>
      <select
        value={m}
        onChange={e => update(h, Number(e.target.value))}
        className="flex-1 px-2 py-2.5 rounded-xl text-sm outline-none text-center"
        style={inputStyle}
      >
        {[0, 15, 30, 45].map(min => (
          <option key={min} value={min}>{String(min).padStart(2, "00")}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  eventType: EventType;
  serviceType: ServiceType;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  coach: string;
  maxCapacity: number;
  note: string;
  hasBookingCutoff: boolean;
  bookingCutoffValue: number;
  bookingCutoffUnit: "minutes" | "hours";
  bookingMode: "regular" | "makeup_only";
}

function defaultForm(dayOfWeek: number, isKine: boolean, coachName: string): FormState {
  return {
    name: "", eventType: "class",
    serviceType: isKine ? "kinesiology" : "group",
    dayOfWeek,
    startTime: "09:00", endTime: "10:00",
    coach: isKine ? coachName : "",
    maxCapacity: 20, note: "",
    hasBookingCutoff: true, bookingCutoffValue: 3, bookingCutoffUnit: "hours",
    bookingMode: "regular",
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CreateClassModalProps {
  coaches: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
  onToast: (msg: string, ok: boolean) => void;
  initialDayOfWeek?: number;
  isKine?: boolean;
  currentUserName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateClassModal({
  coaches,
  onClose,
  onSuccess,
  onToast,
  initialDayOfWeek = 0,
  isKine = false,
  currentUserName = "",
}: CreateClassModalProps) {
  const [form, setForm] = useState<FormState>(() =>
    defaultForm(initialDayOfWeek, isKine, currentUserName),
  );
  const [recurMode, setRecurMode] = useState<"none" | "weekly">("none");
  const [recur, setRecur] = useState({
    weekdays: [initialDayOfWeek],
    startDate: toDateStr(new Date()),
    endDate: toDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  });
  const [saving, setSaving] = useState(false);

  const setF = (partial: Partial<FormState>) => setForm(f => ({ ...f, ...partial }));

  const occurrenceCount = useMemo(
    () => recurMode === "weekly"
      ? countOccurrences(recur.startDate, recur.endDate, recur.weekdays)
      : 0,
    [recurMode, recur.startDate, recur.endDate, recur.weekdays],
  );

  const isWeeklyCreate    = recurMode === "weekly" && form.eventType !== "blocked_time";
  const cannotSubmitWeekly = isWeeklyCreate && occurrenceCount === 0;

  // ── Single class ────────────────────────────────────────────────────────────
  const handleSingle = async () => {
    if (!form.name || (!isKine && !form.coach)) return;
    setSaving(true);
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      onToast("Clase creada", true);
      onSuccess();
      onClose();
    } else {
      onToast((data as { error?: string }).error || "Error al crear", false);
    }
    setSaving(false);
  };

  // ── Batch (weekly recurrence) ───────────────────────────────────────────────
  const handleBatch = async () => {
    if (!form.name || (!isKine && !form.coach)) return;
    if (recur.weekdays.length === 0) {
      onToast("Selecciona al menos un día de la semana", false); return;
    }
    if (!recur.startDate || !recur.endDate) {
      onToast("Selecciona fecha de inicio y fin", false); return;
    }
    setSaving(true);
    const res = await fetch("/api/classes/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        serviceType: form.serviceType,
        eventType: form.eventType,
        coach: form.coach || undefined,
        startTime: form.startTime,
        endTime: form.endTime,
        maxCapacity: form.maxCapacity,
        note: form.note || undefined,
        recurrence: {
          weekdays: recur.weekdays,
          startDate: recur.startDate,
          endDate: recur.endDate,
        },
      }),
    });
    const data = await res.json();
    if (res.ok) {
      const created = Number((data.summary as Record<string, unknown>)?.created ?? 0);
      const skipped = Number((data.summary as Record<string, unknown>)?.skipped ?? 0);
      if (created === 0) {
        onToast(
          skipped > 0
            ? "No se crearon clases. Todas las fechas tienen conflicto."
            : "No se crearon clases. Revisa la repetición seleccionada.",
          false,
        );
        setSaving(false);
        return;
      }
      onToast(
        skipped > 0
          ? `${created} clases creadas. ${skipped} omitidas por conflicto.`
          : `${created} clase${created !== 1 ? "s" : ""} creada${created !== 1 ? "s" : ""}`,
        true,
      );
      onSuccess();
      onClose();
    } else {
      onToast((data as { error?: string }).error || "Error al crear clases", false);
    }
    setSaving(false);
  };

  const handleSubmit = isWeeklyCreate ? handleBatch : handleSingle;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        key="create-class-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                {form.eventType === "blocked_time" ? "Nuevo tiempo bloqueado" : "Nueva Clase"}
              </h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5" style={{ color: "var(--text-secondary)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de evento */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo de evento</label>
                <div className="flex gap-2">
                  {(["class", "blocked_time"] as const).map(et => (
                    <button key={et} type="button" onClick={() => {
                      setF({ eventType: et });
                      if (et === "blocked_time") setRecurMode("none");
                    }}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={form.eventType === et
                        ? { background: et === "blocked_time" ? "#71717a" : "#4fc3f7", color: "#0a0a0f" }
                        : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                      {et === "class" ? "Clase" : "Tiempo bloqueado"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
                <input type="text" value={form.name} onChange={e => setF({ name: e.target.value })}
                  placeholder={form.eventType === "blocked_time" ? "ej. Mantenimiento de equipo" : "ej. Funcional 6am"}
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Instructor — hidden when KINESIOLOGIST (auto-assigned) */}
              {!isKine && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor *</label>
                  <select value={form.coach} onChange={e => setF({ coach: e.target.value })}
                    className={inputCls} style={inputStyle}>
                    <option value="">— Seleccionar instructor —</option>
                    {coaches.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Tipo de clase */}
                {form.eventType !== "blocked_time" && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Tipo</label>
                    {isKine ? (
                      <div className={inputCls} style={{ ...inputStyle, opacity: 0.7, display: "flex", alignItems: "center" }}>
                        Kinesiología
                      </div>
                    ) : (
                      <select value={form.serviceType} onChange={e => setF({ serviceType: e.target.value as ServiceType })}
                        className={inputCls} style={inputStyle}>
                        <option value="group">Grupal</option>
                        <option value="personal_training">Personal</option>
                        <option value="kinesiology">Kinesiología</option>
                      </select>
                    )}
                  </div>
                )}

                {/* Día — deshabilitado en modo semanal */}
                <div className={form.eventType === "blocked_time" ? "col-span-2" : ""}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Día</label>
                  {recurMode === "weekly" ? (
                    <div className={inputCls} style={{ ...inputStyle, opacity: 0.45, fontSize: "0.68rem", display: "flex", alignItems: "center" }}>
                      Los días se definen en la repetición
                    </div>
                  ) : (
                    <select value={form.dayOfWeek} onChange={e => setF({ dayOfWeek: Number(e.target.value) })}
                      className={inputCls} style={inputStyle}>
                      {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Hora inicio / fin — selector 24h */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Inicio</label>
                  <TimePicker value={form.startTime} onChange={v => setF({ startTime: v })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Fin</label>
                  <TimePicker value={form.endTime} onChange={v => setF({ endTime: v })} />
                </div>
              </div>

              {form.eventType !== "blocked_time" && (
                <>
                  {/* Capacidad */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Capacidad</label>
                    <input type="number" min={1} value={form.maxCapacity}
                      onChange={e => setF({ maxCapacity: Number(e.target.value) })}
                      className={inputCls} style={inputStyle} />
                  </div>

                  {/* Cierre de reserva */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Cierre de reserva</label>
                      <button type="button"
                        onClick={() => setF({ hasBookingCutoff: !form.hasBookingCutoff })}
                        className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
                        style={{ background: form.hasBookingCutoff ? "#4fc3f7" : "var(--card-border)" }}
                      >
                        <span className="inline-block h-4 w-4 transform rounded-full shadow transition-transform mt-0.5"
                          style={{ background: "var(--card)", marginLeft: form.hasBookingCutoff ? "18px" : "2px" }} />
                      </button>
                    </div>
                    {form.hasBookingCutoff ? (
                      <>
                        <div className="flex gap-2">
                          <input type="number" min={1} value={form.bookingCutoffValue}
                            onChange={e => setF({ bookingCutoffValue: Number(e.target.value) })}
                            className={inputCls + " flex-1"} style={inputStyle} />
                          <select value={form.bookingCutoffUnit}
                            onChange={e => setF({ bookingCutoffUnit: e.target.value as "minutes" | "hours" })}
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

                  {/* Modalidad */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Modalidad</label>
                    <div className="flex gap-2">
                      {(["regular", "makeup_only"] as const).map(mode => (
                        <button key={mode} type="button" onClick={() => setF({ bookingMode: mode })}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                          style={form.bookingMode === mode
                            ? { background: mode === "makeup_only" ? "#a78bfa" : "#4fc3f7", color: "#0a0a0f" }
                            : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                          {mode === "regular" ? "Normal" : "Solo recuperación"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Nota */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nota (opcional)</label>
                <input type="text" value={form.note} onChange={e => setF({ note: e.target.value })}
                  placeholder={form.eventType === "blocked_time" ? "ej. Acceso restringido" : "ej. Llevar mat"}
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Repetición — solo para clases */}
              {form.eventType !== "blocked_time" && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Repetición</label>
                  <div className="flex gap-2">
                    {(["none", "weekly"] as const).map(mode => (
                      <button key={mode} type="button"
                        onClick={() => setRecurMode(mode)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                        style={recurMode === mode
                          ? { background: "#4fc3f7", color: "#0a0a0f" }
                          : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                        {mode === "none" ? "No se repite" : "Repetir semanalmente"}
                      </button>
                    ))}
                  </div>
                  {recurMode === "none" && (
                    <p className="text-xs mt-2" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                      Crea una sesión para la próxima fecha del día seleccionado.
                    </p>
                  )}

                  {recurMode === "weekly" && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>Días de la semana</p>
                        <div className="flex gap-1.5">
                          {DAY_INITIALS.map((d, i) => (
                            <button key={i} type="button"
                              onClick={() => {
                                const next = recur.weekdays.includes(i)
                                  ? recur.weekdays.filter(w => w !== i)
                                  : [...recur.weekdays, i].sort((a, b) => a - b);
                                setRecur(r => ({ ...r, weekdays: next }));
                              }}
                              className="w-8 h-8 rounded-full text-xs font-bold transition-all"
                              style={recur.weekdays.includes(i)
                                ? { background: "#4fc3f7", color: "#0a0a0f" }
                                : { background: "var(--card-border)", color: "var(--text-secondary)" }}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Desde</label>
                          <input type="date" value={recur.startDate}
                            onChange={e => setRecur(r => ({ ...r, startDate: e.target.value }))}
                            className={inputCls} style={inputStyle} />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>Hasta</label>
                          <input type="date" value={recur.endDate}
                            onChange={e => setRecur(r => ({ ...r, endDate: e.target.value }))}
                            className={inputCls} style={inputStyle} />
                        </div>
                      </div>

                      <p className="text-xs px-3 py-2 rounded-lg"
                        style={{ background: "var(--background)", color: occurrenceCount > 0 ? "#4fc3f7" : "var(--text-secondary)" }}>
                        {occurrenceCount > 0
                          ? `Se crearán ${occurrenceCount} clase${occurrenceCount !== 1 ? "s" : ""} (máx. 60)`
                          : "Selecciona días y fechas para ver el total"}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex gap-3 mt-6">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={saving || !form.name || (!isKine && !form.coach) || cannotSubmitWeekly}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }}>
                {saving
                  ? "Creando..."
                  : form.eventType === "blocked_time"
                    ? "Crear bloqueo"
                    : isWeeklyCreate && occurrenceCount === 0
                      ? "Selecciona fechas"
                      : isWeeklyCreate
                        ? `Crear ${occurrenceCount} clase${occurrenceCount !== 1 ? "s" : ""}`
                        : "Crear Clase"}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
