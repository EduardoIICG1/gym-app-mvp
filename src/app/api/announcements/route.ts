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

function sanitizeLinkUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  return url;
}

async function fetchAnnouncements(
  status: DbStatus,
  memberExpiryFilter: boolean,
  now: Date,
  limit: number
) {
  return prisma.announcement.findMany({
    where: {
      status,
      ...(memberExpiryFilter
        ? { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }
        : {}),
    },
    select: {
      id:          true,
      title:       true,
      content:     true,
      type:        true,
      authorId:    true,
      isPinned:    true,
      publishedAt: true,
      expiresAt:   true,
      linkUrl:      true,
      linkLabel:    true,
      coverImageKey: true,
      status:       true,
      author:       { select: { id: true, name: true } },
    },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: limit,
  });
}

type Row = Awaited<ReturnType<typeof fetchAnnouncements>>[number];

function toResponse(a: Row) {
  return {
    id:          a.id,
    ...(a.title     ? { title:     a.title }                                          : {}),
    content:     a.content,
    type:        TYPE_MAP[a.type],
    authorId:    a.authorId,
    authorName:  a.author.name ?? "",
    isPinned:    a.isPinned,
    publishedAt: a.publishedAt.toISOString(),
    ...(a.expiresAt ? { expiresAt: a.expiresAt.toISOString() }                        : {}),
    ...(a.linkUrl      ? { linkUrl: a.linkUrl, linkLabel: a.linkLabel ?? "Ver enlace" } : {}),
    ...(a.coverImageKey ? { coverImageKey: a.coverImageKey }                          : {}),
    status:      a.status.toLowerCase() as AnnouncementStatus,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const limit       = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
  const role        = session.user.role;

  const dbStatus: DbStatus =
    statusParam === "archived" && (role === "ADMIN" || role === "COACH")
      ? "ARCHIVED"
      : "PUBLISHED";

  const now = new Date();
  const rows = await fetchAnnouncements(dbStatus, role === "MEMBER", now, limit);

  return Response.json(rows.map(toResponse), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "No autenticado" }, { status: 401 });
    }
    const role = session.user.role;
    if (role === "MEMBER") {
      return Response.json({ error: "Sin permisos" }, { status: 403 });
    }

    const ALLOWED_COVERS = new Set(["training","mobility","community","nutrition","event","maintenance"]);

    const body = await request.json();
    const { title, content, type, isPinned, expiresAt, linkUrl, linkLabel, coverImageKey } = body;
    const cleanCoverKey = ALLOWED_COVERS.has(coverImageKey) ? (coverImageKey as string) : null;

    if (!content?.trim()) {
      return Response.json({ error: "content es requerido" }, { status: 400 });
    }

    const cleanLinkUrl = sanitizeLinkUrl(linkUrl);
    if (linkUrl?.trim() && !cleanLinkUrl) {
      return Response.json(
        { error: "linkUrl debe comenzar con http:// o https://" },
        { status: 400 }
      );
    }

    const created = await prisma.announcement.create({
      data: {
        title:      title?.trim() || null,
        content:    content.trim(),
        type:       TYPE_REVERSE[type] ?? "INFO",
        authorId:   session.user.id,
        isPinned:   role === "ADMIN" ? Boolean(isPinned) : false,
        expiresAt:  expiresAt ? new Date(expiresAt) : null,
        linkUrl:      cleanLinkUrl,
        linkLabel:    cleanLinkUrl ? (linkLabel?.trim() || "Ver enlace") : null,
        coverImageKey: cleanCoverKey,
        status:       "PUBLISHED",
      },
      include: { author: { select: { id: true, name: true } } },
    });

    return Response.json({
      id:          created.id,
      ...(created.title ? { title: created.title } : {}),
      content:     created.content,
      type:        TYPE_MAP[created.type],
      authorId:    created.authorId,
      authorName:  created.author.name ?? "",
      isPinned:    created.isPinned,
      publishedAt: created.publishedAt.toISOString(),
      ...(created.expiresAt ? { expiresAt: created.expiresAt.toISOString() } : {}),
      ...(created.linkUrl
        ? { linkUrl: created.linkUrl, linkLabel: created.linkLabel ?? "Ver enlace" }
        : {}),
      ...(created.coverImageKey ? { coverImageKey: created.coverImageKey } : {}),
      status: "published" as AnnouncementStatus,
    }, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
