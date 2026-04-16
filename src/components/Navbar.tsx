"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useTheme } from "@/lib/useTheme";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function Navbar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">PP</span>
          <span className="font-semibold text-white text-sm hidden lg:block">Primary Performance</span>
        </Link>

        <div className="flex items-center gap-1">
          {/* Theme toggle — visible, accessible */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-base"
            suppressHydrationWarning
          >
            {theme === "dark" ? "☀" : "🌙"}
          </button>

          {/* Profile avatar */}
          <Link
            href="/profile"
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors shrink-0 ${
              pathname.startsWith("/profile")
                ? "bg-zinc-800"
                : "hover:bg-zinc-800/60"
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs">
              {initials(user.name)}
            </div>
            <span className="text-zinc-400 text-xs font-medium hidden sm:block">
              {user.name.split(" ")[0]}
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
