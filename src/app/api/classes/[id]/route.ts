import { mockClasses, mockReservations } from "@/lib/mock-data";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const idx = mockClasses.findIndex((c) => c.id === id);
    if (idx === -1) return Response.json({ error: "Clase no encontrada" }, { status: 404 });

    mockClasses[idx] = { ...mockClasses[idx], ...body, id };
    return Response.json(mockClasses[idx]);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idx = mockClasses.findIndex((c) => c.id === id);
  if (idx === -1) return Response.json({ error: "Clase no encontrada" }, { status: 404 });

  // Cancel related reservations
  mockReservations.forEach((r) => {
    if (r.classId === id) r.status = "cancelled";
  });

  mockClasses.splice(idx, 1);
  return Response.json({ success: true });
}
