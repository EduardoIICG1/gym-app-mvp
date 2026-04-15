import { mockMembers } from "@/lib/mock-data";
import type { Member } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const idx = mockMembers.findIndex((m) => m.id === id);
    if (idx === -1) return Response.json({ error: "Miembro no encontrado" }, { status: 404 });

    // Whitelist — name and email are identity fields, never updated here
    const updates: Partial<Member> = {};
    if (body.role !== undefined)               updates.role               = body.role;
    if (body.status !== undefined)             updates.status             = body.status;
    if (body.contractedServices !== undefined) updates.contractedServices = body.contractedServices;
    if (body.assignedCoachId !== undefined)    updates.assignedCoachId    = body.assignedCoachId;
    if (body.assignedCoachName !== undefined)  updates.assignedCoachName  = body.assignedCoachName;
    if (body.notes !== undefined)              updates.notes              = body.notes;

    mockMembers[idx] = { ...mockMembers[idx], ...updates };
    return Response.json(mockMembers[idx]);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
