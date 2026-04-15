"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Member, MemberRole, MemberStatus, ServiceType,
  MembershipPlan, MembershipStatus, PaymentStatus,
} from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin", coach: "Coach", member: "Miembro",
};
const ROLE_COLORS: Record<MemberRole, string> = {
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  coach: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  member: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};
const STATUS_COLORS: Record<MemberStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  inactive: "bg-zinc-600/30 text-zinc-400 border-zinc-600/30",
};
const SERVICE_LABELS: Record<ServiceType, string> = {
  group: "Grupal", personal_training: "Personal", kinesiology: "Kinesio", blocked_time: "Bloqueado",
};
const SERVICE_COLORS: Record<ServiceType, string> = {
  group: "bg-blue-500/10 text-blue-400",
  personal_training: "bg-orange-500/10 text-orange-400",
  kinesiology: "bg-purple-500/10 text-purple-400",
  blocked_time: "bg-zinc-700/30 text-zinc-500",
};
const PLAN_LABELS: Record<MembershipPlan, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};
const PLAN_DAYS: Record<MembershipPlan, number> = {
  mensual: 30, trimestral: 90, semestral: 180, anual: 365,
};
const MS_STATUS_LABELS: Record<MembershipStatus, string> = {
  active: "Activa", expired: "Vencida", cancelled: "Cancelada", pending: "Pendiente",
};
const PAY_LABELS: Record<PaymentStatus, string> = {
  paid: "Pagado", pending: "Pendiente", overdue: "Vencido",
};
const ALL_SERVICES: ServiceType[] = ["group", "personal_training", "kinesiology"];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function addDays(date: string, days: number): string {
  const d = new Date(date); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Form types ────────────────────────────────────────────────────────────
interface EditState {
  role: MemberRole; status: MemberStatus;
  assignedCoachId: string; assignedCoachName: string;
  contractedServices: ServiceType[];
}
interface NewMemberForm {
  name: string; email: string; role: MemberRole; status: MemberStatus;
  assignedCoachId: string; contractedServices: ServiceType[]; notes: string;
}
interface AddServiceForm {
  studentId: string; serviceType: ServiceType; plan: MembershipPlan;
  membershipStatus: MembershipStatus; paymentStatus: PaymentStatus;
  amount: string; startDate: string; endDate: string; coachId: string; notes: string;
}

const defaultNewMember = (): NewMemberForm => ({
  name: "", email: "", role: "member", status: "active",
  assignedCoachId: "", contractedServices: [], notes: "",
});
const defaultAddService = (studentId = ""): AddServiceForm => ({
  studentId, serviceType: "group", plan: "mensual",
  membershipStatus: "active", paymentStatus: "pending",
  amount: "1200", startDate: todayStr(), endDate: addDays(todayStr(), 30),
  coachId: "", notes: "",
});

// ─── Page ──────────────────────────────────────────────────────────────────
export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [activeCountMap, setActiveCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<MemberRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<MemberStatus | "all">("all");

  // Edit member
  const [editing, setEditing] = useState<Member | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // New member
  const [showNewMember, setShowNewMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState<NewMemberForm>(defaultNewMember());
  const [creating, setCreating] = useState(false);

  // Add service
  const [addServiceFor, setAddServiceFor] = useState<Member | null>(null);
  const [addServiceForm, setAddServiceForm] = useState<AddServiceForm>(defaultAddService());
  const [addingService, setAddingService] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const coaches = members.filter((m) => m.role === "coach");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [membersRes, msRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/memberships?status=active"),
    ]);
    const allMembers: Member[] = await membersRes.json();
    const activeMemberships: { studentId: string }[] = await msRes.json();
    const countMap: Record<string, number> = {};
    activeMemberships.forEach((ms) => {
      countMap[ms.studentId] = (countMap[ms.studentId] ?? 0) + 1;
    });
    setMembers(allMembers);
    setActiveCountMap(countMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = members.filter((m) => {
    if (filterRole !== "all" && m.role !== filterRole) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) &&
      !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── Edit member ─────────────────────────────────────────────────────────
  const openEdit = (m: Member) => {
    setEditing(m);
    setEditState({
      role: m.role, status: m.status,
      assignedCoachId: m.assignedCoachId ?? "", assignedCoachName: m.assignedCoachName ?? "",
      contractedServices: [...m.contractedServices],
    });
  };
  const toggleEditService = (svc: ServiceType) => {
    if (!editState) return;
    const has = editState.contractedServices.includes(svc);
    setEditState({
      ...editState,
      contractedServices: has
        ? editState.contractedServices.filter((s) => s !== svc)
        : [...editState.contractedServices, svc],
    });
  };
  const handleSave = async () => {
    if (!editing || !editState) return;
    setSaving(true);
    const coachObj = editState.assignedCoachId ? coaches.find((c) => c.id === editState.assignedCoachId) : null;
    const body: Partial<Member> = {
      role: editState.role, status: editState.status,
      contractedServices: editState.contractedServices,
      assignedCoachId: coachObj?.id,
      assignedCoachName: coachObj?.name,
    };
    const res = await fetch(`/api/members/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated: Member = await res.json();
      setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      showToast("Miembro actualizado");
    } else {
      showToast("Error al actualizar", false);
    }
    setSaving(false);
    setEditing(null);
    setEditState(null);
  };

  // ─── New member ──────────────────────────────────────────────────────────
  const toggleNewService = (svc: ServiceType) => {
    const has = newMemberForm.contractedServices.includes(svc);
    setNewMemberForm((f) => ({
      ...f,
      contractedServices: has
        ? f.contractedServices.filter((s) => s !== svc)
        : [...f.contractedServices, svc],
    }));
  };
  const handleCreateMember = async (andAddService = false) => {
    if (!newMemberForm.name.trim() || !newMemberForm.email.trim()) {
      showToast("Nombre y email son requeridos", false); return;
    }
    setCreating(true);
    const coachObj = newMemberForm.assignedCoachId
      ? coaches.find((c) => c.id === newMemberForm.assignedCoachId)
      : null;
    const body = {
      name: newMemberForm.name.trim(), email: newMemberForm.email.trim(),
      role: newMemberForm.role, status: newMemberForm.status,
      contractedServices: newMemberForm.contractedServices,
      ...(coachObj && { assignedCoachId: coachObj.id, assignedCoachName: coachObj.name }),
      ...(newMemberForm.notes.trim() && { notes: newMemberForm.notes.trim() }),
    };
    const res = await fetch("/api/members", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setCreating(false);
    if (res.ok) {
      const newMember: Member = await res.json();
      setMembers((prev) => [...prev, newMember]);
      setShowNewMember(false);
      setNewMemberForm(defaultNewMember());
      showToast("Miembro creado correctamente");
      if (andAddService) {
        setAddServiceFor(newMember);
        setAddServiceForm(defaultAddService(newMember.id));
      }
    } else {
      const err = await res.json();
      showToast(err.error || "Error al crear el miembro", false);
    }
  };

  // ─── Add service ─────────────────────────────────────────────────────────
  const openAddService = (m: Member) => {
    setAddServiceFor(m);
    setAddServiceForm(defaultAddService(m.id));
  };
  const handleAddService = async () => {
    if (!addServiceFor) return;
    setAddingService(true);
    const coachObj = addServiceForm.coachId
      ? coaches.find((c) => c.id === addServiceForm.coachId)
      : null;
    const body = {
      ...addServiceForm,
      amount: Number(addServiceForm.amount),
      ...(coachObj && { coachId: coachObj.id, coachName: coachObj.name }),
    };
    const res = await fetch("/api/memberships", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setAddingService(false);
    if (res.ok) {
      setAddServiceFor(null);
      showToast("Servicio agregado correctamente");
      await fetchData();
    } else {
      const err = await res.json();
      showToast(err.error || "Error al agregar servicio", false);
    }
  };

  // KPIs
  const totalMembers = members.filter((m) => m.role === "member").length;
  const activeMembers = members.filter((m) => m.role === "member" && m.status === "active").length;
  const totalCoaches = members.filter((m) => m.role === "coach").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.ok
            ? "bg-green-500/20 border border-green-500/30 text-green-400"
            : "bg-red-500/20 border border-red-500/30 text-red-400"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Miembros</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gestiona roles, servicios y asignaciones</p>
        </div>
        <button
          onClick={() => { setShowNewMember(true); setNewMemberForm(defaultNewMember()); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          + Nuevo miembro
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs font-medium mb-1">Total Miembros</p>
          <p className="text-2xl font-bold text-blue-400">{totalMembers}</p>
          <p className="text-zinc-600 text-xs mt-0.5">{activeMembers} activos</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs font-medium mb-1">Coaches</p>
          <p className="text-2xl font-bold text-orange-400">{totalCoaches}</p>
          <p className="text-zinc-600 text-xs mt-0.5">en plantilla</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-zinc-500 text-xs font-medium mb-1">Total Usuarios</p>
          <p className="text-2xl font-bold text-zinc-300">{members.length}</p>
          <p className="text-zinc-600 text-xs mt-0.5">en el sistema</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text" placeholder="Buscar por nombre o email..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as MemberRole | "all")}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
          <option value="all">Todos los roles</option>
          <option value="member">Miembro</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MemberStatus | "all")}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600">
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      <p className="text-zinc-600 text-xs mb-4">
        {loading ? "Cargando..." : `${filtered.length} usuario${filtered.length !== 1 ? "s" : ""}`}
      </p>

      {/* Members Table */}
      {loading ? (
        <div className="text-center py-24 text-zinc-600">Cargando miembros...</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">No se encontraron usuarios</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {filtered.map((m) => {
                const activeCount = activeCountMap[m.id] ?? 0;
                const visibleServices = m.contractedServices.filter((s) => s !== "blocked_time");
                return (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/40 transition-colors">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                      {initials(m.name)}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{m.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{m.email}</p>
                    </div>

                    {/* Role + Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[m.role]}`}>
                        {ROLE_LABELS[m.role]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[m.status]}`}>
                        {m.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Active services badge */}
                    {activeCount > 0 && (
                      <span className="hidden md:inline-flex text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 shrink-0">
                        {activeCount} activo{activeCount !== 1 ? "s" : ""}
                      </span>
                    )}

                    {/* Coach */}
                    <div className="hidden lg:block w-24 shrink-0">
                      {m.assignedCoachName
                        ? <p className="text-zinc-400 text-xs truncate">{m.assignedCoachName}</p>
                        : <p className="text-zinc-700 text-xs">—</p>}
                    </div>

                    {/* Service pills */}
                    <div className="hidden xl:flex items-center gap-1 shrink-0">
                      {visibleServices.slice(0, 2).map((s) => (
                        <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-medium ${SERVICE_COLORS[s]}`}>
                          {SERVICE_LABELS[s]}
                        </span>
                      ))}
                      {visibleServices.length > 2 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                          +{visibleServices.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/profile?userId=${m.id}`}
                        className="text-xs text-zinc-500 hover:text-blue-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-zinc-800/60">
                        Perfil
                      </Link>
                      <button
                        onClick={() => openAddService(m)}
                        className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg transition-colors font-medium border border-emerald-500/20"
                      >
                        + Servicio
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── New Member Modal ──────────────────────────────────────────────── */}
      {showNewMember && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowNewMember(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">Nuevo Miembro</h2>
                <button onClick={() => setShowNewMember(false)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Nombre *</label>
                    <input type="text" placeholder="Nombre completo"
                      value={newMemberForm.name}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Email *</label>
                    <input type="email" placeholder="email@ejemplo.com"
                      value={newMemberForm.email}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Rol</label>
                    <select value={newMemberForm.role}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, role: e.target.value as MemberRole, assignedCoachId: "" }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      <option value="member">Miembro</option>
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Estado</label>
                    <select value={newMemberForm.status}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, status: e.target.value as MemberStatus }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>

                {newMemberForm.role === "member" && (
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Coach asignado</label>
                    <select value={newMemberForm.assignedCoachId}
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, assignedCoachId: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      <option value="">Sin coach asignado</option>
                      {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-2">Servicios contratados (opcional)</label>
                  <div className="flex gap-2 flex-wrap">
                    {ALL_SERVICES.map((svc) => {
                      const active = newMemberForm.contractedServices.includes(svc);
                      return (
                        <button key={svc} type="button" onClick={() => toggleNewService(svc)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                            active
                              ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                          }`}>
                          {SERVICE_LABELS[svc]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Observaciones (opcional)</label>
                  <textarea value={newMemberForm.notes} rows={2} placeholder="Notas internas..."
                    onChange={(e) => setNewMemberForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowNewMember(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={() => handleCreateMember(false)} disabled={creating}
                  className="flex-1 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {creating ? "Guardando..." : "Guardar"}
                </button>
                <button onClick={() => handleCreateMember(true)} disabled={creating}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {creating ? "..." : "Guardar + Servicio →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Service Modal ────────────────────────────────────────────── */}
      {addServiceFor && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setAddServiceFor(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-white">Añadir Servicio</h2>
                <button onClick={() => setAddServiceFor(null)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
              </div>
              <p className="text-zinc-500 text-xs mb-6">
                Para: <span className="text-zinc-300 font-medium">{addServiceFor.name}</span>
              </p>

              <div className="space-y-4">
                {/* Service type */}
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-2">Tipo de servicio</label>
                  <div className="flex gap-2 flex-wrap">
                    {ALL_SERVICES.map((svc) => (
                      <button key={svc} type="button"
                        onClick={() => setAddServiceForm((f) => ({ ...f, serviceType: svc }))}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                          addServiceForm.serviceType === svc
                            ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                            : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                        }`}>
                        {SERVICE_LABELS[svc]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan + amount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Plan</label>
                    <select value={addServiceForm.plan}
                      onChange={(e) => {
                        const plan = e.target.value as MembershipPlan;
                        const endDate = addDays(addServiceForm.startDate || todayStr(), PLAN_DAYS[plan]);
                        setAddServiceForm((f) => ({ ...f, plan, endDate }));
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      {(["mensual", "trimestral", "semestral", "anual"] as const).map((v) => (
                        <option key={v} value={v}>{PLAN_LABELS[v]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Monto ($)</label>
                    <input type="number" value={addServiceForm.amount}
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                {/* Membership + payment status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Estado membresía</label>
                    <select value={addServiceForm.membershipStatus}
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, membershipStatus: e.target.value as MembershipStatus }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      {(["active", "pending", "expired", "cancelled"] as const).map((v) => (
                        <option key={v} value={v}>{MS_STATUS_LABELS[v]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Estado pago</label>
                    <select value={addServiceForm.paymentStatus}
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      {(["paid", "pending", "overdue"] as const).map((v) => (
                        <option key={v} value={v}>{PAY_LABELS[v]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Fecha inicio</label>
                    <input type="date" value={addServiceForm.startDate}
                      onChange={(e) => {
                        const startDate = e.target.value;
                        const endDate = addDays(startDate, PLAN_DAYS[addServiceForm.plan]);
                        setAddServiceForm((f) => ({ ...f, startDate, endDate }));
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Fecha fin</label>
                    <input type="date" value={addServiceForm.endDate}
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, endDate: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                {/* Coach (for PT or Kinesio) */}
                {(addServiceForm.serviceType === "personal_training" || addServiceForm.serviceType === "kinesiology") && (
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Coach / Profesional</label>
                    <select value={addServiceForm.coachId}
                      onChange={(e) => setAddServiceForm((f) => ({ ...f, coachId: e.target.value }))}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      <option value="">Sin asignar</option>
                      {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Notas (opcional)</label>
                  <textarea value={addServiceForm.notes} rows={2} placeholder="Observaciones del servicio..."
                    onChange={(e) => setAddServiceForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setAddServiceFor(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={handleAddService} disabled={addingService}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {addingService ? "Guardando..." : "Agregar servicio"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Member Modal ─────────────────────────────────────────────── */}
      {editing && editState && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">{editing.name}</h2>
                  <p className="text-zinc-500 text-xs mt-0.5">{editing.email}</p>
                </div>
                <button onClick={() => setEditing(null)} className="text-zinc-500 hover:text-white text-2xl leading-none">×</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Rol</label>
                  <select value={editState.role}
                    onChange={(e) => setEditState({ ...editState, role: e.target.value as MemberRole })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                    <option value="member">Miembro</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Estado</label>
                  <select value={editState.status}
                    onChange={(e) => setEditState({ ...editState, status: e.target.value as MemberStatus })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                {editState.role === "member" && (
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Coach asignado</label>
                    <select value={editState.assignedCoachId}
                      onChange={(e) => setEditState({ ...editState, assignedCoachId: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500">
                      <option value="">Sin coach asignado</option>
                      {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-2">Servicios contratados</label>
                  <div className="flex gap-2 flex-wrap">
                    {ALL_SERVICES.map((svc) => {
                      const active = editState.contractedServices.includes(svc);
                      return (
                        <button key={svc} type="button" onClick={() => toggleEditService(svc)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                            active
                              ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                          }`}>
                          {SERVICE_LABELS[svc]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setEditing(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
