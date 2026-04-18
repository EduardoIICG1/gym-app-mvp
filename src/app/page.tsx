"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart, MessageCircle, Image as ImageIcon, Link as LinkIcon,
  Users, TrendingUp, BookOpen,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { mockPosts as seedPosts, mockClasses, mockReservations } from "@/lib/mock-data";
import { OccupancyBadge, RoleBadge } from "@/components/Badge";
import type { Post } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function Home() {
  const activeUser = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<Post[]>(seedPosts);
  const [postContent, setPostContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  useEffect(() => { setMounted(true); }, []);

  const canPost = activeUser.role === "admin" || activeUser.role === "coach";

  // Today's classes by day-of-week
  const todayDow = new Date().getDay(); // 0=Sun
  const gymDow = todayDow === 0 ? 6 : todayDow - 1; // Mon=0
  const todaysClasses = mockClasses
    .filter(c => c.dayOfWeek === gymDow && c.status === "active")
    .slice(0, 4);
  const upcomingClasses = mockClasses
    .filter(c => c.dayOfWeek > gymDow && c.status === "active")
    .slice(0, 3);

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingReservations = mockReservations
    .filter(r => r.studentId === activeUser.id && r.classDate >= todayStr && r.status === "reserved")
    .slice(0, 4);

  function handleLike(postId: string) {
    const wasLiked = likedPosts.has(postId);
    setLikedPosts(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, likesCount: p.likesCount + (wasLiked ? -1 : 1) } : p
    ));
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  }

  function addComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? {
            ...p, comments: [...p.comments, {
              id: Date.now().toString(),
              authorId: activeUser.id,
              authorName: activeUser.name,
              authorRole: activeUser.role as "admin" | "coach" | "member",
              content: text,
              createdAt: new Date().toISOString(),
            }]
          }
        : p
    ));
    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
  }

  if (!mounted) return null;

  return (
    <div className="p-6" style={{ paddingBottom: "5rem" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div className="grid grid-cols-1 gap-6" style={{ gridTemplateColumns: "1fr" }}>
          <div className="lg:grid lg:gap-6" style={{ gridTemplateColumns: "1fr 380px" }}>

            {/* ── Left: Community Feed ──────────────────────────────── */}
            <div className="space-y-5">

              {/* Post creation */}
              {canPost && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-6 border"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                >
                  <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                    Crear publicación
                  </h3>
                  <textarea
                    value={postContent}
                    onChange={e => setPostContent(e.target.value)}
                    placeholder="Comparte una novedad con tu comunidad..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-colors"
                    style={{
                      background: "var(--background)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-1">
                      <button
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <LinkIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-6 py-2 text-white rounded-xl font-semibold text-sm"
                      style={{ background: "linear-gradient(to right, #4fc3f7, #22c55e)" }}
                    >
                      Publicar
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Posts */}
              <div className="space-y-4">
                {posts.map((post, i) => {
                  const inits = post.authorName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const liked = likedPosts.has(post.id);
                  const commentsOpen = expandedComments.has(post.id);

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                      className="rounded-2xl p-6 border"
                      style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
                        >
                          {inits}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                              {post.authorName}
                            </span>
                            <RoleBadge role={post.authorRole} />
                          </div>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }} suppressHydrationWarning>
                            {timeAgo(post.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Content */}
                      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }}>
                        {post.content}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
                        <button
                          onClick={() => handleLike(post.id)}
                          className="flex items-center gap-1.5 text-sm transition-colors"
                          style={{ color: liked ? "#ef4444" : "var(--text-secondary)" }}
                        >
                          <Heart
                            className="w-4 h-4"
                            style={{ fill: liked ? "#ef4444" : "none" }}
                          />
                          <span>{post.likesCount}</span>
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center gap-1.5 text-sm transition-colors hover:text-functional"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments.length}</span>
                        </button>
                      </div>

                      {/* Comments */}
                      <AnimatePresence>
                        {commentsOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 space-y-3">
                              {post.comments.map(c => (
                                <div key={c.id} className="flex items-start gap-2">
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                    style={{ background: "var(--card-border)", color: "var(--text-secondary)" }}
                                  >
                                    {c.authorName[0]}
                                  </div>
                                  <div className="flex-1 rounded-xl px-3 py-2" style={{ background: "var(--background)" }}>
                                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                                      {c.authorName}
                                    </span>
                                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                                      {c.content}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <input
                                  value={commentInputs[post.id] ?? ""}
                                  onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyDown={e => e.key === "Enter" && addComment(post.id)}
                                  placeholder="Escribe un comentario..."
                                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                                  style={{
                                    background: "var(--background)",
                                    border: "1px solid var(--card-border)",
                                    color: "var(--text-primary)",
                                  }}
                                />
                                <button
                                  onClick={() => addComment(post.id)}
                                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                                  style={{ background: "#4fc3f720", color: "#4fc3f7" }}
                                >
                                  ↩
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── Right panel ───────────────────────────────────────── */}
            <div className="space-y-5 mt-5 lg:mt-0">

              {/* Today's classes */}
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
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

                {todaysClasses.length === 0 ? (
                  <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                    No hay clases hoy
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todaysClasses.map(cls => {
                      const pct = cls.maxCapacity > 0
                        ? (cls.reservedCount / cls.maxCapacity) * 100
                        : 0;
                      const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
                      return (
                        <div
                          key={cls.id}
                          className="p-3 rounded-xl border"
                          style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                {cls.name}
                              </p>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                                {cls.startTime} — {cls.coach}
                              </p>
                            </div>
                            <OccupancyBadge reserved={cls.reservedCount} capacity={cls.maxCapacity} />
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
                              {cls.reservedCount}/{cls.maxCapacity}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {upcomingClasses.length > 0 && (
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
                            <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                              {cls.name}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                              {cls.startTime}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Member: upcoming reservations */}
              {activeUser.role === "member" && upcomingReservations.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl p-6 border"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                >
                  <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                    Mis próximas reservas
                  </h3>
                  <div className="space-y-2">
                    {upcomingReservations.map(r => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-xl border"
                        style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                      >
                        <div>
                          <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.classDate}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Clase reservada</p>
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
                </motion.div>
              )}

              {/* Admin: operational summary */}
              {activeUser.role === "admin" && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-2xl p-6 border"
                  style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
                >
                  <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
                    Resumen operativo
                  </h3>
                  <div className="space-y-2">
                    {[
                      {
                        label: "Clases activas",
                        value: mockClasses.filter(c => c.status === "active").length,
                        icon: BookOpen,
                        color: "#4fc3f7",
                      },
                      {
                        label: "Ocupación promedio",
                        value: (() => {
                          const active = mockClasses.filter(c => c.status === "active");
                          if (!active.length) return "0%";
                          const avg = active.reduce((s, c) => s + (c.reservedCount / c.maxCapacity) * 100, 0) / active.length;
                          return `${Math.round(avg)}%`;
                        })(),
                        icon: TrendingUp,
                        color: "#22c55e",
                      },
                      {
                        label: "Reservas hoy",
                        value: mockReservations.filter(r => r.classDate === todayStr).length,
                        icon: Users,
                        color: "#f59e0b",
                      },
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
                            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                              {item.label}
                            </span>
                          </div>
                          <span className="font-bold text-sm" style={{ color: item.color }}>
                            {item.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
