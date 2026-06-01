import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "KINESIOLOGIST") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.healthSession.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Sesión no encontrada" }, { status: 404 });

  if (role === "KINESIOLOGIST") {
    const rel = await prisma.memberCoach.findFirst({
      where: { coachId: session.user.id, memberId: existing.patientId, serviceType: "KINESIOLOGY", isActive: true },
    });
    if (!rel) return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  // CLOSED sessions are read-only (ADMIN can re-open in Phase 2)
  if (existing.status === "CLOSED" && role !== "ADMIN") {
    return Response.json({ error: "La sesión ya está cerrada" }, { status: 400 });
  }

  const body = await request.json();
  const { subjective, objective, assessment, plan, exercises,
    observations, privateNotes, patientNotes, status } = body;

  // Closing is irreversible in MVP
  const newStatus = status === "closed" ? "CLOSED" : existing.status;

  const updated = await prisma.healthSession.update({
    where: { id },
    data: {
      ...(subjective !== undefined ? { subjective } : {}),
      ...(objective !== undefined ? { objective } : {}),
      ...(assessment !== undefined ? { assessment } : {}),
      ...(plan !== undefined ? { plan } : {}),
      ...(exercises !== undefined ? { exercises } : {}),
      ...(observations !== undefined ? { observations } : {}),
      ...(privateNotes !== undefined ? { privateNotes } : {}),
      ...(patientNotes !== undefined ? { patientNotes } : {}),
      status: newStatus,
    },
    include: { kinesiologist: { select: { name: true } } },
  });

  return Response.json({
    id: updated.id,
    status: updated.status.toLowerCase(),
    updatedAt: updated.updatedAt.toISOString(),
    subjective: updated.subjective,
    objective: updated.objective,
    assessment: updated.assessment,
    plan: updated.plan,
    exercises: updated.exercises,
    observations: updated.observations,
    privateNotes: updated.privateNotes,
    patientNotes: updated.patientNotes,
  });
}
