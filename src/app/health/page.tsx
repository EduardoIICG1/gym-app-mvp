"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Users, Clock, FileText, Plus, Search, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { RestrictionBadge, HealthSessionStatusBadge } from "@/components/Badge";

interface Patient {
  id: string;
  name: string;
  email: string;
  kinesiologistName: string;
  activeRestrictions: { label: string; severity: string }[];
  lastSessionDate: string | null;
  membership: { planName: string; totalSessions: number | null; usedSessions: number } | null;
}

interface HealthSession {
  id: string;
  patientId: string;
  sessionDate: string;
  status: string;
  subjective: string | null;
  healthRecordId: string;
}

export default function HealthPage() {
  const user = useCurrentUser();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [openSessions, setOpenSessions] = useState<HealthSession[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.isAuthenticated || user.isLoading) return;
    if (user.role !== "admin" && user.role !== "kinesiologist") return;

    Promise.all([
      fetch("/api/health/patients").then((r) => r.json()),
    ])
      .then(([pts]) => {
        setPatients(Array.isArray(pts) ? pts : []);
      })
      .finally(() => setLoading(false));
  }, [user.isAuthenticated, user.isLoading, user.role]);

  const today = new Date().toISOString().slice(0, 10);
  const todayPatients = patients.filter((p) => p.lastSessionDate === today);
  const filteredPatients = patients.filter(
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
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Kinesiología
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Módulo de salud y rehabilitación deportiva
          </p>
        </div>
        <Link
          href="/health/patients"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#10b981", color: "white" }}
        >
          <Users className="w-4 h-4" />
          Ver pacientes
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Pacientes activos", value: patients.length, icon: Users, color: "#10b981" },
          { label: "Atendidos hoy", value: todayPatients.length, icon: Clock, color: "#4fc3f7" },
          { label: "Con restricciones", value: patients.filter((p) => p.activeRestrictions.length > 0).length, icon: AlertTriangle, color: "#f59e0b" },
          { label: "Sin sesión reciente", value: patients.filter((p) => !p.lastSessionDate).length, icon: FileText, color: "#71717a" },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-4"
            style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search + patient list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: "var(--card-border)" }}>
          <Search className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente por nombre o email..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>Cargando...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
            {search ? "Sin resultados." : "No hay pacientes con kinesiología activa."}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--card-border)" }}>
            {filteredPatients.map((patient) => (
              <Link
                key={patient.id}
                href={`/health/patients/${patient.id}`}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "#10b98120", color: "#10b981" }}
                >
                  {patient.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: "var(--text-primary)" }}>{patient.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>{patient.email}</p>
                  {patient.activeRestrictions.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {patient.activeRestrictions.slice(0, 2).map((r, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: r.severity === "critical" ? "#ef444420" : r.severity === "warning" ? "#f59e0b20" : "#4fc3f720",
                            color: r.severity === "critical" ? "#ef4444" : r.severity === "warning" ? "#f59e0b" : "#4fc3f7",
                          }}
                        >
                          {r.label}
                        </span>
                      ))}
                      {patient.activeRestrictions.length > 2 && (
                        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                          +{patient.activeRestrictions.length - 2} más
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="text-right shrink-0">
                  {patient.membership && (
                    <p className="text-xs font-medium" style={{ color: "#10b981" }}>
                      {patient.membership.totalSessions != null
                        ? `${patient.membership.usedSessions}/${patient.membership.totalSessions} ses.`
                        : patient.membership.planName}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {patient.lastSessionDate
                      ? `Últ. sesión ${patient.lastSessionDate}`
                      : "Sin sesiones"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
