import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementType, AnnouncementStatus } from "@/lib/types";
import type {
  AnnouncementType as DbType,
  AnnouncementStatus as DbStatus,
} from "@prisma/client";

const TYPE_MAP: Record<DbType, AnnouncementType> = {
  INFO:        "info",
  ALERT:       "alert",
  EVENT:       "event",
  MAINTENANCE: "maintenance",
};

const TYPE_REVERSE: Record<string, DbType> = {
  info:        "INFO",
  alert:       "ALERT",
  event:       "EVENT",
  maintenance: "MAINTENANCE",
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = session.user.role;
    if (role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Comunicado no encontrado" }, { status: 404 });
    }
    if (role === "COACH" && existing.authorId !== session.user.id) {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();

    // Validate linkUrl if being updated
    let cleanLinkUrl: string | null | undefined;
    if (body.linkUrl !== undefined) {
      if (body.linkUrl?.trim()) {
        const url = body.linkUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          return Response.json(
            { error: "linkUrl debe comenzar con http:// o https://" },
            { status: 400 }
          );
        }
        cleanLinkUrl = url;
      } else {
        cleanLinkUrl = null; // explicit clear
      }
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(body.title     !== undefined ? { title:     body.title?.trim() || null }               : {}),
        ...(body.content   !== undefined ? { content:   body.content.trim() }                      : {}),
        ...(body.type      !== undefined ? { type:      TYPE_REVERSE[body.type] ?? existing.type } : {}),
        ...(body.status    !== undefined ? { status:    body.status.toUpperCase() as DbStatus }    : {}),
        ...(body.expiresAt !== undefined
          ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
          : {}),
        ...(role === "ADMIN" && body.isPinned !== undefined
          ? { isPinned: Boolean(body.isPinned) }
          : {}),
        ...(cleanLinkUrl !== undefined
          ? {
              linkUrl:  cleanLinkUrl,
              linkLabel: cleanLinkUrl
                ? (body.linkLabel?.trim() || existing.linkLabel || "Ver enlace")
                : null,
            }
          : body.linkLabel !== undefined
            ? { linkLabel: body.linkLabel?.trim() || existing.linkLabel || "Ver enlace" }
            : {}),
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return Response.json({
      id:          updated.id,
      ...(updated.title    ? { title:     updated.title }                                          : {}),
      content:     updated.content,
      type:        TYPE_MAP[updated.type],
      authorId:    updated.authorId,
      authorName:  updated.author.name ?? "",
      isPinned:    updated.isPinned,
      publishedAt: updated.publishedAt.toISOString(),
      ...(updated.expiresAt ? { expiresAt: updated.expiresAt.toISOString() }                      : {}),
      ...(updated.linkUrl   ? { linkUrl: updated.linkUrl, linkLabel: updated.linkLabel ?? "Ver enlace" } : {}),
      status:      updated.status.toLowerCase() as AnnouncementStatus,
    });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
