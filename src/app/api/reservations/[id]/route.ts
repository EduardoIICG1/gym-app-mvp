import { mockReservations } from "@/lib/mock-data";
import { ReservationStatus } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await request.json() as { status: ReservationStatus };

    const reservation = mockReservations.find((r) => r.id === id);
    if (!reservation) return Response.json({ error: "Reserva no encontrada" }, { status: 404 });

    reservation.status = status;
    return Response.json(reservation);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
