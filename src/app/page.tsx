import Link from "next/link";

const features = [
  {
    href: "/calendar",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    icon: "⚡",
    title: "Reservas en Tiempo Real",
    description: "Calendario semanal con disponibilidad en vivo. Reserva o cancela en un clic.",
    accent: "hover:border-blue-500/40",
    tag: "Calendario",
    tagColor: "bg-blue-500/10 text-blue-400",
  },
  {
    href: "/admin/members",
    iconBg: "bg-green-500/10",
    iconColor: "text-green-400",
    icon: "👥",
    title: "Gestión de Miembros",
    description: "Control completo de roles, servicios contratados y coaches asignados.",
    accent: "hover:border-green-500/40",
    tag: "Miembros",
    tagColor: "bg-green-500/10 text-green-400",
  },
  {
    href: "/admin/memberships",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    icon: "💳",
    title: "Control de Membresías",
    description: "Planes, pagos y vigencias agrupados por alumno. KPIs en tiempo real.",
    accent: "hover:border-emerald-500/40",
    tag: "Membresías",
    tagColor: "bg-emerald-500/10 text-emerald-400",
  },
];

const stats = [
  { value: "11", label: "Clases activas" },
  { value: "5", label: "Coaches" },
  { value: "6+", label: "Alumnos" },
  { value: "3", label: "Servicios" },
];

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto pt-20 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-sm font-medium text-blue-300">Gestión de gimnasios — Primary Performance</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
          <span className="text-white">Operación sin</span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            fricción
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-xl mx-auto">
          Reservas, asistencia, membresías y miembros en una sola plataforma. Diseñado para que el gimnasio opere solo.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/calendar"
            className="px-7 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/20"
          >
            Ver Calendario →
          </Link>
          <Link
            href="/admin/classes"
            className="px-7 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl font-semibold text-sm transition-colors"
          >
            Panel Admin
          </Link>
        </div>
      </div>

      {/* ─── Stats ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-20">
        {stats.map(({ value, label }) => (
          <div key={label} className="text-center">
            <p className="text-3xl font-bold text-white mb-0.5">{value}</p>
            <p className="text-zinc-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* ─── Feature Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pb-20">
        {features.map(({ href, iconBg, iconColor, icon, title, description, accent, tag, tagColor }) => (
          <Link
            key={href}
            href={href}
            className={`group bg-zinc-900 border border-zinc-800 rounded-2xl p-7 transition-all ${accent}`}
          >
            {/* Tag */}
            <div className="flex items-center justify-between mb-5">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
              <span className="text-zinc-600 text-sm group-hover:text-zinc-400 transition-colors">→</span>
            </div>

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconBg} ${iconColor} text-2xl`}>
              {icon}
            </div>

            {/* Text */}
            <h2 className="text-base font-bold text-white mb-2 group-hover:text-blue-100 transition-colors">{title}</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>

      {/* ─── Quick access row ─────────────────────────────────────────── */}
      <div className="border-t border-zinc-800 pt-8 pb-12">
        <p className="text-zinc-600 text-xs font-medium uppercase tracking-wider mb-4">Acceso rápido</p>
        <div className="flex flex-wrap gap-3">
          {[
            { href: "/admin/classes", label: "Gestión de Clases" },
            { href: "/admin/members", label: "Miembros" },
            { href: "/admin/memberships", label: "Membresías" },
            { href: "/profile", label: "Mi Perfil" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-lg transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
