import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ServiceType } from "@/lib/types";
import type { ServiceType as DbServiceType } from "@prisma/client";

const SVC_MAP: Partial<Record<DbServiceType, ServiceType>> = {
  GROUP: "group",
  PERSONAL_TRAINING: "personal_training",
  KINESIOLOGY: "kinesiology",
  OTHER: "blocked_time",
};

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Solo lectura: dado un sessionId, retorna su programa y todas las sesiones
// hermanas (activas y canceladas) con conteo de reservas, para que el admin
// pueda ver una serie recurrente como conjunto antes de operar sobre ella.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const role = authSession.user.role;
  if (role === "MEMBER") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.session.findUnique({
    where: { id },
    include: { program: true },
  });
  if (!existing) return Response.json({ error: "Clase no encontrada" }, { status: 404 });

  if (role === "COACH" && existing.coachId !== authSession.user.id) {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const prog = existing.program;
  const startTime = prog.startTime ?? existing.startsAt.toISOString().slice(11, 16);
  const endTime = addMinutes(startTime, prog.durationMin);

  const sessions = await prisma.session.findMany({
    where: { programId: prog.id },
    include: {
      coach: { select: { id: true, name: true } },
      _count: {
        select: { bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } } },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  const activeSessions = sessions.filter((s) => s.status !== "CANCELLED");
  const cancelledSessions = sessions.filter((s) => s.status === "CANCELLED");
  const coachIds = new Set(sessions.map((s) => s.coachId));

  return Response.json({
    programId: prog.id,
    programName: prog.name,
    serviceType: SVC_MAP[prog.serviceType] ?? "group",
    capacity: prog.maxCapacity ?? 0,
    startTime,
    endTime,
    coachVaries: coachIds.size > 1,
    primaryCoachName: sessions[0]?.coach.name ?? "",
    totalActive: activeSessions.length,
    totalCancelled: cancelledSessions.length,
    rangeStart: sessions[0]?.startsAt.toISOString().slice(0, 10) ?? null,
    rangeEnd: sessions[sessions.length - 1]?.startsAt.toISOString().slice(0, 10) ?? null,
    sessions: sessions.map((s) => ({
      id: s.id,
      sessionDate: s.startsAt.toISOString().slice(0, 10),
      startTime: `${String(s.startsAt.getHours()).padStart(2, "0")}:${String(s.startsAt.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(s.endsAt.getHours()).padStart(2, "0")}:${String(s.endsAt.getMinutes()).padStart(2, "0")}`,
      coachId: s.coachId,
      coachName: s.coach.name ?? "",
      status: s.status === "CANCELLED" ? "cancelled" : "active",
      reservedCount: s._count.bookings,
      capacity: prog.maxCapacity ?? 0,
      hasActiveBookings: s._count.bookings > 0,
    })),
  });
}
