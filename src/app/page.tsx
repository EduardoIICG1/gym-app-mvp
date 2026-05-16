"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Users, TrendingUp, BookOpen, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { OccupancyBadge } from "@/components/Badge";

interface HomeClass {
  id: string;
  name: string;
  coach: string;
  coachId: string;      // used to filter coach's own sessions
  sessionDate: string;  // "YYYY-MM-DD" — real instance date, not recurring dayOfWeek
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  reserved: number;
}

interface HomeReservation {
  id: string;
  className: string;
  classDate: string;
  startTime: string;
  status: string;
}

function currentWeekStart(): string {
  const today = new Date();
  const diff = (today.getDay() + 6) % 7; // days since Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

function gymDayOfWeek(): number {
  const d = new Date().getDay(); // JS: 0=Sun…6=Sat
  return d === 0 ? -1 : d - 1;  // Mon=0…Sat=5, Sun=-1
}

export default function Home() {
  const activeUser = useCurrentUser();
  const [mounted, setMounted] = useState(false);
  const [classes, setClasses] = useState<HomeClass[]>([]);
  const [reservations, setReservations] = useState<HomeReservation[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  // Fetch this week's sessions once auth is ready
  useEffect(() => {
    if (activeUser.isLoading) return;
    (async () => {
      try {
        const res = await fetch(`/api/classes?weekStart=${currentWeekStart()}`);
        if (res.ok) setClasses(await res.json());
      } finally {
        setClassesLoading(false);
      }
    })();
  }, [activeUser.isLoading]);

  // Fetch member's reservations once user id is known
  useEffect(() => {
    if (activeUser.isLoading || !activeUser.id || activeUser.role !== "member") return;
    fetch(`/api/reservations?userId=${activeUser.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setReservations(data));
  }, [activeUser.id, activeUser.isLoading, activeUser.role]);

  const gymDow = gymDayOfWeek();
  const todayStr = new Date().toISOString().slice(0, 10);

  // ── ADMIN / MEMBER: all gym classes today (by dayOfWeek for display)
  const todaysClasses = gymDow === -1 ? [] : classes.filter(c => c.dayOfWeek === gymDow);
  const upcomingClasses = gymDow === -1
    ? classes.slice(0, 3)
    : classes.filter(c => c.dayOfWeek > gymDow).slice(0, 3);

  // ── MEMBER: upcoming reservations
  const upcomingReservations = reservations
    .filter(r => r.classDate >= todayStr && r.status === "reserved")
    .slice(0, 4);

  // ── COACH: filter by real sessionDate (not dayOfWeek)
  const coachTodayClasses = classes.filter(
    c => c.coachId === activeUser.id && c.sessionDate === todayStr
  );
  const coachUpcomingClasses = classes
    .filter(c => c.coachId === activeUser.id && c.sessionDate > todayStr)
    .sort((a, b) =>
      a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime)
    )
    .slice(0, 5);

  // ── COACH KPIs (all safe against NaN)
  const coachReservedToday = coachTodayClasses.reduce((sum, c) => sum + c.reserved, 0);
  const coachWithCapacity = coachTodayClasses.filter(c => c.capacity > 0);
  const coachAvgOccupancy = coachWithCapacity.length > 0
    ? Math.round(
        coachWithCapacity.reduce((sum, c) => sum + (c.reserved / c.capacity) * 100, 0)
        / coachWithCapacity.length
      )
    : 0;
  const coachNextClass = coachTodayClasses[0] ?? coachUpcomingClasses[0] ?? null;

  if (!mounted) return null;

  return (
    <div className="p-6" style={{ paddingBottom: "5rem" }}>
      <div className="mx-auto space-y-5" style={{ maxWidth: "480px" }}>

        {/* ── ADMIN / MEMBER: Clases de hoy ───────────────────────── */}
        {activeUser.role !== "coach" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                Clases de hoy
              </h3>
              <a href="/calendar" className="text-xs hover:underline" style={{ color: "#4fc3f7" }}>
                Ver todas →
              </a>
            </div>

            {classesLoading ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>Cargando...</p>
            ) : gymDow === -1 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                El gimnasio descansa los domingos 🌿
              </p>
            ) : todaysClasses.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                No hay clases programadas para hoy
              </p>
            ) : (
              <div className="space-y-3">
                {todaysClasses.slice(0, 4).map(cls => {
                  const pct = cls.capacity > 0 ? (cls.reserved / cls.capacity) * 100 : 0;
                  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
                  return (
                    <div
                      key={cls.id}
                      className="p-3 rounded-xl border"
                      style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {cls.startTime} — {cls.coach}
                          </p>
                        </div>
                        <OccupancyBadge reserved={cls.reserved} capacity={cls.capacity} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                          {cls.reserved}/{cls.capacity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Próximamente */}
            {!classesLoading && upcomingClasses.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                  Próximamente
                </p>
                <div className="space-y-2">
                  {upcomingClasses.map(cls => (
                    <div key={cls.id} className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: "#4fc3f720", color: "#4fc3f7" }}
                      >
                        {cls.coach.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cls.startTime}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── COACH: Mis clases de hoy + Próximas ─────────────────── */}
        {activeUser.role === "coach" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                Mis clases de hoy
              </h3>
              <a href="/calendar" className="text-xs hover:underline" style={{ color: "#4fc3f7" }}>
                Ver calendario →
              </a>
            </div>

            {classesLoading ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>Cargando...</p>
            ) : coachTodayClasses.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: "var(--text-secondary)" }}>
                No tienes clases hoy
              </p>
            ) : (
              <div className="space-y-3">
                {coachTodayClasses.map(cls => {
                  const pct = cls.capacity > 0 ? (cls.reserved / cls.capacity) * 100 : 0;
                  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#22c55e";
                  return (
                    <div
                      key={cls.id}
                      className="p-3 rounded-xl border"
                      style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {cls.startTime} – {cls.endTime}
                          </p>
                        </div>
                        <OccupancyBadge reserved={cls.reserved} capacity={cls.capacity} />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: barColor }}
                          />
                        </div>
                        <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                          {cls.reserved}/{cls.capacity}
                        </span>
                      </div>
                      <div className="mt-2 text-right">
                        <Link
                          href={`/classes/${cls.id}?from=classes`}
                          className="text-xs hover:underline font-medium"
                          style={{ color: "#4fc3f7" }}
                        >
                          Ver detalle →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Próximas clases del coach — by real sessionDate */}
            {!classesLoading && coachUpcomingClasses.length > 0 && (
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--card-border)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                  Próximas clases
                </p>
                <div className="space-y-2">
                  {coachUpcomingClasses.map(cls => (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border"
                      style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                    >
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          {cls.sessionDate} · {cls.startTime}
                        </p>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-secondary)" }}>
                        {cls.reserved}/{cls.capacity}
                      </span>
                      <Link
                        href={`/classes/${cls.id}?from=classes`}
                        className="text-xs hover:underline font-medium shrink-0"
                        style={{ color: "#4fc3f7" }}
                      >
                        Ver →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── COACH: Resumen de hoy ────────────────────────────────── */}
        {activeUser.role === "coach" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
              Resumen de hoy
            </h3>
            <div className="space-y-2">
              {[
                { label: "Clases hoy",       value: coachTodayClasses.length,          icon: BookOpen,   color: "#4fc3f7" },
                { label: "Inscritos hoy",    value: coachReservedToday,                icon: Users,      color: "#22c55e" },
                { label: "Ocupación media",  value: `${coachAvgOccupancy}%`,           icon: TrendingUp, color: "#f59e0b" },
                { label: "Próxima clase",    value: coachNextClass?.startTime ?? "—",  icon: Clock,      color: "#a78bfa" },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${item.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                    </div>
                    <span className="font-bold text-sm" style={{ color: item.color }}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── MEMBER: Mis próximas reservas ───────────────────────── */}
        {activeUser.role === "member" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
              Mis próximas reservas
            </h3>
            {upcomingReservations.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                Sin próximas reservas
              </p>
            ) : (
              <div className="space-y-2">
                {upcomingReservations.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  >
                    <div>
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{r.className}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.classDate} · {r.startTime}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded font-semibold"
                      style={{ background: "#22c55e20", color: "#22c55e" }}
                    >
                      Reservado
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── ADMIN: Resumen operativo ─────────────────────────────── */}
        {activeUser.role === "admin" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 border"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
              Resumen operativo
            </h3>
            <div className="space-y-2">
              {(() => {
                const reservedToday = todaysClasses.reduce((sum, c) => sum + c.reserved, 0);
                const withCapacity = classes.filter(c => c.capacity > 0);
                const avgOccupancy = withCapacity.length > 0
                  ? Math.round(
                      withCapacity.reduce((sum, c) => sum + (c.reserved / c.capacity) * 100, 0)
                      / withCapacity.length
                    )
                  : 0;
                return [
                  { label: "Clases activas",    value: classes.length,     icon: BookOpen,   color: "#4fc3f7" },
                  { label: "Ocupación promedio", value: `${avgOccupancy}%`, icon: TrendingUp, color: "#22c55e" },
                  { label: "Reservas hoy",       value: reservedToday,      icon: Users,      color: "#f59e0b" },
                ];
              })().map(item => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: "var(--background)", borderColor: "var(--card-border)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${item.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                    </div>
                    <span className="font-bold text-sm" style={{ color: item.color }}>{item.value}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
