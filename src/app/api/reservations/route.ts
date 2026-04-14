import { mockClasses, mockReservations } from "@/lib/mock-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json({ error: "userId is required" }, { status: 400 });
    }

    const userReservations = mockReservations.filter(
      (r) => r.userId === userId
    );

    return Response.json(userReservations);
  } catch (error) {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { classId, userId } = await request.json();

    // Validar que la clase existe
    const classData = mockClasses.find((c) => c.id === classId);
    if (!classData) {
      return Response.json({ error: "Class not found" }, { status: 404 });
    }

    // Validar que no está lleno
    if (classData.reserved >= classData.capacity) {
      return Response.json({ error: "Class is full" }, { status: 400 });
    }

    // Validar que no está ya reservado
    const alreadyReserved = mockReservations.some(
      (r) => r.classId === classId && r.userId === userId
    );
    if (alreadyReserved) {
      return Response.json(
        { error: "Already reserved" },
        { status: 400 }
      );
    }

    // Crear reserva
    const reservation = {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      classId,
    };
    mockReservations.push(reservation);
    classData.reserved += 1;

    return Response.json(reservation);
  } catch (error) {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { classId, userId } = await request.json();

    // Encontrar y eliminar la reserva
    const index = mockReservations.findIndex(
      (r) => r.classId === classId && r.userId === userId
    );
    if (index === -1) {
      return Response.json(
        { error: "Reservation not found" },
        { status: 404 }
      );
    }

    mockReservations.splice(index, 1);

    // Decrementar reserved count
    const classData = mockClasses.find((c) => c.id === classId);
    if (classData && classData.reserved > 0) {
      classData.reserved -= 1;
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
