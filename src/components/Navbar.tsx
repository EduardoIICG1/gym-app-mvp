"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useTheme } from "@/lib/useTheme";
import { Sun, Moon } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const activeUser = useCurrentUser();
  const { theme, toggleTheme } = useTheme();

  const initials = activeUser.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-sm"
      style={{ borderColor: "var(--card-border)", background: "rgba(17,17,20,0.85)" }}
    >
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo — visible on mobile only (desktop uses sidebar logo) */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 lg:hidden">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e, #f97316)" }}
          >
            <span className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>P</span>
          </div>
          <span className="font-bold text-sm" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Primary Performance
          </span>
        </Link>

        {/* Spacer on desktop */}
        <div className="hidden lg:block" />

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "var(--text-secondary)" }}
            suppressHydrationWarning
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Profile avatar */}
          <Link
            href="/profile"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={pathname.startsWith("/profile") ? { background: "rgba(255,255,255,0.06)" } : {}}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
            >
              {initials}
            </div>
            <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--text-secondary)" }}>
              {activeUser.name.split(" ")[0]}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
