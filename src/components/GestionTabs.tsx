"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/members", label: "Miembros" },
  { href: "/admin/memberships", label: "Membresías" },
];

export function GestionTabs() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden flex gap-1 p-1 rounded-xl mb-5" style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}>
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 text-center text-sm font-semibold py-2 rounded-lg transition-colors"
            style={active ? { background: "#4fc3f720", color: "#4fc3f7" } : { color: "var(--text-secondary)" }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
