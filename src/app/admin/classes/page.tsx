"use client";

import { useState, useEffect, useCallback } from "react";
import { GymClass, Reservation, ServiceType, DayOfWeek } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const SERVICE_LABELS: Record<ServiceType, string> = {
  group: "Grupal", personal_training: "Personal",
  kinesiology: "Kinesio", blocked_time: "Bloqueado",
};
const SERVICE_COLORS: Record<ServiceType, string> = {
  group: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  personal_training: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  kinesiology: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  blocked_time: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const ATTENDANCE_COLORS: Record<string, string> = {
  reserved: "text-zinc-400",
  attended: "text-green-400",
  absent: "text-red-400",
  cancelled: "text-zinc-600",
};

const EMPTY_FORM = {
  name: "", serviceType: "group" as ServiceType,
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

// ─── Page ──────────────────────────────────────────────────────────────────
export default function AdminClassesPage() {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<GymClass | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cRes, rRes] = await Promise.all([
      fetch("/api/classes"),
      fetch("/api/reservations"),
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

  // ─── KPIs ────────────────────────────────────────────────────────────────
  const active = classes.filter((c) => c.status === "active");
  const totalCapacity = active.reduce((s, c) => s + c.maxCapacity, 0);
  const totalReserved = active.reduce((s, c) => s + c.reservedCount, 0);
  const avgOccupancy = active.length > 0
    ? Math.round(active.reduce((s, c) => s + (c.reservedCount / c.maxCapacity) * 100, 0) / active.length)
    : 0;
  const todayReservations = reservations.filter((r) => {
    const today = new Date();
    return r.classDate === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  // ─── Modal helpers ───────────────────────────────────────────────────────
  const openCreate = () => { setEditingClass(null); setForm(EMPTY_FORM); setIsModalOpen(true); };
  const openEdit = (cls: GymClass) => {
    setEditingClass(cls);
    setForm({ name: cls.name, serviceType: cls.serviceType, dayOfWeek: cls.dayOfWeek, startTime: cls.startTime, endTime: cls.endTime, coach: cls.coach, maxCapacity: cls.maxCapacity, note: cls.note || "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.startTime || !form.endTime || !form.coach) {
      setToast({ msg: "Completa los campos requeridos", ok: false }); return;
    }
    setSaving(true);
    const method = editingClass ? "PUT" : "POST";
    const url = editingClass ? `/api/classes/${editingClass.id}` : "/api/classes";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
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
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReservations((prev) => prev.map((r) => r.id === reservationId ? updated : r));
      setToast({ msg: status === "attended" ? "Asistencia marcada" : "Ausencia marcada", ok: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Clases</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Administra horarios, cupos y asistencia</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
          + Nueva Clase
        </button>
      </div>

      {/* ─── KPIs ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Clases activas", value: active.length, sub: `${classes.length} totales` },
          { label: "Ocupación promedio", value: `${avgOccupancy}%`, sub: `${totalReserved}/${totalCapacity} cupos` },
          { label: "Reservas hoy", value: todayReservations.length, sub: "esta semana" },
          { label: "Clases canceladas", value: classes.filter((c) => c.status === "cancelled").length, sub: "de total" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-600">Cargando clases...</div>
      ) : (
        /* ─── Classes by Day ─────────────────────────────────────────────── */
        <div className="space-y-8">
          {DAY_NAMES.map((dayName, dayIdx) => {
            const dayClasses = classes.filter((c) => c.dayOfWeek === dayIdx).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (dayClasses.length === 0) return null;
            return (
              <div key={dayName}>
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">{dayName}</h2>
                <div className="space-y-2">
                  {dayClasses.map((cls) => {
                    const pct = cls.maxCapacity > 0 ? (cls.reservedCount / cls.maxCapacity) * 100 : 0;
                    const classReservations = reservations.filter(
                      (r) => r.classId === cls.id && r.classDate === weekDateForDay(cls.dayOfWeek) && r.status !== "cancelled"
                    );
                    const isExpanded = expandedId === cls.id;

                    return (
                      <div key={cls.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        {/* Class row */}
                        <div className="flex items-center gap-3 p-4">
                          {/* Type badge */}
                          <span className={`text-xs px-2 py-0.5 rounded border font-medium shrink-0 ${SERVICE_COLORS[cls.serviceType]}`}>
                            {SERVICE_LABELS[cls.serviceType]}
                          </span>

                          {/* Name + details */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{cls.name}</p>
                            <p className="text-zinc-500 text-xs">{cls.startTime}–{cls.endTime} · {cls.coach}</p>
                          </div>

                          {/* Occupancy bar */}
                          <div className="hidden sm:flex flex-col items-end gap-1 w-32 shrink-0">
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex-1 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500"}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-400 shrink-0">{Math.round(pct)}%</span>
                            </div>
                            <p className="text-zinc-600 text-xs">{cls.reservedCount}/{cls.maxCapacity}</p>
                          </div>

                          {/* Status badge */}
                          <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_COLORS[cls.status]}`}>
                            {cls.status === "active" ? "Activa" : "Cancelada"}
                          </span>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : cls.id)}
                              className="px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Ver inscritos"
                            >
                              {isExpanded ? "▲" : `▼ ${classReservations.length}`}
                            </button>
                            <button onClick={() => openEdit(cls)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title="Editar">✏️</button>
                            <button onClick={() => handleToggleStatus(cls)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors" title={cls.status === "active" ? "Cancelar clase" : "Activar clase"}>
                              {cls.status === "active" ? "⏸" : "▶️"}
                            </button>
                            <button onClick={() => handleDelete(cls.id)} className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors" title="Eliminar">🗑</button>
                          </div>
                        </div>

                        {/* ─── Attendance panel ─────────────────────────── */}
                        {isExpanded && (
                          <div className="border-t border-zinc-800 bg-zinc-950/50">
                            <div className="px-4 py-2 flex items-center justify-between">
                              <p className="text-xs font-medium text-zinc-400">Inscritos — {weekDateForDay(cls.dayOfWeek)}</p>
                              <p className="text-xs text-zinc-600">{classReservations.length} alumnos</p>
                            </div>
                            {classReservations.length === 0 ? (
                              <p className="text-xs text-zinc-600 px-4 pb-4">Sin reservas para esta fecha.</p>
                            ) : (
                              <div className="divide-y divide-zinc-800">
                                {classReservations.map((r) => (
                                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                                      {r.studentName.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm text-white font-medium truncate">{r.studentName}</p>
                                      <p className="text-xs text-zinc-600 truncate">{r.studentEmail}</p>
                                    </div>
                                    <span className={`text-xs font-medium ${ATTENDANCE_COLORS[r.status]}`}>
                                      {r.status === "reserved" ? "Reservado" : r.status === "attended" ? "Asistió" : r.status === "absent" ? "Ausente" : "Cancelado"}
                                    </span>
                                    {(r.status === "reserved" || r.status === "attended" || r.status === "absent") && (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => handleAttendance(r.id, "attended")}
                                          className={`text-xs px-2 py-0.5 rounded transition-colors ${r.status === "attended" ? "bg-green-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-green-600/20 hover:text-green-400"}`}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={() => handleAttendance(r.id, "absent")}
                                          className={`text-xs px-2 py-0.5 rounded transition-colors ${r.status === "absent" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-red-600/20 hover:text-red-400"}`}
                                        >
                                          ✗
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 sticky top-0 bg-zinc-900">
              <h2 className="text-lg font-bold text-white">{editingClass ? "Editar Clase" : "Nueva Clase"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white text-2xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nombre *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="ej. Funcional 6am"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tipo de clase</label>
                  <select value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value as ServiceType })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    <option value="group">Grupal</option>
                    <option value="personal_training">Personal</option>
                    <option value="kinesiology">Kinesio</option>
                    <option value="blocked_time">Bloqueado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Día de la semana</label>
                  <select value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: Number(e.target.value) as DayOfWeek })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Hora inicio *</label>
                  <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Hora fin *</label>
                  <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Coach *</label>
                  <input value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })}
                    placeholder="Nombre del coach"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Capacidad máxima</label>
                  <input type="number" min={1} value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: Number(e.target.value) })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Nota (opcional)</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={2} placeholder="Información adicional..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none" />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {saving ? "Guardando..." : editingClass ? "Guardar cambios" : "Crear clase"}
              </button>
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
