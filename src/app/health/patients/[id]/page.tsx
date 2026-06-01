"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft, Plus, Edit2, Check, X, ChevronDown, ChevronUp,
  Lock, FileText, CreditCard, Calendar,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { RestrictionBadge, HealthSessionStatusBadge } from "@/components/Badge";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HealthRecord {
  id: string; patientId: string; birthDate: string | null; biologicalSex: string | null;
  occupation: string | null; reasonForConsult: string | null; medicalBackground: string | null;
  surgeries: string | null; currentMedication: string | null; allergies: string | null;
  painLevel: number | null; initialAssessment: string | null; diagnosis: string | null;
  treatmentGoals: string | null; internalNotes: string | null;
}

interface HealthSession {
  id: string; sessionDate: string; status: string; kinesiologistName: string | null;
  subjective: string | null; objective: string | null; assessment: string | null;
  plan: string | null; exercises: string | null; observations: string | null;
  privateNotes: string | null; patientNotes: string | null;
}

interface Restriction {
  id: string; label: string; severity: string; isActive: boolean;
  startDate: string; endDate: string | null;
}

interface PatientInfo {
  name: string; email: string; kinesiologistName: string;
  membership: { planName: string; totalSessions: number | null; usedSessions: number } | null;
}

// ─── Field component ─────────────────────────────────────────────────────────

