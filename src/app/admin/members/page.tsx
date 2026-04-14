"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Member, MemberRole, MemberStatus, ServiceType } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin",
  coach: "Coach",
  member: "Miembro",
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
  group: "Grupal",
  personal_training: "Personal",
  kinesiology: "Kinesio",
  blocked_time: "Bloqueado",
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  group: "bg-blue-500/10 text-blue-400",
  personal_training: "bg-orange-500/10 text-orange-400",
  kinesiology: "bg-purple-500/10 text-purple-400",
  blocked_time: "bg-zinc-700/30 text-zinc-500",
};

const ALL_SERVICES: ServiceType[] = ["group", "personal_training", "kinesiology"];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface EditState {
  role: MemberRole;
  status: MemberStatus;
  assignedCoachId: string;
  assignedCoachName: string;
  contractedServices: ServiceType[];
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<MemberRole | "all">("all");
  const [filterStatus, setFilterStatus] = useState<MemberStatus | "all">("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const coaches = members.filter((m) => m.role === "coach");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/members");
    setMembers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = members.filter((m) => {
    if (filterRole !== "all" && m.role !== filterRole) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (m: Member) => {
    setEditing(m);
    setEditState({
      role: m.role,
      status: m.status,
      assignedCoachId: m.assignedCoachId ?? "",
      assignedCoachName: m.assignedCoachName ?? "",
      contractedServices: [...m.contractedServices],
    });
  };

  const toggleService = (svc: ServiceType) => {
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

    const coachObj = editState.assignedCoachId
      ? coaches.find((c) => c.id === editState.assignedCoachId)
      : null;

    const body: Partial<Member> = {
      role: editState.role,
      status: editState.status,
      contractedServices: editState.contractedServices,
      assignedCoachId: coachObj?.id,
      assignedCoachName: coachObj?.name,
    };

    const res = await fetch(`/api/members/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated: Member = await res.json();
      setMembers((prev) => prev.map((m) => m.id === updated.id ? updated : m));
    }
    setSaving(false);
    setEditing(null);
    setEditState(null);
  };

  // KPIs
  const totalMembers = members.filter((m) => m.role === "member").length;
  const activeMembers = members.filter((m) => m.role === "member" && m.status === "active").length;
  const totalCoaches = members.filter((m) => m.role === "coach").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Miembros</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Gestiona roles, servicios y asignaciones</p>
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
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as MemberRole | "all")}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
        >
          <option value="all">Todos los roles</option>
          <option value="member">Miembro</option>
          <option value="coach">Coach</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as MemberStatus | "all")}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-600"
        >
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
              {filtered.map((m) => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/40 transition-colors">
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
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_COLORS[m.role]}`}>
                      {ROLE_LABELS[m.role]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[m.status]}`}>
                      {m.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  {/* Coach assigned */}
                  <div className="hidden md:block w-28 shrink-0">
                    {m.assignedCoachName ? (
                      <p className="text-zinc-400 text-xs truncate">{m.assignedCoachName}</p>
                    ) : (
                      <p className="text-zinc-700 text-xs">—</p>
                    )}
                  </div>

                  {/* Services */}
                  <div className="hidden lg:flex items-center gap-1 shrink-0">
                    {m.contractedServices.filter(s => s !== "blocked_time").map((s) => (
                      <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-medium ${SERVICE_COLORS[s]}`}>
                        {SERVICE_LABELS[s]}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/profile?userId=${m.id}`}
                      className="text-xs text-zinc-500 hover:text-blue-400 transition-colors px-2 py-1"
                    >
                      Ver perfil
                    </Link>
                    <button
                      onClick={() => openEdit(m)}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Edit Modal ─────────────────────────────────────────────────── */}
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
                {/* Role */}
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Rol</label>
                  <select
                    value={editState.role}
                    onChange={(e) => setEditState({ ...editState, role: e.target.value as MemberRole })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="member">Miembro</option>
                    <option value="coach">Coach</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-1.5">Estado</label>
                  <select
                    value={editState.status}
                    onChange={(e) => setEditState({ ...editState, status: e.target.value as MemberStatus })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                {/* Coach assigned (only for members) */}
                {editState.role === "member" && (
                  <div>
                    <label className="text-zinc-400 text-xs font-medium block mb-1.5">Coach asignado</label>
                    <select
                      value={editState.assignedCoachId}
                      onChange={(e) => setEditState({ ...editState, assignedCoachId: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">Sin coach asignado</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Services */}
                <div>
                  <label className="text-zinc-400 text-xs font-medium block mb-2">Servicios contratados</label>
                  <div className="flex gap-2 flex-wrap">
                    {ALL_SERVICES.map((svc) => {
                      const active = editState.contractedServices.includes(svc);
                      return (
                        <button
                          key={svc}
                          type="button"
                          onClick={() => toggleService(svc)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                            active
                              ? "bg-blue-600/20 border-blue-500/50 text-blue-300"
                              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                          }`}
                        >
                          {SERVICE_LABELS[svc]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
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
