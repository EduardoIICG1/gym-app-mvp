import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "No autenticado" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "KINESIOLOGIST") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase();

  // Patients = users who have an active KINESIOLOGY MemberCoach relation
  const relations = await prisma.memberCoach.findMany({
    where: {
      serviceType: "KINESIOLOGY",
      isActive: true,
      ...(role === "KINESIOLOGIST" ? { coachId: session.user.id } : {}),
    },
    include: {
      member: {
        select: { id: true, name: true, email: true, phone: true, rut: true },
      },
      coach: {
        select: { id: true, name: true },
      },
    },
    distinct: ["memberId"],
  });

  // Get restriction counts per patient
  const patientIds = relations.map((r) => r.memberId);
  const restrictions = patientIds.length
    ? await prisma.healthRestriction.findMany({
        where: { patientId: { in: patientIds }, isActive: true },
        select: { patientId: true, label: true, severity: true },
      })
    : [];

  // Get last health session per patient
  const lastSessions = patientIds.length
    ? await prisma.healthSession.findMany({
        where: { patientId: { in: patientIds } },
        orderBy: { sessionDate: "desc" },
        select: { patientId: true, sessionDate: true },
        distinct: ["patientId"],
      })
    : [];

  // Get patients that already have a HealthRecord (clinical file)
  const records = patientIds.length
    ? await prisma.healthRecord.findMany({
        where: { patientId: { in: patientIds } },
        select: { patientId: true },
      })
    : [];
  const recordPatientIds = new Set(records.map((r) => r.patientId));

  // Get active KINESIOLOGY memberships
  const memberships = patientIds.length
    ? await prisma.membership.findMany({
        where: {
          memberId: { in: patientIds },
          serviceType: "KINESIOLOGY",
          status: "ACTIVE",
        },
        select: { memberId: true, planName: true, totalSessions: true, usedSessions: true },
      })
    : [];

  let patients = relations.map((r) => {
    const patientRestrictions = restrictions.filter((x) => x.patientId === r.memberId);
    const lastSession = lastSessions.find((s) => s.patientId === r.memberId);
    const membership = memberships.find((m) => m.memberId === r.memberId);
    return {
      id: r.memberId,
      name: r.member.name ?? "",
      email: r.member.email,
      phone: r.member.phone ?? null,
      rut: r.member.rut ?? null,
      kinesiologistId: r.coachId,
      kinesiologistName: r.coach.name ?? "",
      hasRecord: recordPatientIds.has(r.memberId),
      activeRestrictions: patientRestrictions.map((x) => ({ label: x.label, severity: x.severity.toLowerCase() })),
      lastSessionDate: lastSession?.sessionDate?.toISOString().slice(0, 10) ?? null,
      membership: membership
        ? {
            planName: membership.planName,
            totalSessions: membership.totalSessions,
            usedSessions: membership.usedSessions,
          }
        : null,
    };
  });

  if (search) {
    patients = patients.filter(
      (p) => p.name.toLowerCase().includes(search) || p.email.toLowerCase().includes(search)
    );
  }

  return Response.json(patients);
}
