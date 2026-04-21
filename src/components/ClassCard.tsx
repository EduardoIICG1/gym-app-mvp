"use client";

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

      <div className="p-6 flex-1 flex flex-col">
        {/* Title */}
        <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>{name}</h3>

        {/* Info grid */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Instructor</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{coach}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Día</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {DAY_NAMES[dayOfWeek]}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>Horario</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              {startTime} - {endTime}
            </span>
          </div>
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
          className={`text-sm font-semibold py-2 px-3 rounded text-center mb-4 ${
            isFull
              ? "bg-red-50 text-red-700"
              : isAlmostFull
              ? "bg-orange-50 text-orange-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {isFull ? "Sin cupos" : isAlmostFull ? "Pocos cupos" : "Disponible"}
        </div>

        {/* Reserve/Cancel Button */}
        <button
          onClick={() => (isReserved ? onCancel(id) : onReserve(id))}
          disabled={isLoading || (isFull && !isReserved)}
          className="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all mt-auto disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            isReserved
              ? { background: "#ef4444", color: "#ffffff" }
              : isFull || isLoading
                ? { background: "var(--card-border)", color: "var(--text-secondary)" }
                : { background: "#3b82f6", color: "#ffffff" }
          }
        >
          {isLoading
            ? "Procesando..."
            : isReserved
              ? "Cancelar reserva"
              : isFull
                ? "Sin cupos"
                : "Reservar clase"}
        </button>
      </div>
    </div>
  );
}
