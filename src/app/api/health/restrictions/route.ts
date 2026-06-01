import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { RestrictionSeverity, Role } from "@prisma/client";

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

  // All gym staff (ADMIN, COACH, KINESIOLOGIST) can read operational restrictions for any member.
  // No MemberCoach scoping — coaches need to see restrictions for all members they work with,
  // including members seen for the first time during a session.

  const restrictions = await prisma.healthRestriction.findMany({
    where: {
      patientId: { in: patientIds },
      ...(isActiveParam !== null ? { isActive: isActiveParam === "true" } : {}),
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  // COACH receives operational data only — no clinical record references
  const hideRecordContext = role === "COACH";
  return Response.json(
    restrictions.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      label: r.label,
      severity: SEV_MAP[r.severity],
      isActive: r.isActive,
      sourceRole: r.sourceRole ?? null,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate?.toISOString().slice(0, 10) ?? null,
      ...(hideRecordContext ? {} : { healthRecordId: r.healthRecordId, createdById: r.createdById }),
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  // MEMBER cannot create restrictions; all staff roles can
  if (role === "MEMBER") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json();
  const { healthRecordId, patientId: bodyPatientId, label, severity = "info", startDate, endDate } = body;

  if (!label?.trim()) {
    return Response.json({ error: "label es requerido" }, { status: 400 });
  }

  let resolvedPatientId: string;

  if (role === "COACH") {
    // COACH creates operational considerations without a health record.
    // patientId must be provided directly.
    if (!bodyPatientId) {
      return Response.json({ error: "patientId es requerido" }, { status: 400 });
    }
    const patient = await prisma.user.findUnique({ where: { id: bodyPatientId } });
    if (!patient) return Response.json({ error: "Miembro no encontrado" }, { status: 404 });
    resolvedPatientId = patient.id;
  } else if (healthRecordId) {
    // ADMIN or KINESIOLOGIST with a health record reference
    const record = await prisma.healthRecord.findUnique({ where: { id: healthRecordId } });
    if (!record) return Response.json({ error: "Ficha no encontrada" }, { status: 404 });

    if (role === "KINESIOLOGIST") {
      const rel = await prisma.memberCoach.findFirst({
        where: { coachId: session.user.id, memberId: record.patientId, serviceType: "KINESIOLOGY", isActive: true },
      });
      if (!rel) return Response.json({ error: "Sin permisos para este paciente" }, { status: 403 });
    }
    resolvedPatientId = record.patientId;
  } else {
    // ADMIN or KINESIOLOGIST without a health record — patientId required
    if (!bodyPatientId) {
      return Response.json({ error: "healthRecordId o patientId es requerido" }, { status: 400 });
    }
    if (role === "KINESIOLOGIST") {
      const rel = await prisma.memberCoach.findFirst({
        where: { coachId: session.user.id, memberId: bodyPatientId, serviceType: "KINESIOLOGY", isActive: true },
      });
      if (!rel) return Response.json({ error: "Sin permisos para este paciente" }, { status: 403 });
    }
    resolvedPatientId = bodyPatientId;
  }

  const restriction = await prisma.healthRestriction.create({
    data: {
      healthRecordId: role === "COACH" ? null : (healthRecordId ?? null),
      patientId: resolvedPatientId,
      createdById: session.user.id,
      sourceRole: session.user.role as Role,
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
    sourceRole: restriction.sourceRole ?? null,
    label: restriction.label,
    severity: SEV_MAP[restriction.severity],
    isActive: restriction.isActive,
    startDate: restriction.startDate.toISOString().slice(0, 10),
    endDate: restriction.endDate?.toISOString().slice(0, 10) ?? null,
    createdAt: restriction.createdAt.toISOString(),
  }, { status: 201 });
}
