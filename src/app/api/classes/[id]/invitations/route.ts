import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await auth();
  if (!authSession?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const role = authSession.user.role;
  if (role === "MEMBER") {
    return Response.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;

  if (role === "COACH") {
    const session = await prisma.session.findUnique({
      where: { id },
      select: { coachId: true },
    });
    if (!session || session.coachId !== authSession.user.id) {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }
  }

  const invitations = await prisma.bookingInvitation.findMany({
    where: { sessionId: id },
    include: {
      member: { select: { name: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const STATUS_RANK: Record<string, number> = {
    PENDING: 0, ACCEPTED: 1, DECLINED: 2, EXPIRED: 3, CANCELLED: 4,
  };

  const sorted = [...invitations].sort(
    (a, b) =>
      (STATUS_RANK[a.status] ?? 5) - (STATUS_RANK[b.status] ?? 5) ||
      (a.member.name ?? "").localeCompare(b.member.name ?? "")
  );

  return Response.json(
    sorted.map((inv) => ({
      memberId: inv.memberId,
      memberName: inv.member.name,
      status: inv.status,
      invitedAt: inv.createdAt.toISOString(),
    }))
  );
}
