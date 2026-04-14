"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentUser } from "@/lib/mock-data";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const links = [
  { href: "/", label: "Inicio", exact: true },
  { href: "/calendar", label: "Calendario", exact: false },
  { href: "/admin/classes", label: "Clases", exact: false },
  { href: "/admin/members", label: "Miembros", exact: false },
  { href: "/admin/memberships", label: "Membresías", exact: false },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">PP</span>
          <span className="font-semibold text-white text-sm hidden lg:block">Primary Performance</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {links.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Profile avatar */}
        <Link
          href="/profile"
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors shrink-0 ml-1 ${
            pathname.startsWith("/profile") && !pathname.includes("userId")
              ? "bg-zinc-800"
              : "hover:bg-zinc-800/60"
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs">
            {initials(currentUser.name)}
          </div>
          <span className="text-zinc-400 text-xs font-medium hidden sm:block">
            {currentUser.name.split(" ")[0]}
          </span>
        </Link>
      </div>
    </nav>
  );
}
