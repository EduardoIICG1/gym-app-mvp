import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RestrictionSeverity } from "@prisma/client";

const SEV_MAP: Record<RestrictionSeverity, string> = {
  INFO: "info", WARNING: "warning", CRITICAL: "critical",
};
const SEV_REVERSE: Record<string, RestrictionSeverity> = {
  info: "INFO", warning: "WARNING", critical: "CRITICAL",
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role === "MEMBER") return Response.json({ error: "Sin permisos" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  // Batch support for calendar view: ?patientIds=id1,id2,id3
  const patientIdsParam = searchParams.get("patientIds");
  const isActiveParam = searchParams.get("isActive");

  const patientIds = patientIdsParam
    ? patientIdsParam.split(",").filter(Boolean)
    : patientId
    ? [patientId]
    : [];

  if (patientIds.length === 0) return Response.json({ error: "patientId o patientIds requerido" }, { status: 400 });

  // COACH: only allowed if they have MemberCoach relation with those patients
  if (role === "COACH") {
    const rels = await prisma.memberCoach.findMany({
      where: { coachId: session.user.id, memberId: { in: patientIds }, isActive: true },
      select: { memberId: true },
    });
    const allowed = new Set(rels.map((r) => r.memberId));
    const denied = patientIds.filter((id) => !allowed.has(id));
    if (denied.length > 0) return Response.json({ error: "Sin permisos para algunos pacientes" }, { status: 403 });
  }

  // KINESIOLOGIST: only own patients
  if (role === "KINESIOLOGIST") {
    const rels = await prisma.memberCoach.findMany({
      where: { coachId: session.user.id, memberId: { in: patientIds }, serviceType: "KINESIOLOGY", isActive: true },
      select: { memberId: true },
    });
    const allowed = new Set(rels.map((r) => r.memberId));
    const denied = patientIds.filter((id) => !allowed.has(id));
    if (denied.length > 0) return Response.json({ error: "Sin permisos para algunos pacientes" }, { status: 403 });
  }

  const restrictions = await prisma.healthRestriction.findMany({
    where: {
      patientId: { in: patientIds },
      ...(isActiveParam !== null ? { isActive: isActiveParam === "true" } : {}),
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const isCoach = role === "COACH";
  return Response.json(
    restrictions.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      label: r.label,
      severity: SEV_MAP[r.severity],
      isActive: r.isActive,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
      // Coaches don't receive clinical record context
      ...(isCoach ? {} : { healthRecordId: r.healthRecordId, createdById: r.createdById }),
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "KINESIOLOGIST") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json();
  const { healthRecordId, label, severity = "info", startDate, endDate } = body;

  if (!healthRecordId || !label?.trim()) {
    return Response.json({ error: "healthRecordId y label son requeridos" }, { status: 400 });
  }

  const record = await prisma.healthRecord.findUnique({ where: { id: healthRecordId } });
  if (!record) return Response.json({ error: "Ficha no encontrada" }, { status: 404 });

  if (role === "KINESIOLOGIST") {
    const rel = await prisma.memberCoach.findFirst({
      where: { coachId: session.user.id, memberId: record.patientId, serviceType: "KINESIOLOGY", isActive: true },
    });
    if (!rel) return Response.json({ error: "Sin permisos para este paciente" }, { status: 403 });
  }

  const restriction = await prisma.healthRestriction.create({
    data: {
      healthRecordId,
      patientId: record.patientId,
      createdById: session.user.id,
      label: label.trim(),
      severity: SEV_REVERSE[severity] ?? "INFO",
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  return Response.json({
    id: restriction.id,
    patientId: restriction.patientId,
    healthRecordId: restriction.healthRecordId,
    label: restriction.label,
    severity: SEV_MAP[restriction.severity],
    isActive: restriction.isActive,
    startDate: restriction.startDate.toISOString().slice(0, 10),
    endDate: restriction.endDate?.toISOString().slice(0, 10) ?? null,
    createdAt: restriction.createdAt.toISOString(),
  }, { status: 201 });
}
