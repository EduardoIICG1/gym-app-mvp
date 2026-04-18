import { mockReservations } from "@/lib/mock-data";
import { ReservationStatus, AttendanceStatus } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json() as {
      status?: ReservationStatus;
      attendanceStatus?: AttendanceStatus;
      eligibleForMakeup?: boolean;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
      updateNote?: string;
    };

    const reservation = mockReservations.find((r) => r.id === id);
    if (!reservation) return Response.json({ error: "Reserva no encontrada" }, { status: 404 });

    // Legacy status field (keep backward compat with admin/classes page)
    if (body.status !== undefined) reservation.status = body.status;

    // New attendance layer
    if (body.attendanceStatus !== undefined) reservation.attendanceStatus = body.attendanceStatus;
    if (body.eligibleForMakeup !== undefined) reservation.eligibleForMakeup = body.eligibleForMakeup;
    if (body.lastUpdatedBy !== undefined) reservation.lastUpdatedBy = body.lastUpdatedBy;
    if (body.lastUpdatedAt !== undefined) reservation.lastUpdatedAt = body.lastUpdatedAt;
    if (body.updateNote !== undefined) reservation.updateNote = body.updateNote;

    return Response.json(reservation);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
