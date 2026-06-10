"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DAY_NAMES } from "@/lib/labels";
import { ServiceDot } from "@/components/Badge";

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
  serviceType?: string;
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
  serviceType,
  membershipBlocked = false,
  cancelHint,
  sessionBalance,
  onReserve,
  onCancel,
}: ClassCardProps) {
  const router = useRouter();
  const occupancy = (reserved / capacity) * 100;
  const isFull = occupancy >= 100;
  const isAlmostFull = occupancy >= 70;

  return (
    <div
      onClick={() => router.push(`/classes/${id}?from=classes`)}
      className="rounded-lg shadow-md hover:shadow-lg active:bg-white/[0.02] transition overflow-hidden flex flex-col cursor-pointer"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
    >
      {/* Header color bar */}
      <div
        className={`h-1 ${
          isFull ? "bg-red-500" : isAlmostFull ? "bg-orange-500" : "bg-green-500"
        }`}
      ></div>

      <div className="p-6 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>{name}</h3>

        {/* Coach + day/time + service type (compact metadata) */}
        <div className="flex items-center justify-between gap-2 mb-4 text-xs">
          <span className="truncate" style={{ color: "var(--text-secondary)" }}>
            {coach} · {DAY_NAMES[dayOfWeek]} · {startTime} - {endTime}
          </span>
          {serviceType && <ServiceDot type={serviceType} />}
        </div>

        {/* Capacity bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>CUPOS</span>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {reserved} / {capacity}
            </span>
          </div>
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "var(--card-border)" }}>
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

        {/* Status badge */}
        <div
          className="text-sm font-semibold py-2 px-3 rounded text-center mb-4"
          style={isFull
            ? { background: "#ef444420", color: "#ef4444" }
            : isAlmostFull
            ? { background: "#f59e0b20", color: "#f59e0b" }
            : { background: "#22c55e20", color: "#22c55e" }}
        >
          {isFull ? "Sin cupos" : isAlmostFull ? "Pocos cupos" : "Disponible"}
        </div>

        {/* Reserve/Cancel Button */}
        <button
          onClick={(e) => { e.stopPropagation(); if (isReserved) onCancel(id); else onReserve(id); }}
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
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-center block mt-3 hover:underline font-medium"
          style={{ color: "#4fc3f7" }}
        >
          Ver inscritos →
        </Link>
      </div>
    </div>
  );
}
