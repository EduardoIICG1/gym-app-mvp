import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { HealthSessionStatus } from "@prisma/client";

function toSession(s: {
  id: string; healthRecordId: string; sessionId: string | null; kinesiologistId: string;
  patientId: string; sessionDate: Date; subjective: string | null; objective: string | null;
  assessment: string | null; plan: string | null; exercises: string | null;
  observations: string | null; privateNotes: string | null; patientNotes: string | null;
  status: HealthSessionStatus; createdAt: Date; updatedAt: Date;
  kinesiologist?: { name: string | null };
}, hidePrivate: boolean) {
  return {
    id: s.id,
    healthRecordId: s.healthRecordId,
    sessionId: s.sessionId,
    kinesiologistId: s.kinesiologistId,
    kinesiologistName: s.kinesiologist?.name ?? null,
    patientId: s.patientId,
    sessionDate: s.sessionDate.toISOString(),
    subjective: hidePrivate ? undefined : s.subjective,
    objective: hidePrivate ? undefined : s.objective,
    assessment: hidePrivate ? undefined : s.assessment,
    plan: hidePrivate ? undefined : s.plan,
    exercises: hidePrivate ? undefined : s.exercises,
    observations: hidePrivate ? undefined : s.observations,
    privateNotes: hidePrivate ? undefined : s.privateNotes,
    patientNotes: s.patientNotes,
    status: s.status.toLowerCase(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  const status = searchParams.get("status")?.toUpperCase() as HealthSessionStatus | undefined;

  if (!patientId) return Response.json({ error: "patientId requerido" }, { status: 400 });

  if (role === "MEMBER") {
    if (patientId !== session.user.id) return Response.json({ error: "Sin permisos" }, { status: 403 });
  } else if (role === "KINESIOLOGIST") {
    const rel = await prisma.memberCoach.findFirst({
      where: { coachId: session.user.id, memberId: patientId, serviceType: "KINESIOLOGY", isActive: true },
    });
    if (!rel) return Response.json({ error: "Sin permisos" }, { status: 403 });
  } else if (role !== "ADMIN") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const sessions = await prisma.healthSession.findMany({
    where: {
      patientId,
      ...(status ? { status } : {}),
    },
    include: { kinesiologist: { select: { name: true } } },
    orderBy: { sessionDate: "desc" },
  });

  const hidePrivate = role === "MEMBER";
  return Response.json(sessions.map((s) => toSession(s, hidePrivate)));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "KINESIOLOGIST") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json();
  const { healthRecordId, sessionId, sessionDate, subjective, objective,
    assessment, plan, exercises, observations, privateNotes, patientNotes } = body;

  if (!healthRecordId || !sessionDate) {
    return Response.json({ error: "healthRecordId y sessionDate son requeridos" }, { status: 400 });
  }

  const record = await prisma.healthRecord.findUnique({ where: { id: healthRecordId } });
  if (!record) return Response.json({ error: "Ficha no encontrada" }, { status: 404 });

  if (role === "KINESIOLOGIST") {
    const rel = await prisma.memberCoach.findFirst({
      where: { coachId: session.user.id, memberId: record.patientId, serviceType: "KINESIOLOGY", isActive: true },
    });
    if (!rel) return Response.json({ error: "Sin permisos para este paciente" }, { status: 403 });
  }

  const hs = await prisma.healthSession.create({
    data: {
      healthRecordId,
      sessionId: sessionId ?? null,
      kinesiologistId: session.user.id,
      patientId: record.patientId,
      sessionDate: new Date(sessionDate),
      subjective: subjective ?? null,
      objective: objective ?? null,
      assessment: assessment ?? null,
      plan: plan ?? null,
      exercises: exercises ?? null,
      observations: observations ?? null,
      privateNotes: privateNotes ?? null,
      patientNotes: patientNotes ?? null,
      status: "OPEN",
    },
    include: { kinesiologist: { select: { name: true } } },
  });

  return Response.json(toSession(hs, false), { status: 201 });
}
