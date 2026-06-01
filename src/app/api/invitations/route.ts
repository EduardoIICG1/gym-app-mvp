import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { InvitationStatus } from "@prisma/client";

const SVC_MAP: Record<string, string> = {
  GROUP:             "group",
  PERSONAL_TRAINING: "personal_training",
  KINESIOLOGY:       "kinesiology",
  OTHER:             "blocked_time",
};

const VALID_STATUSES = new Set<InvitationStatus>([
  "PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED",
]);

// GET /api/invitations?status=pending
// MEMBER: returns own invitations, optionally filtered by status.
export async function GET(request: Request) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status")?.toUpperCase() as InvitationStatus | null;

    const statusFilter =
      statusParam && VALID_STATUSES.has(statusParam) ? statusParam : undefined;

    const invitations = await prisma.bookingInvitation.findMany({
      where: {
        memberId: authSession.user.id,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        session: {
          include: {
            program: { select: { name: true, serviceType: true, maxCapacity: true, durationMin: true, startTime: true } },
            coach: { select: { id: true, name: true } },
            _count: {
              select: {
                bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = invitations.map((inv) => {
      const s = inv.session;
      const capacity = s.program.maxCapacity ?? 0;
      const occupied = s._count.bookings;

      // Prefer program.startTime to avoid UTC offset issues (same pattern as /api/classes)
      const startTime = s.program.startTime
        ?? `${String(s.startsAt.getHours()).padStart(2, "0")}:${String(s.startsAt.getMinutes()).padStart(2, "0")}`;
      const durationMin = s.program.durationMin ?? 60;
      const [sh, sm] = startTime.split(":").map(Number);
      const total = sh * 60 + sm + durationMin;
      const endTime = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

      return {
        id: inv.id,
        status: inv.status.toLowerCase(),
        message: inv.message ?? null,
        expiresAt: inv.expiresAt?.toISOString() ?? null,
        bookingId: inv.bookingId ?? null,
        session: {
          id: s.id,
          programName: s.program.name,
          serviceType: SVC_MAP[s.program.serviceType] ?? "group",
          startsAt: s.startsAt.toISOString(),
          sessionDate: s.startsAt.toISOString().slice(0, 10),
          startTime,
          endTime,
          coachName: s.coach.name ?? "",
          capacity,
          spotsLeft: capacity > 0 ? Math.max(0, capacity - occupied) : null,
          status: s.status === "CANCELLED" ? "cancelled" : "active",
        },
      };
    });

    return Response.json(items);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
