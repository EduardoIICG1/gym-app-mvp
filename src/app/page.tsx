import Link from "next/link";

const sections = [
  {
    href: "/calendar",
    icon: "📅",
    title: "Calendario",
    description: "Visualiza, reserva y cancela clases de la semana.",
    accent: "hover:border-blue-500/50 group-hover:text-blue-400",
    iconBg: "bg-blue-500/10 text-blue-400",
  },
  {
    href: "/admin/classes",
    icon: "🏋️",
    title: "Gestión de Clases",
    description: "Administra clases, cupos, inscritos y asistencia.",
    accent: "hover:border-orange-500/50 group-hover:text-orange-400",
    iconBg: "bg-orange-500/10 text-orange-400",
  },
  {
    href: "/admin/memberships",
    icon: "💳",
    title: "Membresías",
    description: "Gestiona planes, pagos y estado de membresías.",
    accent: "hover:border-green-500/50 group-hover:text-green-400",
    iconBg: "bg-green-500/10 text-green-400",
  },
];

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-white mb-2">Bienvenido</h1>
        <p className="text-zinc-400">Sistema de gestión de clases y reservas — Primary Performance</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
        {sections.map(({ href, icon, title, description, accent, iconBg }) => (
          <Link
            key={href}
            href={href}
            className={`group bg-zinc-900 border border-zinc-800 rounded-xl p-6 transition-colors ${accent}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 text-xl ${iconBg}`}>
              {icon}
            </div>
            <h2 className={`text-base font-semibold text-white mb-1 transition-colors ${accent}`}>{title}</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
