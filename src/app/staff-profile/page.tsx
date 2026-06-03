"use client";

import Link from "next/link";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { RoleBadge } from "@/components/Badge";

const STAFF_LINKS: { label: string; href: string; roles: string[] }[] = [
  { label: "Calendario",   href: "/calendar",          roles: ["admin", "coach", "kinesiologist"] },
  { label: "Miembros",     href: "/admin/members",     roles: ["admin", "coach", "kinesiologist"] },
  { label: "Membresías",   href: "/admin/memberships", roles: ["admin", "coach"] },
  { label: "Kinesiología", href: "/health",            roles: ["admin", "kinesiologist"] },
  { label: "Pacientes",    href: "/health/patients",   roles: ["kinesiologist"] },
  { label: "Clases",       href: "/admin/classes",     roles: ["admin", "coach"] },
];

function safeInitials(name?: string | null): string {
  const clean = typeof name === "string" && name.trim() ? name.trim() : "U";
  return clean.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase() || "U";
}

export default function StaffProfilePage() {
  const user = useCurrentUser();

  if (user.isLoading) {
    return (
      <div className="text-center py-24" style={{ color: "var(--text-secondary)" }}>
        Cargando perfil...
      </div>
    );
  }

  if (!["admin", "coach", "kinesiologist"].includes(user.role)) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
          Esta vista es solo para cuentas de staff.
        </p>
        <Link href="/profile" className="text-sm font-medium" style={{ color: "#4fc3f7" }}>
          Ir a mi perfil →
        </Link>
      </div>
    );
  }

  const links = STAFF_LINKS.filter((l) => l.roles.includes(user.role));

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start gap-5 mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0"
          style={{ background: "linear-gradient(135deg, #4fc3f7, #22c55e)" }}
        >
          {safeInitials(user.name)}
        </div>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
          >
            {user.name || "Usuario staff"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {user.email}
          </p>
          <div className="mt-2">
            <RoleBadge role={user.role} />
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-5 border mb-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          Perfil operativo
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Este perfil corresponde a una cuenta de staff. Las métricas de membresías, reservas y
          ciclos se muestran en los perfiles de miembros y alumnos.
        </p>
      </div>

      {links.length > 0 && (
        <div
          className="rounded-xl p-5 border"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Accesos rápidos
          </p>
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors hover:opacity-80"
                style={{ background: "#4fc3f720", color: "#4fc3f7" }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
