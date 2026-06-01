import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function hasKineAccess(kinesiologistId: string, patientId: string) {
  const rel = await prisma.memberCoach.findFirst({
    where: { coachId: kinesiologistId, memberId: patientId, serviceType: "KINESIOLOGY", isActive: true },
  });
  return !!rel;
}

function toRecord(r: Awaited<ReturnType<typeof prisma.healthRecord.findUnique>>, hideInternal: boolean) {
  if (!r) return null;
  return {
    id: r.id,
    patientId: r.patientId,
    createdById: r.createdById,
    birthDate: r.birthDate?.toISOString().slice(0, 10) ?? null,
    biologicalSex: r.biologicalSex,
    occupation: r.occupation,
    reasonForConsult: r.reasonForConsult,
    medicalBackground: r.medicalBackground,
    surgeries: r.surgeries,
    currentMedication: r.currentMedication,
    allergies: r.allergies,
    painLevel: r.painLevel,
    initialAssessment: r.initialAssessment,
    diagnosis: r.diagnosis,
    treatmentGoals: r.treatmentGoals,
    internalNotes: hideInternal ? undefined : r.internalNotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");

  if (!patientId) return Response.json({ error: "patientId requerido" }, { status: 400 });

  if (role === "MEMBER") {
    if (patientId !== session.user.id) return Response.json({ error: "Sin permisos" }, { status: 403 });
  } else if (role === "KINESIOLOGIST") {
    const ok = await hasKineAccess(session.user.id, patientId);
    if (!ok) return Response.json({ error: "Sin permisos" }, { status: 403 });
  } else if (role !== "ADMIN") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const record = await prisma.healthRecord.findUnique({ where: { patientId } });
  if (!record) return Response.json(null);

  return Response.json(toRecord(record, role === "MEMBER"));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "KINESIOLOGIST") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json();
  const { patientId, birthDate, biologicalSex, occupation, reasonForConsult,
    medicalBackground, surgeries, currentMedication, allergies, painLevel,
    initialAssessment, diagnosis, treatmentGoals, internalNotes } = body;

  if (!patientId) return Response.json({ error: "patientId requerido" }, { status: 400 });

  if (role === "KINESIOLOGIST") {
    const ok = await hasKineAccess(session.user.id, patientId);
    if (!ok) return Response.json({ error: "Sin permisos para este paciente" }, { status: 403 });
  }

  const existing = await prisma.healthRecord.findUnique({ where: { patientId } });
  if (existing) return Response.json({ error: "Ya existe una ficha para este paciente" }, { status: 409 });

  const record = await prisma.healthRecord.create({
    data: {
      patientId,
      createdById: session.user.id,
      birthDate: birthDate ? new Date(birthDate) : null,
      biologicalSex: biologicalSex ?? null,
      occupation: occupation ?? null,
      reasonForConsult: reasonForConsult ?? null,
      medicalBackground: medicalBackground ?? null,
      surgeries: surgeries ?? null,
      currentMedication: currentMedication ?? null,
      allergies: allergies ?? null,
      painLevel: painLevel ?? null,
      initialAssessment: initialAssessment ?? null,
      diagnosis: diagnosis ?? null,
      treatmentGoals: treatmentGoals ?? null,
      internalNotes: internalNotes ?? null,
    },
  });

  return Response.json(toRecord(record, false), { status: 201 });
}
