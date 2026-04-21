import { mockMembers } from "@/lib/mock-data";
import { Member, MemberRole, MemberStatus } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includesRole = searchParams.get("includesRole") as MemberRole | null;
  const status = searchParams.get("status") as MemberStatus | null;
  const search = searchParams.get("search")?.toLowerCase();

  let result = [...mockMembers];
  // Filter by a role the member must include (supports multi-role members)
  if (includesRole) result = result.filter((m) => m.roles.includes(includesRole));
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
      name, email, roles, role, status = "active",
      assignedCoachId, assignedCoachName, contractedServices = [], notes,
    } = body;

    if (!name?.trim() || !email?.trim()) {
      return Response.json({ error: "Nombre y email son requeridos" }, { status: 400 });
    }

    if (mockMembers.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) {
      return Response.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    // Accept roles array or fall back to single role string for backward compat
    const memberRoles: MemberRole[] = Array.isArray(roles)
      ? roles
      : [((role as MemberRole) || "member")];

    const newMember: Member = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      roles: memberRoles,
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
