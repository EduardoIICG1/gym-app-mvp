"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home, Calendar, BookOpen, Users, CreditCard, User,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { ROLE_LABELS } from "@/lib/labels";

const NAV_ITEMS = [
  { path: "/",                  label: "Inicio",     icon: Home,       roles: ["admin", "coach", "member", "owner"] },
  { path: "/calendar",          label: "Calendario", icon: Calendar,   roles: ["admin", "coach", "member", "owner"] },
  { path: "/admin/classes",     label: "Clases",     icon: BookOpen,   roles: ["admin", "coach"] },
  { path: "/admin/members",     label: "Miembros",   icon: Users,      roles: ["admin", "coach"] },
  { path: "/admin/memberships", label: "Membresías", icon: CreditCard, roles: ["admin"] },
  { path: "/profile",           label: "Mi Perfil",  icon: User,       roles: ["admin", "coach", "member", "owner"] },
];

const ROLE_COLOR: Record<string, string> = {
  admin:  "#4fc3f7",
  coach:  "#22c55e",
  member: "#71717a",
  owner:  "#a78bfa",
};

export function Sidebar() {
  const pathname = usePathname();
  const activeUser = useCurrentUser();
  const changeRole = activeUser.changeRole;
  const [collapsed, setCollapsed] = useState(pathname !== "/");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setCollapsed(pathname !== "/");
  }, [pathname]);

  const isExpanded = !collapsed || hovered;
  const accentColor = ROLE_COLOR[activeUser.role] ?? "#4fc3f7";

  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.some(r => activeUser.roles.includes(r as import("@/lib/types").MemberRole))
  );

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="hidden lg:flex flex-col shrink-0 border-r sticky top-14 h-[calc(100vh-3.5rem)] transition-[width] duration-300 ease-in-out overflow-hidden"
        style={{
          width: isExpanded ? "16rem" : "4rem",
          borderColor: "var(--card-border)",
          background: "var(--card)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b overflow-hidden" style={{ borderColor: "var(--card-border)", minHeight: "64px" }}>
          <Link href="/" className="shrink-0 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e, #f97316)" }}
            >
              <span className="text-white font-bold text-base" style={{ fontFamily: "var(--font-display)" }}>P</span>
            </div>
          </Link>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap min-w-0"
              >
                <p className="font-bold text-sm leading-tight" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  Primary Performance
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {ROLE_LABELS[activeUser.role] ?? activeUser.role}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                title={!isExpanded ? item.label : undefined}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/5"
              >
                {active && (
                  <motion.div
                    layoutId="activeSidebar"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      backgroundColor: `${accentColor}15`,
                      border: `1px solid ${accentColor}30`,
                    }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon
                  className="w-5 h-5 shrink-0 relative z-10"
                  style={{ color: active ? accentColor : "var(--text-secondary)" }}
                />
                <AnimatePresence>
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="text-sm font-medium relative z-10 whitespace-nowrap"
                      style={{ color: active ? accentColor : "var(--text-secondary)" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Role switcher — visible when expanded */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 border-t"
              style={{ borderColor: "var(--card-border)", background: "rgba(0,0,0,0.2)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "var(--text-secondary)" }}>
                Demo: Rol
              </p>
              <div className="flex gap-1">
                {(["admin", "coach", "member"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => changeRole(r)}
                    className="flex-1 px-2 py-1.5 rounded text-xs font-semibold transition-all capitalize"
                    style={
                      activeUser.role === r
                        ? { backgroundColor: "#4fc3f7", color: "#0a0a0f" }
                        : { backgroundColor: "var(--card-border)", color: "var(--text-secondary)" }
                    }
                  >
                    {ROLE_LABELS[r] ?? r}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        <div className="p-3 border-t" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft className="w-4 h-4" />
            }
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-sm"
        style={{ borderColor: "var(--card-border)", background: "rgba(17,17,20,0.95)" }}
      >
        <div className="flex items-center justify-around px-1 h-16">
          {visibleItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <Icon className="w-5 h-5" style={{ color: active ? accentColor : "var(--text-secondary)" }} />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? accentColor : "var(--text-secondary)" }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