function EditableField({
  label, value, onSave, multiline = true, isPrivate = false,
}: {
  label: string; value: string | null; onSave: (v: string) => Promise<void>;
  multiline?: boolean; isPrivate?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-1">
        {isPrivate && <Lock className="w-3 h-3" style={{ color: "#f59e0b" }} />}
        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {label}
        </label>
        {!editing && (
          <button onClick={() => { setDraft(value ?? ""); setEditing(true); }}
            className="ml-auto p-1 rounded opacity-40 hover:opacity-100 transition-opacity">
            <Edit2 className="w-3 h-3" style={{ color: "var(--text-secondary)" }} />
          </button>
        )}
      </div>
      {editing ? (
        <div>
          {multiline ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "var(--background)", border: "1px solid #10b981", color: "var(--text-primary)" }}
            />
          ) : (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--background)", border: "1px solid #10b981", color: "var(--text-primary)" }}
            />
          )}
          <div className="flex gap-2 mt-1">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1 px-3 py-1 rounded text-xs font-semibold"
              style={{ background: "#10b981", color: "white" }}>
              <Check className="w-3 h-3" /> {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 rounded text-xs"
              style={{ color: "var(--text-secondary)" }}>
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: value ? "var(--text-primary)" : "var(--text-secondary)" }}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PatientFilePage() {
  const { id: patientId } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useCurrentUser();

  const [tab, setTab] = useState<"ficha" | "sesiones" | "restricciones" | "documentos">("ficha");
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [record, setRecord] = useState<HealthRecord | null>(null);
  const [sessions, setSessions] = useState<HealthSession[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [newRestrictionLabel, setNewRestrictionLabel] = useState("");
  const [newRestrictionSeverity, setNewRestrictionSeverity] = useState("warning");
  const [addingRestriction, setAddingRestriction] = useState(false);
  const [creatingRecord, setCreatingRecord] = useState(false);

  const isKine = user.role === "kinesiologist" || user.role === "admin";

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    try {
      const [ptRes, recRes, sesRes, restRes] = await Promise.all([
        fetch(`/api/health/patients?search=`).then((r) => r.json()),
        fetch(`/api/health/records?patientId=${patientId}`).then((r) => r.json()),
        fetch(`/api/health/sessions?patientId=${patientId}`).then((r) => r.json()),
        fetch(`/api/health/restrictions?patientId=${patientId}`).then((r) => r.json()),
      ]);
      const pt = Array.isArray(ptRes) ? ptRes.find((p: { id: string }) => p.id === patientId) : null;
      if (pt) setPatientInfo(pt);
      if (recRes && !recRes.error) setRecord(recRes);
      if (Array.isArray(sesRes)) setSessions(sesRes);
      if (Array.isArray(restRes)) setRestrictions(restRes);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (user.isAuthenticated && !user.isLoading) load();
  }, [user.isAuthenticated, user.isLoading, load]);

  const updateRecord = async (field: string, value: string) => {
    if (!record) return;
    await fetch(`/api/health/records/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value || null }),
    });
    setRecord((r) => r ? { ...r, [field]: value || null } : r);
  };

  const createRecord = async () => {
    setCreatingRecord(true);
    const res = await fetch("/api/health/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId }),
    });
    if (res.ok) {
      const newRec = await res.json();
      setRecord(newRec);
    }
    setCreatingRecord(false);
  };

  const addRestriction = async () => {
    if (!record || !newRestrictionLabel.trim()) return;
    setAddingRestriction(true);
    const res = await fetch("/api/health/restrictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ healthRecordId: record.id, label: newRestrictionLabel, severity: newRestrictionSeverity }),
    });
    if (res.ok) {
      const r = await res.json();
      setRestrictions((prev) => [r, ...prev]);
      setNewRestrictionLabel("");
    }
    setAddingRestriction(false);
  };

  const toggleRestriction = async (id: string, current: boolean) => {
    await fetch(`/api/health/restrictions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    setRestrictions((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !current } : r));
  };

  const activeRestrictions = restrictions.filter((r) => r.isActive);
  const inactiveRestrictions = restrictions.filter((r) => !r.isActive);

  if (loading || user.isLoading) {
    return <div className="p-6 text-sm" style={{ color: "var(--text-secondary)" }}>Cargando...</div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Back + header */}
      <div className="flex items-start gap-4 mb-6">
        <Link href="/health" className="mt-1 p-2 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--text-secondary)" }}>
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            {patientInfo?.name ?? "Paciente"}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{patientInfo?.email}</p>
          {activeRestrictions.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {activeRestrictions.map((r) => (
                <span key={r.id}
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: r.severity === "critical" ? "#ef444420" : r.severity === "warning" ? "#f59e0b20" : "#4fc3f720",
                    color: r.severity === "critical" ? "#ef4444" : r.severity === "warning" ? "#f59e0b" : "#4fc3f7",
                  }}
                >
                  {r.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Pack summary */}
        {patientInfo?.membership && (
          <div className="text-right hidden lg:block">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Pack activo</p>
            <p className="text-sm font-semibold" style={{ color: "#10b981" }}>
              {patientInfo.membership.totalSessions != null
                ? `${patientInfo.membership.usedSessions} / ${patientInfo.membership.totalSessions} sesiones`
                : patientInfo.membership.planName}
            </p>
          </div>
        )}

        {/* New session CTA */}
        {isKine && record && (
          <Link
            href={`/health/sessions/new?patientId=${patientId}&recordId=${record.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold shrink-0"
            style={{ background: "#10b981", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nueva sesión</span>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {(["ficha", "sesiones", "restricciones", "documentos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
            style={tab === t
              ? { background: "#10b98120", color: "#10b981", border: "1px solid #10b98130" }
              : { color: "var(--text-secondary)" }
            }
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "restricciones" && activeRestrictions.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                {activeRestrictions.length}
              </span>
            )}
            {t === "sesiones" && sessions.length > 0 && (
              <span className="ml-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                ({sessions.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Ficha ── */}
      {tab === "ficha" && (
        <div>
          {!record ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-secondary)" }} />
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Este paciente aún no tiene ficha clínica.
              </p>
              {isKine && (
                <button onClick={createRecord} disabled={creatingRecord}
                  className="px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "#10b981", color: "white" }}>
                  {creatingRecord ? "Creando..." : "Crear ficha"}
                </button>
              )}
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-secondary)" }}>
                  Anamnesis
                </p>
                <EditableField label="Motivo de consulta" value={record.reasonForConsult}
                  onSave={(v) => updateRecord("reasonForConsult", v)} />
                <EditableField label="Antecedentes médicos" value={record.medicalBackground}
                  onSave={(v) => updateRecord("medicalBackground", v)} />
                <EditableField label="Cirugías previas" value={record.surgeries}
                  onSave={(v) => updateRecord("surgeries", v)} />
                <EditableField label="Medicación actual" value={record.currentMedication}
                  onSave={(v) => updateRecord("currentMedication", v)} />
                <EditableField label="Alergias" value={record.allergies}
                  onSave={(v) => updateRecord("allergies", v)} />
              </div>
              <div className="rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--text-secondary)" }}>
                  Evaluación inicial
                </p>
                <EditableField label="Evaluación inicial" value={record.initialAssessment}
                  onSave={(v) => updateRecord("initialAssessment", v)} />
                <EditableField label="Diagnóstico kinesiológico" value={record.diagnosis}
                  onSave={(v) => updateRecord("diagnosis", v)} />
                <EditableField label="Objetivos del tratamiento" value={record.treatmentGoals}
                  onSave={(v) => updateRecord("treatmentGoals", v)} />
                {isKine && (
                  <div className="mt-4 pt-4 rounded-xl p-3" style={{ background: "var(--background)", border: "1px solid #f59e0b30" }}>
                    <EditableField label="Notas internas (solo kinesiólogos)" value={record.internalNotes}
                      onSave={(v) => updateRecord("internalNotes", v)} isPrivate />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Sesiones ── */}
      {tab === "sesiones" && (
        <div className="space-y-3">
          {/* Quick actions */}
          {isKine && (
            <div className="flex flex-wrap gap-2 mb-1">
              {record && (
                <Link
                  href={`/health/sessions/new?patientId=${patientId}&recordId=${record.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "#10b981", color: "white" }}
                >
                  <Plus className="w-4 h-4" /> Nueva sesión
                </Link>
              )}
              <Link
                href={`/profile?userId=${patientId}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}
              >
                <CreditCard className="w-4 h-4" /> Renovar pack
              </Link>
              <Link
                href="/calendar"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "var(--card)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}
              >
                <Calendar className="w-4 h-4" /> Ir al calendario
              </Link>
            </div>
          )}

          {sessions.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin sesiones registradas.</p>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="rounded-2xl overflow-hidden"
                style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <HealthSessionStatusBadge status={s.status} />
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {new Date(s.sessionDate).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {s.subjective && (
                      <p className="text-xs mt-1 line-clamp-1" style={{ color: "var(--text-secondary)" }}>{s.subjective}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {isKine && (
                      <Link href={`/health/sessions/${s.id}`}
                        className="px-3 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: "#f59e0b20", color: "#f59e0b" }}
                        onClick={(e) => e.stopPropagation()}>
                        Editar
                      </Link>
                    )}
                    {expandedSession === s.id
                      ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                    }
                  </div>
                </button>

                {expandedSession === s.id && (
                  <div className="px-4 pb-4 pt-0 grid sm:grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "S — Subjetivo", val: s.subjective },
                      { label: "O — Objetivo", val: s.objective },
                      { label: "A — Evaluación", val: s.assessment },
                      { label: "P — Plan", val: s.plan },
                      { label: "Ejercicios", val: s.exercises },
                      { label: "Observaciones", val: s.observations },
                    ].map((f) => f.val && (
                      <div key={f.label}>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-secondary)" }}>{f.label}</p>
                        <p style={{ color: "var(--text-primary)" }}>{f.val}</p>
                      </div>
                    ))}
                    {s.patientNotes && (
                      <div className="sm:col-span-2 p-3 rounded-xl" style={{ background: "#10b98110", border: "1px solid #10b98130" }}>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: "#10b981" }}>Indicaciones para el paciente</p>
                        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{s.patientNotes}</p>
                      </div>
                    )}
                    {isKine && s.privateNotes && (
                      <div className="sm:col-span-2 p-3 rounded-xl" style={{ background: "#f59e0b10", border: "1px solid #f59e0b30" }}>
                        <div className="flex items-center gap-1 mb-0.5">
                          <Lock className="w-3 h-3" style={{ color: "#f59e0b" }} />
                          <p className="text-xs font-semibold" style={{ color: "#f59e0b" }}>Notas privadas</p>
                        </div>
                        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{s.privateNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Restricciones ── */}
      {tab === "restricciones" && (
        <div>
          {/* Add new restriction */}
          {isKine && record && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--text-secondary)" }}>
                + Nueva restricción
              </p>
              <div className="flex gap-2">
                <input
                  value={newRestrictionLabel}
                  onChange={(e) => setNewRestrictionLabel(e.target.value)}
                  placeholder="Ej: Evitar impacto — rodilla izquierda"
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
                  onKeyDown={(e) => e.key === "Enter" && addRestriction()}
                />
                <select
                  value={newRestrictionSeverity}
                  onChange={(e) => setNewRestrictionSeverity(e.target.value)}
                  className="px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "var(--background)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
                >
                  <option value="info">Informativa</option>
                  <option value="warning">Alerta</option>
                  <option value="critical">Crítica</option>
                </select>
                <button onClick={addRestriction} disabled={addingRestriction || !newRestrictionLabel.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
                  style={{ background: "#10b981", color: "white" }}>
                  {addingRestriction ? "..." : "Agregar"}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
                Usa lenguaje operativo, no diagnóstico. Esta restricción será visible para los coaches.
              </p>
            </div>
          )}

          {/* Active restrictions */}
          {activeRestrictions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Activas</p>
              <div className="space-y-2">
                {activeRestrictions.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                    <RestrictionBadge severity={r.severity} />
                    <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{r.label}</span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.startDate}</span>
                    {isKine && (
                      <button onClick={() => toggleRestriction(r.id, true)}
                        className="text-xs px-2 py-1 rounded hover:bg-white/5"
                        style={{ color: "var(--text-secondary)" }}>
                        Desactivar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive */}
          {inactiveRestrictions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-secondary)" }}>Inactivas</p>
              <div className="space-y-2 opacity-50">
                {inactiveRestrictions.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
                    <span className="text-xs px-2 py-0.5 rounded font-medium"
                      style={{ background: "#71717a20", color: "#71717a" }}>Inactiva</span>
                    <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                    {isKine && (
                      <button onClick={() => toggleRestriction(r.id, false)}
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: "#10b981" }}>
                        Reactivar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {restrictions.length === 0 && (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin restricciones registradas.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Documentos (stub) ── */}
      {tab === "documentos" && (
        <div className="rounded-2xl p-10 text-center" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
          <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-secondary)" }} />
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Documentos — Próximamente</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Adjunta exámenes, órdenes médicas y certificados. Disponible en la próxima fase.
          </p>
        </div>
      )}
    </div>
  );
}
