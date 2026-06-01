"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Search, ChevronRight, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface Patient {
  id: string;
  name: string;
  email: string;
  kinesiologistName: string;
  activeRestrictions: { label: string; severity: string }[];
  lastSessionDate: string | null;
  membership: { planName: string; totalSessions: number | null; usedSessions: number } | null;
}

const SEV_COLOR: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#ef444420", text: "#ef4444" },
  warning: { bg: "#f59e0b20", text: "#f59e0b" },
  info: { bg: "#4fc3f720", text: "#4fc3f7" },
};

export default function HealthPatientsPage() {
  const user = useCurrentUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.isAuthenticated || user.isLoading) return;
    if (user.role !== "admin" && user.role !== "kinesiologist") return;

    fetch("/api/health/patients")
      .then((r) => r.json())
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [user.isAuthenticated, user.isLoading, user.role]);

  const filtered = patients.filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  if (user.isLoading) return null;
  if (user.role !== "admin" && user.role !== "kinesiologist") {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-secondary)" }}>
        Sin acceso a este módulo.
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
          Pacientes
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
          {patients.length} paciente{patients.length !== 1 ? "s" : ""} con kinesiología activa
        </p>
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 mb-4"
        style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-secondary)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--text-secondary)" }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--text-secondary)" }}>
          {search ? "Sin resultados." : "No hay pacientes con kinesiología activa."}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((patient, i) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={`/health/patients/${patient.id}`}
                className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "#10b98120", color: "#10b981" }}
                >
                  {patient.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{patient.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{patient.email}</p>

                  {patient.activeRestrictions.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
                      {patient.activeRestrictions.slice(0, 3).map((r, idx) => {
                        const c = SEV_COLOR[r.severity] ?? SEV_COLOR.info;
                        return (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: c.bg, color: c.text }}
                          >
                            {r.label}
                          </span>
                        );
                      })}
                      {patient.activeRestrictions.length > 3 && (
                        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          +{patient.activeRestrictions.length - 3} más
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right */}
                <div className="text-right shrink-0">
                  {patient.membership && (
                    <p className="text-xs font-semibold" style={{ color: "#10b981" }}>
                      {patient.membership.totalSessions != null
                        ? `${patient.membership.usedSessions}/${patient.membership.totalSessions} ses.`
                        : patient.membership.planName}
                    </p>
                  )}
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {patient.lastSessionDate ? `Últ. ${patient.lastSessionDate}` : "Sin sesiones"}
                  </p>
                  <ChevronRight className="w-4 h-4 mt-1 ml-auto" style={{ color: "var(--text-secondary)" }} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
