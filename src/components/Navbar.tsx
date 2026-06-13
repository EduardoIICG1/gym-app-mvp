"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { useTheme } from "@/lib/useTheme";
import { useFontSize } from "@/lib/useFontSize";
import { useBranding } from "@/components/BrandingProvider";
import { Sun, Moon, LogOut } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const activeUser = useCurrentUser();
  const { theme, toggleTheme } = useTheme();
  const { fontSize, increase, decrease } = useFontSize();
  const branding = useBranding();

  const initials = activeUser.name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-sm"
      style={{ borderColor: "var(--card-border)", background: "var(--navbar-bg)" }}
    >
      <div className="px-2 sm:px-6 h-14 flex items-center justify-between gap-1">
        {/* Logo — visible on mobile only (desktop uses sidebar logo) */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 min-w-0 lg:hidden">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={branding.gymName} className="w-8 h-8 rounded-xl object-cover shrink-0" />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent), #f97316)" }}
            >
              <span className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                {branding.gymName.charAt(0)}
              </span>
            </div>
          )}
          <span className="font-bold text-sm hidden sm:block truncate" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            {branding.gymName}
          </span>
        </Link>

        {/* Spacer on desktop */}
        <div className="hidden lg:block" />

        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          {/* Font size controls */}
          <button
            onClick={decrease}
            disabled={fontSize === "normal"}
            title="Reducir tamaño de texto"
            className="flex items-center justify-center w-8 h-8 rounded-lg nav-icon-btn font-bold text-xs"
            style={{ color: "var(--text-primary)", opacity: fontSize === "normal" ? 0.3 : 1 }}
            suppressHydrationWarning
          >
            A-
          </button>
          <button
            onClick={increase}
            disabled={fontSize === "xlarge"}
            title="Aumentar tamaño de texto"
            className="flex items-center justify-center w-8 h-8 rounded-lg nav-icon-btn font-bold text-sm"
            style={{ color: "var(--text-primary)", opacity: fontSize === "xlarge" ? 0.3 : 1 }}
            suppressHydrationWarning
          >
            A+
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            className="flex items-center justify-center w-8 h-8 rounded-lg nav-icon-btn"
            style={{ color: "var(--text-primary)" }}
            suppressHydrationWarning
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Profile avatar */}
          <Link
            href={["admin", "coach", "kinesiologist"].includes(activeUser.role) ? "/staff-profile" : "/profile"}
            className="flex items-center gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg nav-icon-btn"
            style={pathname.startsWith("/profile") || pathname.startsWith("/staff-profile") ? { background: "rgba(255,255,255,0.06)" } : {}}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-accent))" }}
            >
              {initials}
            </div>
            <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--text-secondary)" }}>
              {activeUser.name.split(" ")[0]}
            </span>
          </Link>

          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Cerrar sesión"
            className="flex items-center justify-center w-8 h-8 rounded-lg nav-icon-btn shrink-0"
            style={{ color: "var(--text-secondary)" }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
