"use client";

import { useEffect, useState } from "react";
import { ClassCard } from "@/components/ClassCard";
import { useCurrentUser } from "@/lib/useCurrentUser";

const CANCEL_WINDOW_MS = 2 * 60 * 60 * 1000; // mirrors API constant

function computeCancelHint(sessionDate: string, startTime: string): { isLate: boolean; deadline: string } {
  const sessionStart = new Date(`${sessionDate}T${startTime}:00`);
  const deadline     = new Date(sessionStart.getTime() - CANCEL_WINDOW_MS);
  return {
    isLate:   new Date() >= deadline,
    deadline: deadline.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  };
}

interface Class {
  id: string;
  name: string;
  coach: string;
  dayOfWeek: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reserved: number;
  serviceType: string;
}

type MembershipItem = {
  membershipStatus: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  totalSessions?: number | null;
  usedSessions?: number;
};

function computeValidServiceTypes(memberships: MembershipItem[]): Set<string> {
  const today = new Date().toISOString().slice(0, 10);
  return new Set(
    memberships
      .filter(
        (m) =>
          m.membershipStatus === "active" &&
          m.startDate <= today &&
          (m.endDate === "" || m.endDate >= today) &&
          (m.totalSessions == null || (m.usedSessions ?? 0) < m.totalSessions)
      )
      .map((m) => m.serviceType)
  );
}

export default function ClassesPage() {
  const currentUser = useCurrentUser();
  const [classes, setClasses] = useState<Class[]>([]);
  const [reservations, setReservations] = useState<string[]>([]);
  const [validServiceTypes, setValidServiceTypes] = useState<Set<string>>(new Set());
  const [sessionBalanceMap, setSessionBalanceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser.isLoading) return; // wait for real session
    const fetchData = async () => {
      try {
        setLoading(true);
        const classesRes = await fetch("/api/classes");
        if (!classesRes.ok) throw new Error("Failed to fetch classes");
        const classesData = await classesRes.json();
        setClasses(classesData);

        if (currentUser.id) {
          const reservationsRes = await fetch(`/api/reservations?userId=${currentUser.id}`);
          const reservationsData = await reservationsRes.json();
          setReservations(reservationsData.map((r: any) => r.classId));

          if (currentUser.role === "member") {
            const memRes = await fetch("/api/memberships");
            if (memRes.ok) {
              const memData: MembershipItem[] = await memRes.json();
              setValidServiceTypes(computeValidServiceTypes(memData));
              const balanceMap: Record<string, number> = {};
              memData.forEach((m) => {
                if (
                  m.membershipStatus === "active" &&
                  m.totalSessions != null &&
                  m.usedSessions !== undefined
                ) {
                  balanceMap[m.serviceType] = m.totalSessions - m.usedSessions;
                }
              });
              setSessionBalanceMap(balanceMap);
            }
          }
        }
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser.id, currentUser.isLoading]);

  const handleReserve = async (classId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al reservar");
      }

      // Update local state
      setReservations([...reservations, classId]);

      const classesRes = await fetch("/api/classes");
      const classesData = await classesRes.json();
      setClasses(classesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reserve");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (classId: string) => {
    try {
      setActionLoading(true);
      setCancelNotice(null);
      const res = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cancelar");
      }

      setReservations(reservations.filter((id) => id !== classId));

      const classesRes = await fetch("/api/classes");
      const classesData = await classesRes.json();
      setClasses(classesData);

      if (data.late) {
        setCancelNotice("Cancelación realizada. La sesión no será recuperada.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Clases</h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Explora y reserva tus clases
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center py-12">
            <div style={{ color: "var(--text-secondary)" }}>Cargando clases...</div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="border px-4 py-3 rounded-lg mb-8" style={{ background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)", color: "#ef4444" }}>
            {error}
          </div>
        )}

        {/* Late cancel notice */}
        {cancelNotice && (
          <div className="border px-4 py-3 rounded-lg mb-8" style={{ background: "#f59e0b15", borderColor: "#f59e0b40", color: "#f59e0b" }}>
            {cancelNotice}
          </div>
        )}

        {/* Empty state */}
        {!loading && classes.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: "var(--text-secondary)" }}>No hay clases disponibles.</p>
          </div>
        )}

        {/* Classes grid */}
        {!loading && classes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                id={cls.id}
                name={cls.name}
                coach={cls.coach}
                dayOfWeek={cls.dayOfWeek}
                startTime={cls.startTime}
                endTime={cls.endTime}
                capacity={cls.capacity}
                reserved={cls.reserved}
                serviceType={cls.serviceType}
                isReserved={reservations.includes(cls.id)}
                isLoading={actionLoading}
                membershipBlocked={currentUser.role === "member" && !validServiceTypes.has(cls.serviceType)}
                cancelHint={reservations.includes(cls.id) ? computeCancelHint(cls.sessionDate, cls.startTime) : undefined}
                sessionBalance={sessionBalanceMap[cls.serviceType]}
                onReserve={handleReserve}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
