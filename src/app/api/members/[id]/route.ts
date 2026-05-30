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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin) {
      return Response.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return Response.json({ error: "Miembro no encontrado" }, { status: 404 });

    const updateData: { name?: string; email?: string; role?: Role; isActive?: boolean } = {};
    if (body.name !== undefined && String(body.name).trim()) {
      updateData.name = String(body.name).trim();
    }
    if (body.email !== undefined && String(body.email).trim()) {
      updateData.email = String(body.email).trim();
    }
    if (body.roles !== undefined && Array.isArray(body.roles) && body.roles.length > 0) {
      updateData.role = ROLE_REVERSE[body.roles[0]] ?? existing.role;
    }
    if (body.status !== undefined) {
      updateData.isActive = body.status === "active";
    }

    await prisma.user.update({ where: { id }, data: updateData });

    // Only update MemberCoach for MEMBER users (not coach/admin)
    const currentRole = updateData.role ?? existing.role;
    if (
      body.contractedServices !== undefined &&
      Array.isArray(body.contractedServices) &&
      currentRole === "MEMBER"
    ) {
      const newServices = body.contractedServices as ServiceType[];
      const assignedCoachId = body.assignedCoachId as string | undefined;

      await prisma.memberCoach.deleteMany({ where: { memberId: id } });

      if (newServices.length > 0 && assignedCoachId) {
        await prisma.memberCoach.createMany({
          data: newServices.map((svc) => ({
            memberId: id,
            coachId: assignedCoachId,
            serviceType: SVC_REVERSE[svc] ?? "GROUP" as DbServiceType,
            isActive: true,
          })),
          skipDuplicates: true,
        });
      }
    }

    const withRelations = await prisma.user.findUniqueOrThrow({
      where: { id },
      include: {
        memberRelations: {
          where: { isActive: true },
          include: { coach: { select: { id: true, name: true } } },
        },
      },
    });

    const firstRelation = withRelations.memberRelations[0];
    const member: Member = {
      id: withRelations.id,
      name: withRelations.name ?? "",
      email: withRelations.email,
      roles: [ROLE_MAP[withRelations.role]],
      status: withRelations.isActive ? "active" : "inactive",
      contractedServices: withRelations.memberRelations
        .map((r) => SVC_MAP[r.serviceType])
        .filter((s): s is ServiceType => !!s),
      ...(firstRelation && {
        assignedCoachId: firstRelation.coachId,
        assignedCoachName: firstRelation.coach.name ?? undefined,
      }),
    };

    return Response.json(member);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
