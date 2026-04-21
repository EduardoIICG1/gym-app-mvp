"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, UserPlus } from "lucide-react";
import {
  Member, MemberRole, MemberStatus, ServiceType,
  MembershipPlan, MembershipStatus, PaymentStatus,
} from "@/lib/types";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { RoleBadge } from "@/components/Badge";
import {
  SERVICE_LABELS,
  MEMBERSHIP_STATUS_LABELS as MS_STATUS_LABELS,
  PAYMENT_STATUS_LABELS as PAY_LABELS,
} from "@/lib/labels";

// ─── Constants ─────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<MembershipPlan, string> = {
  mensual: "Mensual", trimestral: "Trimestral", semestral: "Semestral", anual: "Anual",
};
const PLAN_DAYS: Record<MembershipPlan, number> = {
  mensual: 30, trimestral: 90, semestral: 180, anual: 365,
};
const ALL_SERVICES: ServiceType[] = ["group", "personal_training", "kinesiology"];

const ROLE_COLOR: Record<MemberRole, string> = {
  admin: "#4fc3f7", coach: "#22c55e", member: "#71717a",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function addDays(date: string, days: number): string {
  const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}

interface EditState {
  name: string; email: string; role: MemberRole; status: MemberStatus;
  assignedCoachId: string; assignedCoachName: string; contractedServices: ServiceType[];
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

const inputCls = "w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4fc3f7]/40";
const inputStyle = { background: "var(--card-border)", border: "1px solid var(--card-border)", color: "var(--text-primary)" };

export default function MembersPage() {
  const currentUser = useCurrentUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [activeCountMap, setActiveCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<MemberRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<MemberStatus | "all">("all");

  const [editing, setEditing] = useState<Member | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const [showNewMember, setShowNewMember] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState<NewMemberForm>(defaultNewMember());
  const [creating, setCreating] = useState(false);

  const [addServiceFor, setAddServiceFor] = useState<Member | null>(null);
  const [addServiceForm, setAddServiceForm] = useState<AddServiceForm>(defaultAddService());
  const [addingService, setAddingService] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const coaches = members.filter((m) => m.roles.includes("coach"));

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
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
    activeMemberships.forEach((ms) => { countMap[ms.studentId] = (countMap[ms.studentId] ?? 0) + 1; });
    setMembers(allMembers);
    setActiveCountMap(countMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = members.filter((m) => {
    if (filterRole !== "all" && !m.roles.includes(filterRole)) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) &&
      !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (m: Member) => {
    setEditing(m);
    setEditState({
      name: m.name, email: m.email, role: m.roles[0], status: m.status,
      assignedCoachId: m.assignedCoachId ?? "", assignedCoachName: m.assignedCoachName ?? "",
      contractedServices: [...m.contractedServices],
    });
  };
  const toggleEditService = (svc: ServiceType) => {
    if (!editState) return;
    const has = editState.contractedServices.includes(svc);
    setEditState({ ...editState, contractedServices: has ? editState.contractedServices.filter((s) => s !== svc) : [...editState.contractedServices, svc] });
  };
  const handleSave = async () => {
    if (!editing || !editState) return;
    setSaving(true);
    const coachObj = editState.assignedCoachId ? coaches.find((c) => c.id === editState.assignedCoachId) : null;
    const body: Partial<Member> & { _callerRole?: string } = {
      roles: [editState.role], status: editState.status,
      contractedServices: editState.contractedServices,
      assignedCoachId: coachObj?.id, assignedCoachName: coachObj?.name,
      ...(currentUser.role === "admin" && editState.name.trim() && { name: editState.name.trim() }),
      ...(currentUser.role === "admin" && editState.email.trim() && { email: editState.email.trim() }),
      _callerRole: currentUser.role,
    };
    const res = await fetch(`/api/members/${editing.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated: Member = await res.json();
      setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
      showToast("Miembro actualizado");
    } else { showToast("Error al actualizar", false); }
    setSaving(false); setEditing(null); setEditState(null);
  };

  const toggleNewService = (svc: ServiceType) => {
    const has = newMemberForm.contractedServices.includes(svc);
    setNewMemberForm((f) => ({
      ...f, contractedServices: has ? f.contractedServices.filter((s) => s !== svc) : [...f.contractedServices, svc],
    }));
  };
  const handleCreateMember = async (andAddService = false) => {
    if (!newMemberForm.name.trim() || !newMemberForm.email.trim()) {
      showToast("Nombre y email son requeridos", false); return;
    }
    setCreating(true);
    const coachObj = newMemberForm.assignedCoachId ? coaches.find((c) => c.id === newMemberForm.assignedCoachId) : null;
    const body = {
      name: newMemberForm.name.trim(), email: newMemberForm.email.trim(),
      roles: [newMemberForm.role], status: newMemberForm.status,
      contractedServices: newMemberForm.contractedServices,
      ...(coachObj && { assignedCoachId: coachObj.id, assignedCoachName: coachObj.name }),
      ...(newMemberForm.notes.trim() && { notes: newMemberForm.notes.trim() }),
    };
    const res = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setCreating(false);
    if (res.ok) {
      const newMember: Member = await res.json();
      setMembers((prev) => [...prev, newMember]);
      setShowNewMember(false); setNewMemberForm(defaultNewMember());
      showToast("Miembro creado correctamente");
      if (andAddService) { setAddServiceFor(newMember); setAddServiceForm(defaultAddService(newMember.id)); }
    } else {
      const err = await res.json();
      showToast(err.error || "Error al crear el miembro", false);
    }
  };

  const openAddService = (m: Member) => { setAddServiceFor(m); setAddServiceForm(defaultAddService(m.id)); };
  const handleAddService = async () => {
    if (!addServiceFor) return;
    setAddingService(true);
    const coachObj = addServiceForm.coachId ? coaches.find((c) => c.id === addServiceForm.coachId) : null;
    const body = { ...addServiceForm, amount: Number(addServiceForm.amount), ...(coachObj && { coachId: coachObj.id, coachName: coachObj.name }) };
    const res = await fetch("/api/memberships", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setAddingService(false);
    if (res.ok) { setAddServiceFor(null); showToast("Servicio agregado correctamente"); await fetchData(); }
    else { const err = await res.json(); showToast(err.error || "Error al agregar servicio", false); }
  };

  const totalMembers = members.filter((m) => m.roles.includes("member")).length;
  const activeMembers = members.filter((m) => m.roles.includes("member") && m.status === "active").length;
  const totalCoaches = members.filter((m) => m.roles.includes("coach")).length;

  const kpis = [
    { label: "Total Miembros", value: totalMembers, sub: `${activeMembers} activos`, accent: "#4fc3f7" },
    { label: "Instructores", value: totalCoaches, sub: "en plantilla", accent: "#22c55e" },
    { label: "Total Usuarios", value: members.length, sub: "en el sistema", accent: "#a78bfa" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Miembros</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>Gestiona roles, servicios y asignaciones</p>
        </div>
        <button
          onClick={() => { setShowNewMember(true); setNewMemberForm(defaultNewMember()); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo miembro
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {kpis.map(({ label, value, sub, accent }) => (
          <div key={label} className="rounded-xl p-4 border" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: accent }}>{value}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          <input
            type="text" placeholder="Buscar por nombre o email..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
          />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as MemberRole | "all")}
          className="rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
          <option value="all">Todos los roles</option>
          <option value="member">Miembro</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as MemberStatus | "all")}
          className="rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}>
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
        {loading ? "Cargando..." : `${filtered.length} usuario${filtered.length !== 1 ? "s" : ""}`}
      </p>

      {/* Members list */}
      {loading ? (
        <div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>Cargando miembros...</div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          {filtered.length === 0 ? (
            <div className="text-center py-16" style={{ color: "var(--text-secondary)" }}>No se encontraron usuarios</div>
          ) : (
            <div>
              {filtered.map((m, i) => {
                const activeCount = activeCountMap[m.id] ?? 0;
                const accentColor = ROLE_COLOR[m.roles[0]] ?? "#71717a";
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: "1px solid var(--card-border)" }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0"
                      style={{ background: `${accentColor}30`, color: accentColor }}
                    >
                      {initials(m.name)}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                      <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{m.email}</p>
                    </div>

                    {/* Role + Status */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <RoleBadge role={m.roles[0]} />
                      <span
                        className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={m.status === "active"
                          ? { background: "#22c55e20", color: "#22c55e" }
                          : { background: "#71717a20", color: "#71717a" }}
                      >
                        {m.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Active services */}
                    {!m.roles.includes("coach") ? (
                      <div className="hidden md:flex flex-col gap-0.5 shrink-0 min-w-[120px]">
                        {activeCount > 0 ? (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium w-fit" style={{ background: "#22c55e15", color: "#22c55e" }}>
                            {activeCount} activo{activeCount !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.4 }}>Sin servicios activos</span>
                        )}
                        {m.assignedCoachName && (
                          <p className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>Coach: {m.assignedCoachName}</p>
                        )}
                      </div>
                    ) : (
                      <div className="hidden md:block min-w-[120px] shrink-0" />
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Link href={`/profile?userId=${m.id}`}
                        className="text-xs px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-secondary)" }}>
                        Perfil
                      </Link>
                      <button
                        onClick={() => openAddService(m)}
                        className="text-xs px-2.5 py-1.5 rounded-lg transition-opacity hover:opacity-80 font-medium"
                        style={{ background: "#22c55e15", color: "#22c55e", border: "1px solid #22c55e20" }}
                      >
                        <Plus className="w-3 h-3 inline mr-1" />Servicio
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5 font-medium"
                        style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                      >
                        Editar
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Member Modal */}
      <AnimatePresence>
        {showNewMember && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setShowNewMember(false)}
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
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Nuevo Miembro</h2>
                  <button onClick={() => setShowNewMember(false)} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
                      <input type="text" placeholder="Nombre completo" value={newMemberForm.name}
                        onChange={(e) => setNewMemberForm((f) => ({ ...f, name: e.target.value }))}
                        className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Email *</label>
                      <input type="email" placeholder="email@ejemplo.com" value={newMemberForm.email}
                        onChange={(e) => setNewMemberForm((f) => ({ ...f, email: e.target.value }))}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Rol</label>
                      <select value={newMemberForm.role}
                        onChange={(e) => setNewMemberForm((f) => ({ ...f, role: e.target.value as MemberRole, assignedCoachId: "" }))}
                        className={inputCls} style={inputStyle}>
                        <option value="member">Miembro</option>
                        <option value="coach">Coach</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado</label>
                      <select value={newMemberForm.status}
                        onChange={(e) => setNewMemberForm((f) => ({ ...f, status: e.target.value as MemberStatus }))}
                        className={inputCls} style={inputStyle}>
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </div>
                  </div>
                  {newMemberForm.role === "member" && (
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor asignado</label>
                      <select value={newMemberForm.assignedCoachId}
                        onChange={(e) => setNewMemberForm((f) => ({ ...f, assignedCoachId: e.target.value }))}
                        className={inputCls} style={inputStyle}>
                        <option value="">Sin coach asignado</option>
                        {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>Servicios contratados (opcional)</label>
                    <div className="flex gap-2 flex-wrap">
                      {ALL_SERVICES.map((svc) => {
                        const isActive = newMemberForm.contractedServices.includes(svc);
                        return (
                          <button key={svc} type="button" onClick={() => toggleNewService(svc)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                            style={isActive
                              ? { background: "#4fc3f720", borderColor: "#4fc3f750", color: "#4fc3f7" }
                              : { background: "var(--card-border)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                            {SERVICE_LABELS[svc]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Observaciones (opcional)</label>
                    <textarea value={newMemberForm.notes} rows={2} placeholder="Notas internas..."
                      onChange={(e) => setNewMemberForm((f) => ({ ...f, notes: e.target.value }))}
                      className={`${inputCls} resize-none`} style={inputStyle} />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setShowNewMember(false)}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/5"
                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}>
                    Cancelar
                  </button>
                  <button onClick={() => handleCreateMember(false)} disabled={creating}
                    className="flex-1 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ background: "var(--card-border)", color: "var(--text-primary)" }}>
                    {creating ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => handleCreateMember(true)} disabled={creating}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-50 hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}>
                    {creating ? "..." : "Guardar + Servicio →"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Service Modal */}
      <AnimatePresence>
        {addServiceFor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => setAddServiceFor(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Añadir Servicio</h2>
                  <button onClick={() => setAddServiceFor(null)} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
                </div>
                <p className="text-xs mb-6" style={{ color: "var(--text-secondary)" }}>
                  Para: <span className="font-medium" style={{ color: "var(--text-primary)" }}>{addServiceFor.name}</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>Tipo de servicio</label>
                    <div className="flex gap-2 flex-wrap">
                      {ALL_SERVICES.map((svc) => (
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Plan</label>
                      <select value={addServiceForm.plan}
                        onChange={(e) => {
                          const plan = e.target.value as MembershipPlan;
                          const endDate = addDays(addServiceForm.startDate || todayStr(), PLAN_DAYS[plan]);
                          setAddServiceForm((f) => ({ ...f, plan, endDate }));
                        }}
                        className={inputCls} style={inputStyle}>
                        {(["mensual", "trimestral", "semestral", "anual"] as const).map((v) => (
                          <option key={v} value={v}>{PLAN_LABELS[v]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Monto ($)</label>
                      <input type="number" value={addServiceForm.amount}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, amount: e.target.value }))}
                        className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado membresía</label>
                      <select value={addServiceForm.membershipStatus}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, membershipStatus: e.target.value as MembershipStatus }))}
                        className={inputCls} style={inputStyle}>
                        {(["active", "pending", "expired", "cancelled"] as const).map((v) => (
                          <option key={v} value={v}>{MS_STATUS_LABELS[v]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado pago</label>
                      <select value={addServiceForm.paymentStatus}
                        onChange={(e) => setAddServiceForm((f) => ({ ...f, paymentStatus: e.target.value as PaymentStatus }))}
                        className={inputCls} style={inputStyle}>
                        {(["paid", "pending", "overdue"] as const).map((v) => (
                          <option key={v} value={v}>{PAY_LABELS[v]}</option>
                        ))}
                      </select>
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
                  {(addServiceForm.serviceType === "personal_training" || addServiceForm.serviceType === "kinesiology") && (
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor / Profesional</label>
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
                  <button onClick={() => setAddServiceFor(null)}
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

      {/* Edit Member Modal */}
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
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>Editar miembro</h2>
                  <button onClick={() => setEditing(null)} className="text-2xl leading-none" style={{ color: "var(--text-secondary)" }}>×</button>
                </div>

                {/* Identity block */}
                <div className="rounded-xl p-4 mb-5 border" style={{ background: "rgba(0,0,0,0.2)", borderColor: "var(--card-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Datos del miembro</p>
                    <span className="text-[10px] font-medium" style={{ color: currentUser.role === "admin" ? "#4fc3f7" : "var(--text-secondary)" }}>
                      {currentUser.role === "admin" ? "editable" : "solo lectura"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "var(--text-secondary)" }}>Nombre</label>
                      {currentUser.role === "admin" ? (
                        <input type="text" value={editState.name}
                          onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                          className={inputCls} style={inputStyle} />
                      ) : (
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{editing.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                      {currentUser.role === "admin" ? (
                        <input type="email" value={editState.email}
                          onChange={(e) => setEditState({ ...editState, email: e.target.value })}
                          className={inputCls} style={inputStyle} />
                      ) : (
                        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{editing.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>Configuración operativa</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Rol</label>
                    <select value={editState.role}
                      onChange={(e) => setEditState({ ...editState, role: e.target.value as MemberRole })}
                      className={inputCls} style={inputStyle}>
                      <option value="member">Miembro</option>
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Estado</label>
                    <select value={editState.status}
                      onChange={(e) => setEditState({ ...editState, status: e.target.value as MemberStatus })}
                      className={inputCls} style={inputStyle}>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                  {editState.role === "member" && (
                    <div>
                      <label className="text-xs font-medium block mb-1.5" style={{ color: "var(--text-secondary)" }}>Instructor asignado</label>
                      <select value={editState.assignedCoachId}
                        onChange={(e) => setEditState({ ...editState, assignedCoachId: e.target.value })}
                        className={inputCls} style={inputStyle}>
                        <option value="">Sin coach asignado</option>
                        {coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium block mb-2" style={{ color: "var(--text-secondary)" }}>Servicios contratados</label>
                    <div className="flex gap-2 flex-wrap">
                      {ALL_SERVICES.map((svc) => {
                        const isActive = editState.contractedServices.includes(svc);
                        return (
                          <button key={svc} type="button" onClick={() => toggleEditService(svc)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors"
                            style={isActive
                              ? { background: "#4fc3f720", borderColor: "#4fc3f750", color: "#4fc3f7" }
                              : { background: "var(--card-border)", borderColor: "var(--card-border)", color: "var(--text-secondary)" }}>
                            {SERVICE_LABELS[svc]}
                          </button>
                        );
                      })}
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
