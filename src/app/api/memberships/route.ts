import { mockMemberships, mockMembers } from "@/lib/mock-data";
import { Membership } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const plan = searchParams.get("plan");
  const studentId = searchParams.get("studentId");

  let result = [...mockMemberships];
  if (status) result = result.filter((m) => m.membershipStatus === status);
  if (plan) result = result.filter((m) => m.plan === plan);
  if (studentId) result = result.filter((m) => m.studentId === studentId);

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentId, serviceType, plan, amount, startDate, endDate,
      paymentStatus = "pending", membershipStatus = "pending",
      coachId, coachName, notes,
    } = body;

    if (!studentId || !serviceType || !plan || !amount || !startDate || !endDate) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const student = mockMembers.find((m) => m.id === studentId);
    if (!student) {
      return Response.json({ error: "Miembro no encontrado" }, { status: 404 });
    }

    // Duplicate: mismo servicio activo solapado en fechas
    const duplicate = mockMemberships.find((m) =>
      m.studentId === studentId &&
      m.serviceType === serviceType &&
      m.membershipStatus === "active" &&
      m.startDate <= endDate &&
      m.endDate >= startDate
    );
    if (duplicate) {
      return Response.json(
        { error: "El miembro ya tiene este servicio activo en ese período" },
        { status: 409 }
      );
    }

    const newMs: Membership = {
      id: `mem-${Date.now()}`,
      studentId,
      studentName: student.name,
      studentEmail: student.email,
      serviceType,
      plan,
      paymentStatus,
      membershipStatus,
      amount: Number(amount),
      startDate,
      endDate,
      ...(coachId && { coachId }),
      ...(coachName && { coachName }),
      ...(notes?.trim() && { notes: notes.trim() }),
    };

    mockMemberships.push(newMs);

    // Actualizar contractedServices del miembro si hace falta
    if (!student.contractedServices.includes(serviceType)) {
      student.contractedServices.push(serviceType);
    }

    return Response.json(newMs, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
