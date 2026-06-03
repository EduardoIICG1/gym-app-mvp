import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RestrictionSeverity } from "@prisma/client";

const SEV_REVERSE: Record<string, RestrictionSeverity> = {
  info: "INFO", warning: "WARNING", critical: "CRITICAL",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role === "MEMBER") return Response.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.healthRestriction.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Restricción no encontrada" }, { status: 404 });

  if (role === "KINESIOLOGIST") {
    const rel = await prisma.memberCoach.findFirst({
      where: { coachId: session.user.id, memberId: existing.patientId, serviceType: "KINESIOLOGY", isActive: true },
    });
    if (!rel) return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  // COACH can only edit entries they created
  if (role === "COACH" && existing.createdById !== session.user.id) {
    return Response.json({ error: "Solo puedes editar tus propias consideraciones" }, { status: 403 });
  }

  const body = await request.json();
  const { label, severity, isActive, endDate } = body;

  const updated = await prisma.healthRestriction.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label: label.trim() } : {}),
      ...(severity !== undefined ? { severity: SEV_REVERSE[severity] ?? existing.severity } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
    },
  });

  return Response.json({ id: updated.id, isActive: updated.isActive, label: updated.label });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role === "MEMBER") return Response.json({ error: "Sin permisos" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.healthRestriction.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Restricción no encontrada" }, { status: 404 });

  if (role === "KINESIOLOGIST") {
    const rel = await prisma.memberCoach.findFirst({
      where: { coachId: session.user.id, memberId: existing.patientId, serviceType: "KINESIOLOGY", isActive: true },
    });
    if (!rel) return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  // COACH can only delete entries they created
  if (role === "COACH" && existing.createdById !== session.user.id) {
    return Response.json({ error: "Solo puedes eliminar tus propias consideraciones" }, { status: 403 });
  }

  await prisma.healthRestriction.delete({ where: { id } });
  return Response.json({ ok: true });
}
