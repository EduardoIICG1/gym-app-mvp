"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Inicio", exact: true },
  { href: "/calendar", label: "Calendario", exact: false },
  { href: "/admin/classes", label: "Clases", exact: false },
  { href: "/admin/memberships", label: "Membresías", exact: false },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">PP</span>
          <span className="font-semibold text-white text-sm hidden sm:block">Primary Performance</span>
        </Link>
        <div className="flex items-center gap-0.5">
          {links.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
      </div>
    </nav>
  );
}
