import { mockMembers } from "@/lib/mock-data";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const idx = mockMembers.findIndex((m) => m.id === id);
    if (idx === -1) return Response.json({ error: "Miembro no encontrado" }, { status: 404 });

    mockMembers[idx] = { ...mockMembers[idx], ...body };
    return Response.json(mockMembers[idx]);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
