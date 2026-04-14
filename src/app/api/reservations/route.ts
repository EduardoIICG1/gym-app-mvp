import { mockClasses, mockReservations } from "@/lib/mock-data";
import { Reservation } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const classId = searchParams.get("classId");

  let result = [...mockReservations];
  if (userId) result = result.filter((r) => r.studentId === userId);
  if (classId) result = result.filter((r) => r.classId === classId);

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    const { classId, userId, classDate } = await request.json();

    const cls = mockClasses.find((c) => c.id === classId);
    if (!cls) return Response.json({ error: "Clase no encontrada" }, { status: 404 });
    if (cls.status === "cancelled") return Response.json({ error: "Clase cancelada" }, { status: 400 });
    if (cls.reservedCount >= cls.maxCapacity) return Response.json({ error: "Clase llena" }, { status: 400 });

    const duplicate = mockReservations.find(
      (r) => r.classId === classId && r.studentId === userId && r.classDate === classDate && r.status !== "cancelled"
    );
    if (duplicate) return Response.json({ error: "Ya tienes esta clase reservada" }, { status: 400 });

    const reservation: Reservation = {
      id: `res-${Date.now()}`,
      classId,
      studentId: userId,
      studentName: "Eduardo García",
      studentEmail: "eduardo@primaryperformance.mx",
      classDate,
      status: "reserved",
    };

    mockReservations.push(reservation);
    cls.reservedCount += 1;
    return Response.json(reservation, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { classId, userId, classDate } = await request.json();

    const idx = mockReservations.findIndex(
      (r) => r.classId === classId && r.studentId === userId && r.classDate === classDate && r.status !== "cancelled"
    );
    if (idx === -1) return Response.json({ error: "Reserva no encontrada" }, { status: 404 });

    mockReservations.splice(idx, 1);

    const cls = mockClasses.find((c) => c.id === classId);
    if (cls && cls.reservedCount > 0) cls.reservedCount -= 1;

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
