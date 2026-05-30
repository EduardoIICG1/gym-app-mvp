import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Member, MemberRole, ServiceType } from "@/lib/types";
import type { Role, ServiceType as DbServiceType } from "@prisma/client";

const ROLE_MAP: Record<Role, MemberRole> = {
  ADMIN: "admin",
  COACH: "coach",
  MEMBER: "member",
  KINESIOLOGIST: "kinesiologist",
};

const SVC_MAP: Partial<Record<DbServiceType, ServiceType>> = {
  GROUP: "group",
  PERSONAL_TRAINING: "personal_training",
  KINESIOLOGY: "kinesiology",
};

const SVC_REVERSE: Record<string, DbServiceType> = {
  group: "GROUP",
  personal_training: "PERSONAL_TRAINING",
  kinesiology: "KINESIOLOGY",
};

const ROLE_REVERSE: Record<string, Role> = {
  admin: "ADMIN",
  coach: "COACH",
  member: "MEMBER",
};

async function fetchAllUsers() {
  return prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      memberRelations: {
        where: { isActive: true },
        include: { coach: { select: { id: true, name: true } } },
      },
    },
  });
}

type UserWithRelations = Awaited<ReturnType<typeof fetchAllUsers>>[number];

function toMember(u: UserWithRelations): Member {
  const firstRelation = u.memberRelations[0];
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    roles: [ROLE_MAP[u.role]],
    status: u.isActive ? "active" : "inactive",
    contractedServices: u.memberRelations
      .map((r) => SVC_MAP[r.serviceType])
      .filter((s): s is ServiceType => !!s),
    ...(firstRelation && {
      assignedCoachId: firstRelation.coachId,
      assignedCoachName: firstRelation.coach.name ?? undefined,
    }),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includesRole = searchParams.get("includesRole") as MemberRole | null;
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();

  const isAdminOrCoach = session.user.role === "ADMIN" || session.user.role === "COACH";

  // MEMBER: can only see their own record (prevents listing all users/emails)
  const users = isAdminOrCoach
    ? await fetchAllUsers()
    : await prisma.user.findMany({
        where: { id: session.user.id },
        include: {
          memberRelations: {
            where: { isActive: true },
            include: { coach: { select: { id: true, name: true } } },
          },
        },
      });

  let result = users.map(toMember);

  if (includesRole) result = result.filter((m) => m.roles.includes(includesRole));
  if (status === "active")   result = result.filter((m) => m.status === "active");
  if (status === "inactive") result = result.filter((m) => m.status === "inactive");
  if (search) result = result.filter(
    (m) => m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search)
  );

  return Response.json(result);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name, email, roles, role, status = "active",
      assignedCoachId, contractedServices = [],
    } = body;

    if (!name?.trim() || !email?.trim()) {
      return Response.json({ error: "Nombre y email son requeridos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return Response.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const memberRoles: MemberRole[] = Array.isArray(roles) ? roles : [((role as MemberRole) || "member")];
    const dbRole: Role = ROLE_REVERSE[memberRoles[0]] ?? "MEMBER";

    // COACH: can only create MEMBER — not ADMIN or COACH
    if (session.user.role === "COACH" && dbRole !== "MEMBER") {
      return Response.json({ error: "Sin permisos para crear este rol" }, { status: 403 });
    }

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: dbRole,
        isActive: status === "active",
      },
    });

    if (assignedCoachId && (contractedServices as ServiceType[]).length > 0 && dbRole === "MEMBER") {
      await prisma.memberCoach.createMany({
        data: (contractedServices as ServiceType[]).map((svc) => ({
          memberId: newUser.id,
          coachId: assignedCoachId as string,
          serviceType: SVC_REVERSE[svc] ?? "GROUP" as DbServiceType,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    }

    const withRelations = await prisma.user.findUniqueOrThrow({
      where: { id: newUser.id },
      include: {
        memberRelations: {
          where: { isActive: true },
          include: { coach: { select: { id: true, name: true } } },
        },
      },
    });

    return Response.json(toMember(withRelations), { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
