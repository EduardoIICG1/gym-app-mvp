"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, Lock, Check, Loader2, X, ArrowLeft } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { HealthSessionStatusBadge } from "@/components/Badge";
import Link from "next/link";

interface SessionData {
  id: string;
  patientId: string;
  patientName: string;
  sessionDate: string;
  status: "open" | "closed";
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  exercises: string | null;
  observations: string | null;
  privateNotes: string | null;
  patientNotes: string | null;
  healthRecordId: string;
  updatedAt: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const SECTIONS = [
  { key: "subjective", label: "S — Subjetivo", desc: "Lo que refiere el paciente" },
  { key: "objective", label: "O — Objetivo", desc: "Hallazgos en evaluación" },
  { key: "assessment", label: "A — Análisis", desc: "Diagnóstico y valoración" },
  { key: "plan", label: "P — Plan", desc: "Tratamiento planificado" },
  { key: "exercises", label: "Ejercicios", desc: "Pauta de ejercicios indicada" },
  { key: "observations", label: "Observaciones", desc: "Notas generales de la sesión" },
  { key: "patientNotes", label: "Notas para el paciente", desc: "Visible por el paciente" },
  { key: "privateNotes", label: "Notas privadas", desc: "Solo kinesiólogo y admin", isPrivate: true },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

function AutoTextarea({
  value,
  onChange,
  placeholder,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      readOnly={readOnly}
      rows={3}
      className="w-full bg-transparent resize-none outline-none text-sm leading-relaxed"
      style={{
        color: readOnly ? "var(--text-secondary)" : "var(--text-primary)",
        minHeight: "80px",
        opacity: readOnly ? 0.7 : 1,
      }}
    />
  );
}

export default function HealthSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useCurrentUser();

  const [session, setSession] = useState<SessionData | null>(null);
  const [fields, setFields] = useState<Record<SectionKey, string>>({
    subjective: "", objective: "", assessment: "", plan: "",
    exercises: "", observations: "", patientNotes: "", privateNotes: "",
  });
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set(["subjective", "objective"]));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Partial<Record<SectionKey, string>>>({});

  useEffect(() => {
    if (!user.isAuthenticated || user.isLoading) return;
    if (user.role !== "admin" && user.role !== "kinesiologist") return;

    fetch(`/api/health/sessions/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      })
      .then((data: SessionData) => {
        setSession(data);
        setFields({
          subjective: data.subjective ?? "",
          objective: data.objective ?? "",
          assessment: data.assessment ?? "",
          plan: data.plan ?? "",
          exercises: data.exercises ?? "",
          observations: data.observations ?? "",
          patientNotes: data.patientNotes ?? "",
          privateNotes: data.privateNotes ?? "",
        });
        // Auto-open sections that have content
        const withContent = SECTIONS
          .filter((s) => data[s.key])
          .map((s) => s.key) as SectionKey[];
        if (withContent.length > 0) setOpenSections(new Set(withContent.slice(0, 4)));
      })
      .catch(() => router.push("/health"))
      .finally(() => setLoading(false));
  }, [id, user.isAuthenticated, user.isLoading, user.role, router]);

  const doSave = useCallback(
    async (patch: Partial<Record<SectionKey, string>>) => {
      if (!session) return;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/health/sessions/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("save failed");
        const updated = await res.json();
        setSavedAt(new Date(updated.updatedAt).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }));
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 3000);
      } catch {
        setSaveState("error");
        setTimeout(() => setSaveState("idle"), 4000);
      }
    },
    [session]
  );

  const handleFieldChange = useCallback(
    (key: SectionKey, value: string) => {
      if (!session) return;
      setFields((prev) => ({ ...prev, [key]: value }));
      pendingRef.current[key] = value;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const patch = { ...pendingRef.current };
        pendingRef.current = {};
        doSave(patch);
      }, 1500);
    },
    [session, doSave]
  );

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleClose = async () => {
    if (!session) return;
    // flush pending before closing
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
      if (Object.keys(pendingRef.current).length > 0) {
        await doSave({ ...pendingRef.current });
        pendingRef.current = {};
      }
    }
    setClosing(true);
    try {
      const res = await fetch(`/api/health/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
      if (!res.ok) throw new Error("close failed");
      setSession((s) => s ? { ...s, status: "closed" } : s);
      setShowCloseModal(false);
    } catch {
      // keep modal open on error
    } finally {
      setClosing(false);
    }
  };

  if (user.isLoading || loading) return null;
  if (user.role !== "admin" && user.role !== "kinesiologist") {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-secondary)" }}>
        Sin acceso a este módulo.
      </div>
    );
  }
  if (!session) return null;

  const isReadOnly = false;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/health/patients/${session.patientId}`}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {session.patientName}
              </h1>
              <HealthSessionStatusBadge status={session.status} />
            </div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Sesión del {new Date(session.sessionDate).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-3 shrink-0">
          {saveState === "saving" && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
            </span>
          )}
          {saveState === "saved" && savedAt && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#10b981" }}>
              <Check className="w-3 h-3" /> Guardado {savedAt}
            </span>
          )}
          {saveState === "error" && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#ef4444" }}>
              <X className="w-3 h-3" /> Error al guardar
            </span>
          )}

          {!isReadOnly && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: "#6b728020", color: "var(--text-secondary)", border: "1px solid var(--card-border)" }}
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {isReadOnly && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl mb-4 text-sm"
          style={{ background: "#6b728015", border: "1px solid #6b728030", color: "var(--text-secondary)" }}
        >
          <Lock className="w-4 h-4 shrink-0" />
          Sesión cerrada — solo lectura
        </div>
      )}

      {/* SOAP Sections */}
      <div className="flex flex-col gap-2">
        {SECTIONS.map((section) => {
          const isOpen = openSections.has(section.key);
          const hasContent = !!fields[section.key];
          const isPrivate = "isPrivate" in section && section.isPrivate;

          return (
            <div
              key={section.key}
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isPrivate && <Lock className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />}
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {section.label}
                  </span>
                  {hasContent && !isOpen && (
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: "#10b981" }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isOpen && hasContent && (
                    <span className="text-xs truncate max-w-[120px]" style={{ color: "var(--text-secondary)" }}>
                      {fields[section.key].slice(0, 50)}…
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-4 pb-4 pt-0">
                      <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                        {section.desc}
                      </p>
                      <AutoTextarea
                        value={fields[section.key]}
                        onChange={(v) => handleFieldChange(section.key, v)}
                        placeholder={isReadOnly ? "" : `Ingresa ${section.label.toLowerCase()}...`}
                        readOnly={isReadOnly}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Close session modal */}
      <AnimatePresence>
        {showCloseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={() => !closing && setShowCloseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-6 max-w-sm w-full"
              style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
            >
              <h3 className="text-base font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                ¿Cerrar sesión?
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Una vez cerrada, la sesión será de solo lectura. Esta acción no se puede deshacer en esta versión.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCloseModal(false)}
                  disabled={closing}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClose}
                  disabled={closing}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 flex items-center justify-center gap-2"
                  style={{ background: "#10b981", color: "white" }}
                >
                  {closing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Cerrar sesión
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
