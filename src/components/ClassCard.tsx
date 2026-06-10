"use client";

import Link from "next/link";
import { DAY_NAMES } from "@/lib/labels";

interface ClassCardProps {
  id: string;
  name: string;
  coach: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  reserved: number;
  isReserved: boolean;
  isLoading: boolean;
  membershipBlocked?: boolean;
  cancelHint?: { isLate: boolean; deadline: string };
  sessionBalance?: number;
  onReserve: (classId: string) => void;
  onCancel: (classId: string) => void;
}

export function ClassCard({
  id,
  name,
  coach,
  dayOfWeek,
  startTime,
  endTime,
  capacity,
  reserved,
  isReserved,
  isLoading,
  membershipBlocked = false,
  cancelHint,
  sessionBalance,
  onReserve,
  onCancel,
}: ClassCardProps) {
  const occupancy = (reserved / capacity) * 100;
  const isFull = occupancy >= 100;
  const isAlmostFull = occupancy >= 70;

  return (
    <div
      className="rounded-lg shadow-md hover:shadow-lg transition overflow-hidden flex flex-col"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
    >
      {/* Header color bar */}
      <div
        className={`h-1 ${
          isFull ? "bg-red-500" : isAlmostFull ? "bg-orange-500" : "bg-green-500"
        }`}
      ></div>

      <div className="p-4 sm:p-6 flex-1 flex flex-col">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base sm:text-xl font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{name}</h3>
          <span
            className="text-xs font-semibold px-2 py-1 rounded shrink-0"
            style={isFull
              ? { background: "#ef444420", color: "#ef4444" }
              : isAlmostFull
              ? { background: "#f59e0b20", color: "#f59e0b" }
              : { background: "#22c55e20", color: "#22c55e" }}
          >
            {isFull ? "Sin cupos" : isAlmostFull ? "Pocos cupos" : "Disponible"}
          </span>
        </div>

        {/* Coach + día/horario */}
        <p className="text-sm mb-0.5" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--text-secondary)" }}>Coach: </span>{coach}
        </p>
        <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>
          {DAY_NAMES[dayOfWeek]} · {startTime} - {endTime}
        </p>

        {/* Capacity bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Cupos</span>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {reserved} / {capacity}
            </span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "var(--card-border)" }}>
            <div
              className={`h-full transition-all ${
                isFull
                  ? "bg-red-500"
                  : isAlmostFull
                  ? "bg-orange-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${Math.min(occupancy, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Reserve/Cancel Button */}
        <button
          onClick={() => (isReserved ? onCancel(id) : onReserve(id))}
          disabled={isLoading || (isFull && !isReserved) || (membershipBlocked && !isReserved)}
          className="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all mt-auto disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            isReserved
              ? { background: "#ef4444", color: "#ffffff" }
              : membershipBlocked
                ? { background: "#71717a20", color: "#71717a" }
                : isFull || isLoading
                  ? { background: "var(--card-border)", color: "var(--text-secondary)" }
                  : { background: "#3b82f6", color: "#ffffff" }
          }
        >
          {isLoading
            ? "Procesando..."
            : isReserved
              ? "Cancelar reserva"
              : membershipBlocked
                ? "Sin membresía"
                : isFull
                  ? "Sin cupos"
                  : "Reservar clase"}
        </button>

        {isReserved && cancelHint && (
          <p
            className="text-xs text-center mt-2"
            style={{ color: cancelHint.isLate ? "#f59e0b" : "var(--text-muted)" }}
          >
            {cancelHint.isLate
              ? "Cancelación tardía: no recuperarás la sesión"
              : `Cancelación libre hasta las ${cancelHint.deadline}`}
          </p>
        )}

        {!isReserved && sessionBalance !== undefined && (
          <p className="text-xs text-center mt-2" style={{ color: sessionBalance <= 0 ? "#ef4444" : "var(--text-muted)" }}>
            {sessionBalance <= 0
              ? "Sin sesiones disponibles"
              : `${sessionBalance} sesión${sessionBalance === 1 ? "" : "es"} restante${sessionBalance === 1 ? "" : "s"}`}
          </p>
        )}

        <Link
          href={`/classes/${id}?from=classes`}
          className="text-xs text-center block mt-3 hover:underline font-medium"
          style={{ color: "#4fc3f7" }}
        >
          Ver inscritos →
        </Link>
      </div>
    </div>
  );
}
