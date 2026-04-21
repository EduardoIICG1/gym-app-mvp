"use client";

import { useEffect, useState } from "react";
import { ClassCard } from "@/components/ClassCard";

interface Class {
  id: string;
  name: string;
  coach: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  reserved: number;
  serviceType: string;
}

const MOCK_USER_ID = "user-123";

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [reservations, setReservations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch classes
        const classesRes = await fetch("/api/classes");
        if (!classesRes.ok) throw new Error("Failed to fetch classes");
        const classesData = await classesRes.json();
        setClasses(classesData);

        // Fetch user reservations
        const reservationsRes = await fetch(
          `/api/reservations?userId=${MOCK_USER_ID}`
        );
        const reservationsData = await reservationsRes.json();
        setReservations(reservationsData.map((r: any) => r.classId));

        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleReserve = async (classId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, userId: MOCK_USER_ID }),
      });

      if (!res.ok) {
        throw new Error("Failed to reserve class");
      }

      // Update local state
      setReservations([...reservations, classId]);

      // Refresh classes
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
      const res = await fetch("/api/reservations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, userId: MOCK_USER_ID }),
      });

      if (!res.ok) {
        throw new Error("Failed to cancel reservation");
      }

      // Update local state
      setReservations(reservations.filter((id) => id !== classId));

      // Refresh classes
      const classesRes = await fetch("/api/classes");
      const classesData = await classesRes.json();
      setClasses(classesData);
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
                isReserved={reservations.includes(cls.id)}
                isLoading={actionLoading}
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
