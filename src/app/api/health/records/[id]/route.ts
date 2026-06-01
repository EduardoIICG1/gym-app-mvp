import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
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
  const existing = await prisma.healthRecord.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Ficha no encontrada" }, { status: 404 });

  if (role === "KINESIOLOGIST") {
    const rel = await prisma.memberCoach.findFirst({
      where: { coachId: session.user.id, memberId: existing.patientId, serviceType: "KINESIOLOGY", isActive: true },
    });
    if (!rel) return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await request.json();
  const {
    birthDate, biologicalSex, occupation, reasonForConsult, medicalBackground,
    surgeries, currentMedication, allergies, painLevel,
    initialAssessment, diagnosis, treatmentGoals, internalNotes,
  } = body;

  const updated = await prisma.healthRecord.update({
    where: { id },
    data: {
      ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
      ...(biologicalSex !== undefined ? { biologicalSex } : {}),
      ...(occupation !== undefined ? { occupation } : {}),
      ...(reasonForConsult !== undefined ? { reasonForConsult } : {}),
      ...(medicalBackground !== undefined ? { medicalBackground } : {}),
      ...(surgeries !== undefined ? { surgeries } : {}),
      ...(currentMedication !== undefined ? { currentMedication } : {}),
      ...(allergies !== undefined ? { allergies } : {}),
      ...(painLevel !== undefined ? { painLevel } : {}),
      ...(initialAssessment !== undefined ? { initialAssessment } : {}),
      ...(diagnosis !== undefined ? { diagnosis } : {}),
      ...(treatmentGoals !== undefined ? { treatmentGoals } : {}),
      ...(internalNotes !== undefined ? { internalNotes } : {}),
    },
  });

  return Response.json(updated);
}
