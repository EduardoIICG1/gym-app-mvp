"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  currentUser,
  mockClasses,
  mockReservations,
  mockPosts as seedPosts,
  mockQuickLinks,
} from "@/lib/mock-data";
import type { Post } from "@/lib/types";

// ─── Constants ─────────────────────────────────────────────────────────────
const IS_ADMIN_OR_COACH =
  currentUser.role === "admin" || currentUser.role === "coach";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  member: "Miembro",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-400",
  coach: "bg-orange-500/15 text-orange-400",
  member: "bg-blue-500/15 text-blue-400",
};

const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const SIDEBAR_NAV = [
  { href: "/", label: "Inicio", exact: true, roles: ["admin", "coach", "member"] },
  { href: "/calendar", label: "Calendario", exact: false, roles: ["admin", "coach", "member"] },
  { href: "/admin/classes", label: "Clases", exact: false, roles: ["admin", "coach"] },
  { href: "/admin/members", label: "Miembros", exact: false, roles: ["admin", "coach"] },
  { href: "/admin/memberships", label: "Membresías", exact: false, roles: ["admin"] },
  { href: "/profile", label: "Mi Perfil", exact: false, roles: ["admin", "coach", "member"] },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function occupancyColor(reserved: number, max: number): string {
  const pct = reserved / max;
  if (pct >= 1) return "bg-red-500";
  if (pct >= 0.7) return "bg-yellow-500";
  return "bg-blue-500";
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  const pathname = usePathname();

  // ── Feed state ──────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [newContent, setNewContent] = useState("");

  // ── Right panel — role-based classes ────────────────────────────────────
  const jsDay = new Date().getDay(); // 0=Sun
  const gymDay = jsDay === 0 ? -1 : jsDay - 1; // gym day 0=Mon…5=Sat, -1=closed

  // Active classes from today onwards this week (today + remaining days)
  const activeClasses = mockClasses.filter((c) => c.status === "active");

  // For admin: all active classes from today onwards, sorted by day then time
  const adminClasses =
    gymDay >= 0
      ? activeClasses
          .filter((c) => c.dayOfWeek >= gymDay)
          .sort(
            (a, b) =>
              a.dayOfWeek - b.dayOfWeek ||
              a.startTime.localeCompare(b.startTime)
          )
      : [];

  // For coach: same but filtered to their name
  const coachClasses =
    gymDay >= 0
      ? activeClasses
          .filter(
            (c) => c.dayOfWeek >= gymDay && c.coach === currentUser.name
          )
          .sort(
            (a, b) =>
              a.dayOfWeek - b.dayOfWeek ||
              a.startTime.localeCompare(b.startTime)
          )
      : [];

  // For member: their reservations joined with classes, upcoming from today
  const memberReservations = mockReservations
    .filter(
      (r) =>
        r.studentId === currentUser.id &&
        r.status !== "cancelled" &&
        r.classDate >= new Date().toISOString().slice(0, 10)
    )
    .sort((a, b) => a.classDate.localeCompare(b.classDate) || a.classId.localeCompare(b.classId));

  const todayLabel = gymDay >= 0 ? DAY_NAMES[gymDay] : "Domingo";

  // Admin summary stats
  const totalActive = activeClasses.length;
  const todayClasses = gymDay >= 0 ? activeClasses.filter((c) => c.dayOfWeek === gymDay) : [];
  const avgOccupancy =
    totalActive > 0
      ? Math.round(
          (activeClasses.reduce(
            (acc, c) => acc + c.reservedCount / c.maxCapacity,
            0
          ) /
            totalActive) *
            100
        )
      : 0;

  // ── Handlers ────────────────────────────────────────────────────────────
  function toggleLike(postId: string) {
    const wasLiked = likedIds.has(postId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      wasLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likesCount: p.likesCount + (wasLiked ? -1 : 1) }
          : p
      )
    );
  }

  function toggleExpanded(postId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  function submitComment(postId: string) {
    const text = (commentInputs[postId] ?? "").trim();
    if (!text) return;
    const comment = {
      id: `c-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: "admin" as const,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, comment] } : p
      )
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    setExpanded((prev) => new Set([...prev, postId]));
  }

  function publishPost() {
    const text = newContent.trim();
    if (!text) return;
    const post: Post = {
      id: `post-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role as "admin" | "coach" | "member",
      createdAt: new Date().toISOString(),
      content: text,
      likesCount: 0,
      comments: [],
    };
    setPosts((prev) => [post, ...prev]);
    setNewContent("");
  }

  const visibleNav = SIDEBAR_NAV.filter((l) =>
    l.roles.includes(currentUser.role)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_320px] gap-6 items-start">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20">

          {/* Navigation */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">
              Navegación
            </p>
            <nav className="flex flex-col gap-0.5">
              {visibleNav.map(({ href, label, exact }) => {
                const active = exact
                  ? pathname === href
                  : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick links */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wider px-2 mb-2">
              Accesos rápidos
            </p>
            <div className="flex flex-col gap-0.5">
              {mockQuickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                >
                  <span className="text-zinc-600 text-[10px]">→</span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

        </aside>

        {/* ── CENTER FEED ───────────────────────────────────────────────── */}
        <main className="flex flex-col gap-4 min-w-0">

          {/* Create Post — admin / coach only */}
          {IS_ADMIN_OR_COACH && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                  {initials(currentUser.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="¿Qué quieres compartir con la comunidad?"
                    rows={3}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1">
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                        📷 Imagen
                      </button>
                      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
                        🔗 Link
                      </button>
                    </div>
                    <button
                      onClick={publishPost}
                      disabled={!newContent.trim()}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Publicar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Posts */}
          {posts.map((post) => {
            const isLiked = likedIds.has(post.id);
            const showComments = expanded.has(post.id);
            return (
              <article
                key={post.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                    {initials(post.authorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-semibold">
                        {post.authorName}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          ROLE_COLORS[post.authorRole] ??
                          "bg-zinc-700 text-zinc-400"
                        }`}
                      >
                        {ROLE_LABELS[post.authorRole] ?? post.authorRole}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {timeAgo(post.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-zinc-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Actions */}
                <div className="border-t border-zinc-800 pt-3 flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-all select-none ${
                      isLiked
                        ? "text-red-400 scale-105"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {isLiked ? "❤️" : "🤍"} {post.likesCount}
                  </button>
                  <button
                    onClick={() => toggleExpanded(post.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors select-none ${
                      showComments
                        ? "text-blue-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    💬 {post.comments.length}
                  </button>
                </div>

                {/* Comments */}
                {showComments && (
                  <div className="mt-4 space-y-3">
                    {post.comments.length > 0 && (
                      <div className="space-y-2">
                        {post.comments.map((c) => (
                          <div key={c.id} className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-white font-semibold text-[10px] shrink-0 mt-0.5">
                              {initials(c.authorName)}
                            </div>
                            <div className="flex-1 bg-zinc-800/60 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-white text-xs font-semibold">
                                  {c.authorName}
                                </span>
                                <span className="text-zinc-600 text-[10px]">
                                  {timeAgo(c.createdAt)}
                                </span>
                              </div>
                              <p className="text-zinc-300 text-xs">
                                {c.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New comment */}
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-[10px] shrink-0 mt-0.5">
                        {initials(currentUser.name)}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={commentInputs[post.id] ?? ""}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && submitComment(post.id)
                          }
                          placeholder="Escribe un comentario..."
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          disabled={!(commentInputs[post.id] ?? "").trim()}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-xs font-medium rounded-lg transition-colors border border-zinc-700"
                        >
                          ↩
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </main>

        {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-20">

          {/* ── ADMIN: all classes from today + operational summary ── */}
          {currentUser.role === "admin" && (
            <>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-zinc-500 text-xs font-medium">Clases esta semana</p>
                  <span className="text-zinc-600 text-xs">{todayLabel}</span>
                </div>
                {gymDay < 0 ? (
                  <p className="text-zinc-600 text-sm">El gimnasio no tiene clases los domingos.</p>
                ) : adminClasses.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Sin clases para el resto de la semana.</p>
                ) : (
                  <div className="space-y-3">
                    {adminClasses.map((cls) => {
                      const pct = Math.round((cls.reservedCount / cls.maxCapacity) * 100);
                      return (
                        <div key={cls.id} className="pb-3 border-b border-zinc-800 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between mb-1">
                            <div>
                              <p className="text-white text-sm font-medium leading-tight">{cls.name}</p>
                              <p className="text-zinc-600 text-[10px] mt-0.5">{DAY_NAMES[cls.dayOfWeek]}</p>
                            </div>
                            <span className="text-zinc-500 text-xs shrink-0 ml-2">{cls.startTime}</span>
                          </div>
                          <p className="text-zinc-500 text-xs mb-1.5">{cls.coach}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${occupancyColor(cls.reservedCount, cls.maxCapacity)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-zinc-600 text-[10px] shrink-0">{cls.reservedCount}/{cls.maxCapacity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link
                  href="/calendar"
                  className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white font-medium transition-colors"
                >
                  Ver calendario →
                </Link>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                <p className="text-zinc-500 text-xs font-medium mb-3">Resumen operativo</p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-xs">Clases activas</span>
                    <span className="text-white font-semibold text-xs">{totalActive}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-xs">Clases hoy</span>
                    <span className="text-white font-semibold text-xs">{todayClasses.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-xs">Ocupación media</span>
                    <span className="text-white font-semibold text-xs">{avgOccupancy}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  {[
                    { href: "/admin/classes", label: "Gestión de clases" },
                    { href: "/admin/members", label: "Lista de miembros" },
                    { href: "/admin/memberships", label: "Membresías" },
                  ].map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg px-2.5 py-1.5 transition-colors"
                    >
                      → {label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── COACH: own classes from today ── */}
          {currentUser.role === "coach" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-zinc-500 text-xs font-medium">Mis clases</p>
                <span className="text-zinc-600 text-xs">{todayLabel}</span>
              </div>
              {gymDay < 0 ? (
                <p className="text-zinc-600 text-sm">El gimnasio no tiene clases los domingos.</p>
              ) : coachClasses.length === 0 ? (
                <p className="text-zinc-600 text-sm">Sin clases asignadas para el resto de la semana.</p>
              ) : (
                <div className="space-y-3">
                  {coachClasses.map((cls) => {
                    const pct = Math.round((cls.reservedCount / cls.maxCapacity) * 100);
                    return (
                      <div key={cls.id} className="pb-3 border-b border-zinc-800 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <p className="text-white text-sm font-medium leading-tight">{cls.name}</p>
                            <p className="text-zinc-600 text-[10px] mt-0.5">{DAY_NAMES[cls.dayOfWeek]}</p>
                          </div>
                          <span className="text-zinc-500 text-xs shrink-0 ml-2">{cls.startTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${occupancyColor(cls.reservedCount, cls.maxCapacity)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-zinc-600 text-[10px] shrink-0">{cls.reservedCount}/{cls.maxCapacity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link
                href="/calendar"
                className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white font-medium transition-colors"
              >
                Ver calendario →
              </Link>
            </div>
          )}

          {/* ── MEMBER/STUDENT: own reservations ── */}
          {currentUser.role === "student" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <p className="text-zinc-500 text-xs font-medium mb-3">Mis próximas reservas</p>
              {memberReservations.length === 0 ? (
                <p className="text-zinc-600 text-sm">No tienes clases reservadas próximamente.</p>
              ) : (
                <div className="space-y-3">
                  {memberReservations.map((r) => {
                    const cls = mockClasses.find((c) => c.id === r.classId);
                    if (!cls) return null;
                    return (
                      <div key={r.id} className="pb-3 border-b border-zinc-800 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-white text-sm font-medium leading-tight">{cls.name}</p>
                          <span className="text-zinc-500 text-xs shrink-0 ml-2">{cls.startTime}</span>
                        </div>
                        <p className="text-zinc-500 text-xs mb-0.5">{cls.coach}</p>
                        <p className="text-zinc-600 text-[10px]">{r.classDate}</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link
                href="/calendar"
                className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs text-zinc-300 hover:text-white font-medium transition-colors"
              >
                Ver calendario →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
