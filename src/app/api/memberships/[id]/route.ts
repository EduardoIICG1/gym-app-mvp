import { mockMemberships } from "@/lib/mock-data";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const idx = mockMemberships.findIndex((m) => m.id === id);
    if (idx === -1) return Response.json({ error: "Membresía no encontrada" }, { status: 404 });

    mockMemberships[idx] = { ...mockMemberships[idx], ...body };
    return Response.json(mockMemberships[idx]);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
