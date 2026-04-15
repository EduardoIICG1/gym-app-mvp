"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { currentUser } from "@/lib/mock-data";

// ─── Icons (inline SVG, stroke-based, 18×18) ──────────────────────────────
function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconClasses() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconMembers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconMemberships() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Nav items ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: "/",                   label: "Inicio",      exact: true,  roles: ["admin", "coach", "member"], Icon: IconHome },
  { href: "/calendar",           label: "Calendario",  exact: false, roles: ["admin", "coach", "member"], Icon: IconCalendar },
  { href: "/admin/classes",      label: "Clases",      exact: false, roles: ["admin", "coach"],           Icon: IconClasses },
  { href: "/admin/members",      label: "Miembros",    exact: false, roles: ["admin", "coach"],           Icon: IconMembers },
  { href: "/admin/memberships",  label: "Membresías",  exact: false, roles: ["admin"],                   Icon: IconMemberships },
  { href: "/profile",            label: "Mi Perfil",   exact: false, roles: ["admin", "coach", "member"], Icon: IconProfile },
];

// ─── Component ─────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();

  // Expanded on home, collapsed on any module — user can toggle manually
  const [collapsed, setCollapsed] = useState(() => pathname !== "/");

  useEffect(() => {
    setCollapsed(pathname !== "/");
  }, [pathname]);

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 border-r border-zinc-800 bg-zinc-950 sticky top-14 h-[calc(100vh-3.5rem)] transition-[width] duration-200 ease-in-out ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto">
        {visibleItems.map(({ href, label, exact, Icon }) => {
          const active = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-3 rounded-lg font-medium transition-colors ${
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              } ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              <span className="shrink-0">
                <Icon />
              </span>
              {!collapsed && (
                <span className="text-sm truncate">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className={`w-full flex items-center rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-colors py-2 ${
            collapsed ? "justify-center px-0" : "gap-2 px-3"
          }`}
        >
          {collapsed ? <IconChevronRight /> : (
            <>
              <IconChevronLeft />
              <span className="text-xs">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
