import { mockMembers } from "@/lib/mock-data";
import { Member, MemberRole, MemberStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as MemberRole | null;
  const status = searchParams.get("status") as MemberStatus | null;
  const search = searchParams.get("search")?.toLowerCase();

  let result = [...mockMembers];
  if (role) result = result.filter((m) => m.role === role);
  if (status) result = result.filter((m) => m.status === status);
  if (search) result = result.filter((m) =>
    m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search)
  );

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, email, role = "member", status = "active",
      assignedCoachId, assignedCoachName, contractedServices = [], notes,
    } = body;

    if (!name?.trim() || !email?.trim()) {
      return Response.json({ error: "Nombre y email son requeridos" }, { status: 400 });
    }

    if (mockMembers.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) {
      return Response.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const newMember: Member = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      status,
      contractedServices,
      ...(assignedCoachId && { assignedCoachId }),
      ...(assignedCoachName && { assignedCoachName }),
      ...(notes?.trim() && { notes: notes.trim() }),
    };

    mockMembers.push(newMember);
    return Response.json(newMember, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
