"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import type { Announcement } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  info:        "#4fc3f7",
  alert:       "#ef4444",
  event:       "#a78bfa",
  maintenance: "#f59e0b",
};

const COVER_GRADIENTS: Record<string, string> = {
  training:    "135deg, #0f2944 0%, #0ea5e9 100%",
  mobility:    "135deg, #052e1a 0%, #10b981 100%",
  community:   "135deg, #1e1060 0%, #7c3aed 100%",
  nutrition:   "135deg, #431407 0%, #f59e0b 100%",
  event:       "135deg, #2d0a4e 0%, #c026d3 100%",
  maintenance: "135deg, #1c1917 0%, #57534e 100%",
};

const DEFAULT_COVER: Record<string, string> = {
  info: "community", alert: "maintenance", event: "event", maintenance: "maintenance",
};

const TYPE_LABELS: Record<string, string> = {
  info:        "Info",
  alert:       "Alerta",
  event:       "Evento",
  maintenance: "Mantenimiento",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const activeUser = useCurrentUser();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (activeUser.isLoading) return;
    (async () => {
      try {
        const res = await fetch(`/api/announcements/${id}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) setAnnouncement(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [id, activeUser.isLoading]);

  return (
    <div className="p-4 lg:p-6" style={{ paddingBottom: "5rem" }}>
      <div className="mx-auto" style={{ maxWidth: "680px" }}>

        <Link
          href="/"
          className="inline-block mb-5 text-sm font-medium hover:underline"
          style={{ color: "#4fc3f7" }}
        >
          ← Volver al inicio
        </Link>

        {(loading || activeUser.isLoading) ? (
          <div
            className="rounded-2xl p-8 border text-center"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Cargando...</p>
          </div>
        ) : notFound ? (
          <div
            className="rounded-2xl p-8 border text-center space-y-3"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Este comunicado no está disponible.
            </p>
            <Link
              href="/"
              className="inline-block text-sm font-medium hover:underline"
              style={{ color: "#4fc3f7" }}
            >
              ← Volver al inicio
            </Link>
          </div>
        ) : announcement ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border overflow-hidden"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            {/* Cover banner */}
            {(() => {
              const coverKey = announcement.coverImageKey ?? DEFAULT_COVER[announcement.type] ?? "community";
              const gradient = COVER_GRADIENTS[coverKey] ?? COVER_GRADIENTS.community;
              return (
                <div
                  className="relative flex items-end px-6 pt-8 pb-5"
                  style={{ background: `linear-gradient(${gradient})`, minHeight: "140px" }}
                >
                  <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)" }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ background: "rgba(255,255,255,0.18)", color: "#ffffff" }}
                      >
                        {TYPE_LABELS[announcement.type]}
                      </span>
                      {announcement.isPinned && (
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
                          📌 Destacado
                        </span>
                      )}
                    </div>
                    {announcement.title && (
                      <h1 className="text-xl font-bold leading-snug" style={{ color: "#ffffff" }}>
                        {announcement.title}
                      </h1>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Body */}
            <div className="p-6">
            {/* Título ya se muestra en el banner — espacio vacío si no hay título */}

            {/* Contenido completo — whitespace-pre-wrap respeta saltos de línea */}
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: "var(--text-secondary)" }}
            >
              {announcement.content}
            </p>

            {/* CTA link externo */}
            {announcement.linkUrl && (
              <a
                href={announcement.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-sm font-semibold px-4 py-2 rounded-lg"
                style={{
                  background: TYPE_COLORS[announcement.type] + "30",
                  color:      TYPE_COLORS[announcement.type],
                  border:     `1px solid ${TYPE_COLORS[announcement.type]}60`,
                }}
              >
                {announcement.linkLabel ?? "Ver enlace"} →
              </a>
            )}

            {/* Footer: autor + fecha */}
            <div
              className="mt-6 pt-4 text-xs"
              style={{ borderTop: "1px solid var(--card-border)", color: "var(--text-muted)" }}
            >
              {announcement.authorName} · {formatDate(announcement.publishedAt)}
            </div>
            </div>{/* end body */}
          </motion.div>
        ) : null}

      </div>
    </div>
  );
}
