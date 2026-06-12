import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Acorta una serie recurrente cancelando las sesiones futuras posteriores a una
// nueva fecha de término. No toca sesiones pasadas, ya canceladas, ni sesiones
// con reservas activas (esas quedan "skipped" para revisión manual).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = authSession.user.role;
    if (role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const endDateStr: string | undefined = body.endDate;
    const confirm = body.confirm === true;

    if (!endDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(endDateStr)) {
      return Response.json({ error: "Fecha de término inválida" }, { status: 400 });
    }

    const existing = await prisma.session.findUnique({
      where: { id },
      include: { program: true },
    });
    if (!existing) return Response.json({ error: "Clase no encontrada" }, { status: 404 });

    if ((role === "COACH" || role === "KINESIOLOGIST") && existing.coachId !== authSession.user.id) {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Sesiones del día seleccionado se conservan; solo se afectan las posteriores.
    const cutoff = new Date(`${endDateStr}T23:59:59.999`);
    const now = new Date();
    if (cutoff < now) {
      return Response.json({ error: "La fecha de término no puede estar en el pasado" }, { status: 400 });
    }

    const candidates = await prisma.session.findMany({
      where: {
        programId: existing.programId,
        startsAt: { gt: cutoff },
        status: { not: "CANCELLED" },
      },
      include: {
        _count: {
          select: { bookings: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } } },
        },
      },
      orderBy: { startsAt: "asc" },
    });

    const toCancel = candidates.filter((s) => s._count.bookings === 0);
    const skipped = candidates.filter((s) => s._count.bookings > 0);

    if (confirm && toCancel.length > 0) {
      await prisma.session.updateMany({
        where: { id: { in: toCancel.map((s) => s.id) } },
        data: { status: "CANCELLED" },
      });
    }

    return Response.json({
      applied: confirm,
      programId: existing.programId,
      programName: existing.program.name,
      newEndDate: endDateStr,
      affectedCount: toCancel.length,
      skippedCount: skipped.length,
      affected: toCancel.map((s) => ({ id: s.id, sessionDate: s.startsAt.toISOString().slice(0, 10) })),
      skipped: skipped.map((s) => ({
        id: s.id,
        sessionDate: s.startsAt.toISOString().slice(0, 10),
        reason: "Tiene reservas activas",
      })),
    });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
