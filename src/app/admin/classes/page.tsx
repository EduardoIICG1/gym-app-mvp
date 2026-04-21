"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Play, Pause } from "lucide-react";
import { GymClass, Reservation, ServiceType, DayOfWeek, EventType, Member } from "@/lib/types";
import { ServiceBadge } from "@/components/Badge";
import { DAY_NAMES } from "@/lib/labels";

const EMPTY_FORM = {
  name: "", eventType: "class" as EventType, serviceType: "group" as ServiceType,
  dayOfWeek: 0 as DayOfWeek, startTime: "", endTime: "",
  coach: "", maxCapacity: 20, note: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function getMondayStr() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}
function weekDateForDay(dayOfWeek: number) {
  const monday = new Date(getMondayStr() + "T00:00:00");
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayOfWeek);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, rRes, coachRes] = await Promise.all([
      fetch("/api/classes"),
      fetch("/api/reservations"),
      fetch("/api/members?includesRole=coach"),
    ]);
    setClasses(await cRes.json());
    setReservations(await rRes.json());
    const coachMembers: Member[] = await coachRes.json();
    setCoaches(coachMembers.map(m => ({ id: m.id, name: m.name })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

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
  const openCreate = () => { setEditingClass(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (cls: GymClass) => {
    setEditingClass(cls);
    setForm({ name: cls.name, eventType: cls.eventType ?? "class", serviceType: cls.serviceType, dayOfWeek: cls.dayOfWeek, startTime: cls.startTime, endTime: cls.endTime, coach: cls.coach, maxCapacity: cls.maxCapacity, note: cls.note || "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startTime || !form.endTime || !form.coach) {
      setToast({ msg: "Completa los campos requeridos", ok: false }); return;
    }
    setSaving(true);
    const method = editingClass ? "PUT" : "POST";
    const url = editingClass ? `/api/classes/${editingClass.id}` : "/api/classes";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      await fetchData();
      setIsModalOpen(false);
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

  const handleAttendance = async (reservationId: string, status: "attended" | "absent") => {
    const res = await fetch(`/api/reservations/${reservationId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReservations((prev) => prev.map((r) => r.id === reservationId ? updated : r));
      setToast({ msg: status === "attended" ? "Asistencia marcada" : "Ausencia marcada", ok: true });
    }
  };

  const kpis = [
    { label: "Clases activas", value: active.length, sub: `${classes.length} totales`, accent: "#4fc3f7" },
    { label: "Ocupación promedio", value: `${avgOccupancy}%`, sub: `${totalReserved}/${totalCapacity} cupos`, accent: "#22c55e" },
    { label: "Reservas hoy", value: todayReservations.length, sub: "esta semana", accent: "#f97316" },
    { label: "Canceladas", value: classes.filter((c) => c.status === "cancelled").length, sub: "de total", accent: "#ef4444" },
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

      {loading ? (
        <div className="text-center py-20" style={{ color: "var(--text-secondary)" }}>Cargando clases...</div>
      ) : (
        <div className="space-y-8">
          {DAY_NAMES.map((dayName, dayIdx) => {
            const dayClasses = classes.filter((c) => c.dayOfWeek === dayIdx).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (dayClasses.length === 0) return null;
            return (
              <div key={dayName}>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)" }}>
                  {dayName}
                </h2>
                <div className="space-y-2">
                  {dayClasses.map((cls) => {
                    const isBlocked = cls.eventType === "blocked_time";
                    const pct = !isBlocked && cls.maxCapacity > 0 ? (cls.reservedCount / cls.maxCapacity) * 100 : 0;
                    const barColor = pct >= 100 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#22c55e";
                    const classReservations = isBlocked ? [] : reservations.filter(
                      (r) => r.classId === cls.id && r.classDate === weekDateForDay(cls.dayOfWeek) && r.status !== "cancelled"
                    );
                    const isExpanded = expandedId === cls.id;

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
                        {/* Class row */}
                        <div className="flex items-center gap-3 p-4">
                          {isBlocked
                            ? <span className="text-xs px-2 py-0.5 rounded font-semibold shrink-0" style={{ background: "#71717a30", color: "#71717a" }}>Bloqueado</span>
                            : <ServiceBadge type={cls.serviceType} />
                          }

                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cls.startTime}–{cls.endTime} · {cls.coach}</p>
                          </div>

                          {/* Occupancy bar — only for real classes */}
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

                          {/* Status */}
                          <span
                            className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
                            style={cls.status === "active"
                              ? { background: "#22c55e20", color: "#22c55e" }
                              : { background: "#ef444420", color: "#ef4444" }}
                          >
                            {cls.status === "active" ? "Activa" : "Cancelada"}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {!isBlocked && (
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : cls.id)}
                                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                                style={{ color: "var(--text-secondary)" }}
                                title="Ver inscritos"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
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

                        {/* Attendance panel */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                              style={{ borderTop: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)" }}
                            >
                              <div className="px-4 py-2 flex items-center justify-between">
                                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                                  Inscritos — {weekDateForDay(cls.dayOfWeek)}
                                </p>
                                <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>{classReservations.length} alumnos</p>
                              </div>
                              {classReservations.length === 0 ? (
                                <p className="text-xs px-4 pb-4" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>Sin reservas para esta fecha.</p>
                              ) : (
                                <div style={{ borderTop: "1px solid var(--card-border)" }}>
                                  {classReservations.map((r) => (
                                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid var(--card-border)" }}>
                                      <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                        style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                                      >
                                        {r.studentName.charAt(0)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{r.studentName}</p>
                                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{r.studentEmail}</p>
                                      </div>
                                      <span className="text-xs font-medium" style={{
                                        color: r.status === "attended" ? "#22c55e" : r.status === "absent" ? "#ef4444" : "var(--text-secondary)"
                                      }}>
                                        {r.status === "reserved" ? "Reservado" : r.status === "attended" ? "Asistió" : r.status === "absent" ? "Ausente" : "Cancelado"}
                                      </span>
                                      {(r.status === "reserved" || r.status === "attended" || r.status === "absent") && (
                                        <div className="flex gap-1">
                                          <button
                                            onClick={() => handleAttendance(r.id, "attended")}
                                            className="text-xs px-2 py-0.5 rounded transition-colors font-semibold"
                                            style={r.status === "attended"
                                              ? { background: "#22c55e", color: "#fff" }
                                              : { background: "var(--card-border)", color: "var(--text-secondary)" }}
                                          >✓</button>
                                          <button
                                            onClick={() => handleAttendance(r.id, "absent")}
                                            className="text-xs px-2 py-0.5 rounded transition-colors font-semibold"
                                            style={r.status === "absent"
                                              ? { background: "#ef4444", color: "#fff" }
                                              : { background: "var(--card-border)", color: "var(--text-secondary)" }}
                                          >✗</button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setIsModalOpen(false)}
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
                <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  {editingClass
                    ? (form.eventType === "blocked_time" ? "Editar bloqueo" : "Editar Clase")
                    : (form.eventType === "blocked_time" ? "Nuevo tiempo bloqueado" : "Nueva Clase")}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
              </div>
              <div className="p-6 space-y-4">
                {/* Event type toggle */}
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
                <button
                  onClick={handleSave} disabled={saving}
                  className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
                >
                  {saving ? "Guardando..." : editingClass
                    ? "Guardar cambios"
                    : form.eventType === "blocked_time" ? "Crear bloqueo" : "Crear clase"}
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
