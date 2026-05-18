"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Users, TrendingUp, BookOpen, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { OccupancyBadge } from "@/components/Badge";
import type { Announcement, AnnouncementType } from "@/lib/types";

interface HomeClass {
  id: string;
  name: string;
  coach: string;
  coachId: string;      // used to filter coach's own sessions
  sessionDate: string;  // "YYYY-MM-DD" — real instance date, not recurring dayOfWeek
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  reserved: number;
}

interface HomeReservation {
  id: string;
  className: string;
  classDate: string;
  startTime: string;
  status: string;
}

const TYPE_COLORS: Record<string, string> = {
  info:        "#4fc3f7",
  alert:       "#ef4444",
  event:       "#a78bfa",
  maintenance: "#f59e0b",
};

const TYPE_LABELS: Record<string, string> = {
  info:        "Info",
  alert:       "Alerta",
  event:       "Evento",
  maintenance: "Mantenimiento",
};

function currentWeekStart(): string {
  const today = new Date();
  const diff = (today.getDay() + 6) % 7; // days since Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function gymDayOfWeek(): number {
  const d = new Date().getDay(); // JS: 0=Sun…6=Sat
  return d === 0 ? -1 : d - 1;  // Mon=0…Sat=5, Sun=-1
}

function formatAnnDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function Home() {
  const activeUser = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [classes, setClasses] = useState<HomeClass[]>([]);
  const [reservations, setReservations] = useState<HomeReservation[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // ── Announcements state ──────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<AnnouncementType>("info");
  const [newPinned, setNewPinned] = useState(false);
  const [creating, setCreating] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Fetch this week's sessions once auth is ready
  useEffect(() => {
    if (activeUser.isLoading) return;
    (async () => {
      try {
        const res = await fetch(`/api/classes?weekStart=${currentWeekStart()}`);
        if (res.ok) setClasses(await res.json());
      } finally {
        setClassesLoading(false);
      }
    })();
  }, [activeUser.isLoading]);

  // Fetch member's reservations once user id is known
  useEffect(() => {
    if (activeUser.isLoading || !activeUser.id || activeUser.role !== "member") return;
    fetch(`/api/reservations?userId=${activeUser.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setReservations(data));
  }, [activeUser.id, activeUser.isLoading, activeUser.role]);

  // Fetch announcements once auth is ready
  useEffect(() => {
    if (activeUser.isLoading) return;
    (async () => {
      try {
        const res = await fetch("/api/announcements");
        if (res.ok) setAnnouncements(await res.json());
      } finally {
        setAnnouncementsLoading(false);
      }
    })();
  }, [activeUser.isLoading]);

  async function handleCreateAnnouncement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newContent.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/announcements", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          ...(newTitle.trim() ? { title: newTitle.trim() } : {}),
          content:  newContent.trim(),
          type:     newType,
          isPinned: newPinned,
        }),
      });
      if (res.ok) {
        const created: Announcement = await res.json();
        setAnnouncements(prev =>
          [created, ...prev].sort(
            (a, b) =>
              Number(b.isPinned) - Number(a.isPinned) ||
              new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          )
        );
        setNewContent("");
        setNewTitle("");
        setNewType("info");
        setNewPinned(false);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(id: string) {
    if (archivingId) return;
    setArchivingId(id);
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "archived" }),
      });
      if (res.ok) setAnnouncements(prev => prev.filter(a => a.id !== id));
    } finally {
      setArchivingId(null);
    }
  }

  function canArchive(ann: Announcement): boolean {
    if (activeUser.role === "admin") return true;
    if (activeUser.role === "coach") return ann.authorId === activeUser.id;
    return false;
  }

  const gymDow = gymDayOfWeek();
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── ADMIN / MEMBER: all gym classes today (by dayOfWeek for display)
  const todaysClasses = gymDow === -1 ? [] : classes.filter(c => c.dayOfWeek === gymDow);
  const upcomingClasses = gymDow === -1
    ? classes.slice(0, 3)
    : classes.filter(c => c.dayOfWeek > gymDow).slice(0, 3);

  // ── MEMBER: upcoming reservations
  const upcomingReservations = reservations
    .filter(r => r.classDate >= todayStr && r.status === "reserved")
    .slice(0, 4);

  // ── COACH: filter by real sessionDate (not dayOfWeek)
  const coachTodayClasses = classes.filter(
    c => c.coachId === activeUser.id && c.sessionDate === todayStr
  );
  const coachUpcomingClasses = classes
    .filter(c => c.coachId === activeUser.id && c.sessionDate > todayStr)
    .sort((a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime)
    )
    .slice(0, 5);

  // ── COACH KPIs (all safe against NaN)
  const coachReservedToday = coachTodayClasses.reduce((sum, c) => sum + c.reserved, 0);
  const coachWithCapacity = coachTodayClasses.filter(c => c.capacity > 0);
  const coachAvgOccupancy = coachWithCapacity.length > 0
    ? Math.round(
        coachWithCapacity.reduce((sum, c) => sum + (c.reserved / c.capacity) * 100, 0)
        / coachWithCapacity.length
      )
    : 0;
  const coachNextClass = coachTodayClasses[0] ?? coachUpcomingClasses[0] ?? null;

  // ── Announcements derived
  const pinnedAnnouncements = announcements.filter(a => a.isPinned);
  const canCreate = activeUser.role === "admin" || activeUser.role === "coach";
  const safeIdx = pinnedAnnouncements.length > 0
    ? Math.min(carouselIdx, pinnedAnnouncements.length - 1)
    : 0;
  const currentPinned = pinnedAnnouncements[safeIdx] ?? null;

  if (!mounted) return null;

  return (
    <div className="p-4 lg:p-6" style={{ paddingBottom: "5rem" }}>
      <div className="mx-auto" style={{ maxWidth: "1200px" }}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">

          {/* ── MAIN column: Novedades + Comunicados ─────────────── */}
          <div className="space-y-5">

            {/* Novedades destacadas */}
            {!announcementsLoading && pinnedAnnouncements.length > 0 && currentPinned && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5 border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                {/* Header: título + nav cuando hay más de 1 */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Novedades destacadas
                  </p>
                  {pinnedAnnouncements.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                        {safeIdx + 1} / {pinnedAnnouncements.length}
                      </span>
                      <button
                        onClick={() => setCarouselIdx(i => Math.max(0, i - 1))}
                        disabled={safeIdx === 0}
                        className="w-7 h-7 rounded-full text-base flex items-center justify-center border"
                        style={{
                          background:  safeIdx === 0 ? "transparent" : "#4fc3f720",
                          borderColor: "var(--card-border)",
                          color:       safeIdx === 0 ? "var(--text-secondary)" : "#4fc3f7",
                          opacity:     safeIdx === 0 ? 0.35 : 1,
                          cursor:      safeIdx === 0 ? "default" : "pointer",
                        }}
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setCarouselIdx(i => Math.min(pinnedAnnouncements.length - 1, i + 1))}
                        disabled={safeIdx === pinnedAnnouncements.length - 1}
                        className="w-7 h-7 rounded-full text-base flex items-center justify-center border"
                        style={{
                          background:  safeIdx === pinnedAnnouncements.length - 1 ? "transparent" : "#4fc3f720",
                          borderColor: "var(--card-border)",
                          color:       safeIdx === pinnedAnnouncements.length - 1 ? "var(--text-secondary)" : "#4fc3f7",
                          opacity:     safeIdx === pinnedAnnouncements.length - 1 ? 0.35 : 1,
                          cursor:      safeIdx === pinnedAnnouncements.length - 1 ? "default" : "pointer",
                        }}
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>

                {/* Card activa */}
                <div
                  className="p-4 rounded-xl border"
                  style={{
                    background:  "var(--background)",
                    borderColor: TYPE_COLORS[currentPinned.type] + "50",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: TYPE_COLORS[currentPinned.type] + "20",
                        color:      TYPE_COLORS[currentPinned.type],
                      }}
                    >
                      {TYPE_LABELS[currentPinned.type]}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
                      📌
                    </span>
                  </div>
                  {currentPinned.title && (
                    <p className="text-sm font-bold mb-1 leading-snug" style={{ color: "var(--text-primary)" }}>
                      {currentPinned.title}
                    </p>
                  )}
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {currentPinned.content}
                  </p>
                  {currentPinned.linkUrl && (
                    <a
                      href={currentPinned.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-sm font-semibold px-3 py-1.5 rounded-lg"
                      style={{
                        background: TYPE_COLORS[currentPinned.type] + "30",
                        color:      TYPE_COLORS[currentPinned.type],
                        border:     `1px solid ${TYPE_COLORS[currentPinned.type]}60`,
                      }}
                    >
                      {currentPinned.linkLabel ?? "Ver enlace"} →
                    </a>
                  )}
                  <p className="text-xs mt-2" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
                    {formatAnnDate(currentPinned.publishedAt)} · {currentPinned.authorName}
                  </p>
                </div>

                {/* Dots de navegación — solo cuando hay más de 1 */}
                {pinnedAnnouncements.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {pinnedAnnouncements.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCarouselIdx(i)}
                        className="h-1.5 rounded-full"
                        style={{
                          width:      i === safeIdx ? "20px" : "6px",
                          background: i === safeIdx ? "#4fc3f7" : "var(--card-border)",
                          transition: "width 0.2s ease, background 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Comunicados feed */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-2xl p-6 border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                Comunicados
              </h3>

              {/* Create form — ADMIN / COACH only */}
              {canCreate && (
                <form onSubmit={handleCreateAnnouncement} className="mb-5 space-y-2">
                  <input
                    type="text"
                    placeholder="Título (opcional)"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-xl border outline-none"
                    style={{
                      background:  "var(--background)",
                      borderColor: "var(--card-border)",
                      color:       "var(--text-primary)",
                    }}
                  />
                  <textarea
                    placeholder="Escribe un comunicado..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    rows={3}
                    className="w-full text-sm px-3 py-2 rounded-xl border outline-none resize-none"
                    style={{
                      background:  "var(--background)",
                      borderColor: "var(--card-border)",
                      color:       "var(--text-primary)",
                    }}
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["info", "alert", "event", "maintenance"] as AnnouncementType[]).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewType(t)}
                        className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{
                          background:  newType === t ? TYPE_COLORS[t] + "30" : "var(--background)",
                          color:       newType === t ? TYPE_COLORS[t] : "var(--text-secondary)",
                          border:      `1px solid ${newType === t ? TYPE_COLORS[t] + "60" : "var(--card-border)"}`,
                        }}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                    {activeUser.role === "admin" && (
                      <label
                        className="flex items-center gap-1.5 text-xs cursor-pointer ml-auto"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <input
                          type="checkbox"
                          checked={newPinned}
                          onChange={e => setNewPinned(e.target.checked)}
                          className="w-3.5 h-3.5"
                        />
                        Pinear
                      </label>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!newContent.trim() || creating}
                    className="w-full text-sm font-semibold py-2 rounded-xl"
                    style={{
                      background: newContent.trim() ? "#4fc3f7" : "#4fc3f720",
                      color:      newContent.trim() ? "#0a0a0a" : "var(--text-secondary)",
                      cursor:     newContent.trim() ? "pointer" : "not-allowed",
                    }}
                  >
                    {creating ? "Publicando..." : "Publicar comunicado"}
                  </button>
                </form>
              )}

              {announcementsLoading ? (
                <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                  Cargando...
                </p>
              ) : announcements.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                  No hay comunicados publicados
                </p>
              ) : (
                <div className="space-y-3">
                  {announcements.map(ann => (
                    <div
                      key={ann.id}
                      className="p-4 rounded-xl border"
                      style={{
                        background:  "var(--background)",
                        borderColor: ann.isPinned
                          ? TYPE_COLORS[ann.type] + "40"
                          : "var(--card-border)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded"
                            style={{
                              background: TYPE_COLORS[ann.type] + "20",
                              color:      TYPE_COLORS[ann.type],
                            }}
                          >
                            {TYPE_LABELS[ann.type]}
                          </span>
                          {ann.isPinned && (
                            <span className="text-xs" style={{ color: "var(--text-secondary)", opacity: 0.55 }}>
                              📌
                            </span>
                          )}
                        </div>
                        {canArchive(ann) && (
                          <button
                            onClick={() => handleArchive(ann.id)}
                            disabled={archivingId === ann.id}
                            className="text-xs shrink-0 px-2 py-0.5 rounded hover:opacity-100"
                            style={{
                              color:   "var(--text-secondary)",
                              opacity: archivingId === ann.id ? 0.3 : 0.55,
                            }}
                          >
                            Archivar
                          </button>
                        )}
                      </div>
                      {ann.title && (
                        <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                          {ann.title}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {ann.content}
                      </p>
                      {ann.linkUrl && (
                        <a
                          href={ann.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-3 text-sm font-semibold px-3 py-1.5 rounded-lg"
                          style={{
                            background: TYPE_COLORS[ann.type] + "30",
                            color:      TYPE_COLORS[ann.type],
                            border:     `1px solid ${TYPE_COLORS[ann.type]}60`,
                          }}
                        >
                          {ann.linkLabel ?? "Ver enlace"} →
                        </a>
                      )}
                      <p className="text-xs mt-2" style={{ color: "var(--text-secondary)", opacity: 0.5 }}>
                        {formatAnnDate(ann.publishedAt)} · {ann.authorName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

          </div>{/* end main column */}

          {/* ── ASIDE column: paneles operativos ─────────────────── */}
          <div className="space-y-5">

            {/* ADMIN / MEMBER: Clases de hoy */}
            {activeUser.role !== "coach" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl p-6 border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    Clases de hoy
                  </h3>
                  <a href="/calendar" className="text-xs hover:underline" style={{ color: "#4fc3f7" }}>
                    Ver todas →
                  </a>
                </div>

                {classesLoading ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>Cargando...</p>
                ) : gymDow === -1 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                    El gimnasio descansa los domingos 🌿
                  </p>
                ) : todaysClasses.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                    No hay clases programadas para hoy
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todaysClasses.slice(0, 4).map(cls => {
                      const pct = cls.capacity > 0 ? (cls.reserved / cls.capacity) * 100 : 0;
                      const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
                      return (
                        <div
                          key={cls.id}
                          className="p-3 rounded-xl border"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                {cls.startTime} — {cls.coach}
                              </p>
                            </div>
                            <OccupancyBadge reserved={cls.reserved} capacity={cls.capacity} />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: barColor }}
                              />
                            </div>
                            <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                              {cls.reserved}/{cls.capacity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Próximamente */}
                {!classesLoading && upcomingClasses.length > 0 && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                      Próximamente
                    </p>
                    <div className="space-y-2">
                      {upcomingClasses.map(cls => (
                        <div key={cls.id} className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "#4fc3f720", color: "#4fc3f7" }}
                          >
                            {cls.coach.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cls.startTime}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* MEMBER: Mis próximas reservas */}
            {activeUser.role === "member" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl p-6 border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                  Mis próximas reservas
                </h3>
                {upcomingReservations.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                    Sin próximas reservas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {upcomingReservations.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      >
                        <div>
                          <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.className}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.classDate} · {r.startTime}</p>
                        </div>
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ background: "#22c55e20", color: "#22c55e" }}
                        >
                          Reservado
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ADMIN: Resumen operativo */}
            {activeUser.role === "admin" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl p-6 border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                  Resumen operativo
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const reservedToday = todaysClasses.reduce((sum, c) => sum + c.reserved, 0);
                    const withCapacity = classes.filter(c => c.capacity > 0);
                    const avgOccupancy = withCapacity.length > 0
                      ? Math.round(
                          withCapacity.reduce((sum, c) => sum + (c.reserved / c.capacity) * 100, 0)
                          / withCapacity.length
                        )
                      : 0;
                    return [
                      { label: "Clases activas",    value: classes.length,     icon: BookOpen,   color: "#4fc3f7" },
                      { label: "Ocupación promedio", value: `${avgOccupancy}%`, icon: TrendingUp, color: "#22c55e" },
                      { label: "Reservas hoy",       value: reservedToday,      icon: Users,      color: "#f59e0b" },
                    ];
                  })().map(item => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `${item.color}20` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: item.color }} />
                          </div>
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                        </div>
                        <span className="font-bold text-sm" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* COACH: Mis clases de hoy + Próximas */}
            {activeUser.role === "coach" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl p-6 border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    Mis clases de hoy
                  </h3>
                  <a href="/calendar" className="text-xs hover:underline" style={{ color: "#4fc3f7" }}>
                    Ver calendario →
                  </a>
                </div>

                {classesLoading ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>Cargando...</p>
                ) : coachTodayClasses.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                    No tienes clases hoy
                  </p>
                ) : (
                  <div className="space-y-3">
                    {coachTodayClasses.map(cls => {
                      const pct = cls.capacity > 0 ? (cls.reserved / cls.capacity) * 100 : 0;
                      const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
                      return (
                        <div
                          key={cls.id}
                          className="p-3 rounded-xl border"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                {cls.startTime} – {cls.endTime}
                              </p>
                            </div>
                            <OccupancyBadge reserved={cls.reserved} capacity={cls.capacity} />
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: barColor }}
                              />
                            </div>
                            <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                              {cls.reserved}/{cls.capacity}
                            </span>
                          </div>
                          <div className="mt-2 text-right">
                            <Link
                              href={`/classes/${cls.id}?from=classes`}
                              className="text-xs hover:underline font-medium"
                              style={{ color: "#4fc3f7" }}
                            >
                              Ver detalle →
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!classesLoading && coachUpcomingClasses.length > 0 && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                      Próximas clases
                    </p>
                    <div className="space-y-2">
                      {coachUpcomingClasses.map(cls => (
                        <div
                          key={cls.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        >
                          <div>
                            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {cls.sessionDate} · {cls.startTime}
                            </p>
                          </div>
                          <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                            {cls.reserved}/{cls.capacity}
                          </span>
                          <Link
                            href={`/classes/${cls.id}?from=classes`}
                            className="text-xs hover:underline font-medium shrink-0"
                            style={{ color: "#4fc3f7" }}
                          >
                            Ver →
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* COACH: Resumen de hoy */}
            {activeUser.role === "coach" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl p-6 border"
                style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
              >
                <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                  Resumen de hoy
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Clases hoy",      value: coachTodayClasses.length,         icon: BookOpen,   color: "#4fc3f7" },
                    { label: "Inscritos hoy",   value: coachReservedToday,               icon: Users,      color: "#22c55e" },
                    { label: "Ocupación media", value: `${coachAvgOccupancy}%`,          icon: TrendingUp, color: "#f59e0b" },
                    { label: "Próxima clase",   value: coachNextClass?.startTime ?? "—", icon: Clock,      color: "#a78bfa" },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: `${item.color}20` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: item.color }} />
                          </div>
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                        </div>
                        <span className="font-bold text-sm" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

          </div>{/* end aside column */}

        </div>
      </div>
    </div>
  );
}
