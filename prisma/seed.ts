import { loadEnvConfig } from "@next/env";

// Load .env.local before PrismaClient instantiation
loadEnvConfig(process.cwd());

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Stable IDs — guarantee idempotency across seed runs
const ID = {
  // Programs
  progGrupalMon:  "seed_prog_grupal_mon",
  progGrupalWed:  "seed_prog_grupal_wed",
  progGrupalFull: "seed_prog_grupal_full",  // capacity=2 for "Sin cupos" demo
  progPersonal:   "seed_prog_personal",
  progKinesio:    "seed_prog_kinesio",

  // Sessions — deleted and recreated fresh on each seed run
  sessGMon1: "seed_sess_g_mon1",
  sessGMon2: "seed_sess_g_mon2",
  sessGMon3: "seed_sess_g_mon3",
  sessGMon4: "seed_sess_g_mon4",
  sessGWed1: "seed_sess_g_wed1",
  sessGWed2: "seed_sess_g_wed2",
  sessGWed3: "seed_sess_g_wed3",
  sessGWed4: "seed_sess_g_wed4",
  sessGFull: "seed_sess_g_full",  // Monday 07:00 — filled to capacity
  sessP1:    "seed_sess_p_1",
  sessP2:    "seed_sess_p_2",
  sessP3:    "seed_sess_p_3",
  sessK1:    "seed_sess_k_1",

  // MemberCoach
  mcAnaMarisol:   "seed_mc_ana_marisol",
  mcCarlosFelipe: "seed_mc_carlos_felipe",
  mcLuciaFelipe:      "seed_mc_lucia_felipe",
  mcSofiaFelipe:      "seed_mc_sofia_felipe",
  mcLuciaPlaceholder: "seed_mc_lucia_ph_coach",

  // Memberships
  membrAna:    "seed_membr_ana",
  membrCarlos: "seed_membr_carlos",
  membrLucia:  "seed_membr_lucia",
  membrSofia:            "seed_membr_sofia",      // expired — for alerts demo
  membrLuciaPlaceholder: "seed_membr_lucia_ph",   // no_sessions demo (placeholder, no real login)

  // Bookings
  bookAnaGrupal:     "seed_book_ana_grupal",
  bookCarlosGrupal:  "seed_book_carlos_grupal",
  bookLuciaGrupal:   "seed_book_lucia_grupal",
  bookAnaPersonal:   "seed_book_ana_personal",
  bookCarlosKinesio: "seed_book_carlos_kinesio",
  bookGFullAna:      "seed_book_g_full_ana",
  bookGFullCarlos:   "seed_book_g_full_carlos",

  // BookingInvitation
  invLuciaGrupal: "seed_inv_lucia_grupal",

  // Announcements
  annPinned1: "seed_ann_pinned_1",
  annPinned2: "seed_ann_pinned_2",
  annAlert1:  "seed_ann_alert_1",
  annInfo1:   "seed_ann_info_1",

  // Health module
  mcKineCarlos:   "seed_mc_kine_carlos",
  mcKineLucia:    "seed_mc_kine_lucia",
  membrLuciaKine: "seed_membr_lucia_kine",
  hrCarlos:       "seed_hr_carlos",
  hrLucia:        "seed_hr_lucia",
  hsCar1: "seed_hs_car_1", hsCar2: "seed_hs_car_2", hsCar3: "seed_hs_car_3",
  hsLuc1: "seed_hs_luc_1", hsLuc2: "seed_hs_luc_2", hsLuc3: "seed_hs_luc_3",
  resCar1: "seed_res_car_1", resCar2: "seed_res_car_2",
  resLuc1: "seed_res_luc_1", resLuc2: "seed_res_luc_2",
};

// Returns the next occurrence of jsDay (1=Mon, 2=Tue, 3=Wed...) at given hour/min.
// weekOffset=0 → this week's next occurrence; weekOffset=N → N additional weeks.
// Never returns today — always at least 1 day in the future.
function nextWeekday(jsDay: number, weekOffset: number, hour: number, min = 0): Date {
  const today = new Date();
  const todayDay = today.getDay();
  let diff = (jsDay - todayDay + 7) % 7;
  if (diff === 0) diff = 7;
  diff += weekOffset * 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  d.setHours(hour, min, 0, 0);
  return d;
}

function addMin(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * 60_000);
}

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ─── Users ────────────────────────────────────────────────────────────────
  console.log("→ Users");

  // Dev admin — real Google account, must survive DB resets
  await prisma.user.upsert({
    where:  { email: "lalopeluuza01@gmail.com" },
    update: { name: "Eduardo Vergara Alvarado", role: "ADMIN", isActive: true },
    create: { email: "lalopeluuza01@gmail.com", name: "Eduardo Vergara Alvarado", role: "ADMIN", isActive: true },
  });

  const [admin, coach1, coach2, mem1, mem2, mem3, mem4] = await Promise.all([
    prisma.user.upsert({
      where:  { email: "admin@primaryperf.com" },
      update: { name: "Admin PP", role: "ADMIN", isActive: true },
      create: { email: "admin@primaryperf.com", name: "Admin PP", role: "ADMIN", isActive: true },
    }),
    // coach1 (real Google): primary.coach.test@gmail.com — GROUP + KINESIO, full demo scenario
    prisma.user.upsert({
      where:  { email: "primary.coach.test@gmail.com" },
      update: { name: "Felipe Soto", role: "COACH", isActive: true },
      create: { email: "primary.coach.test@gmail.com", name: "Felipe Soto", role: "COACH", isActive: true },
    }),
    // coach2: Marisol — PERSONAL_TRAINING
    prisma.user.upsert({
      where:  { email: "marisolv@primaryperf.com" },
      update: { name: "Marisol Vega", role: "COACH", isActive: true },
      create: { email: "marisolv@primaryperf.com", name: "Marisol Vega", role: "COACH", isActive: true },
    }),
    // mem1 (real Google): laloosky@gmail.com — PERSONAL_TRAINING member
    prisma.user.upsert({
      where:  { email: "laloosky@gmail.com" },
      update: { name: "Ana García", role: "MEMBER", isActive: true },
      create: { email: "laloosky@gmail.com", name: "Ana García", role: "MEMBER", isActive: true },
    }),
    // mem2: Carlos — KINESIOLOGY member
    prisma.user.upsert({
      where:  { email: "carlosl@primaryperf.com" },
      update: { name: "Carlos López", isActive: true },
      create: { email: "carlosl@primaryperf.com", name: "Carlos López", role: "MEMBER", isActive: true },
    }),
    // mem3 (real Google): performanceprimary.task@gmail.com — GROUP member, all calendar states demo
    prisma.user.upsert({
      where:  { email: "performanceprimary.task@gmail.com" },
      update: { name: "Lucía Pérez", role: "MEMBER", isActive: true },
      create: { email: "performanceprimary.task@gmail.com", name: "Lucía Pérez", role: "MEMBER", isActive: true },
    }),
    // mem4 (real Google): evergara.ing@gmail.com — GROUP EXPIRED member, demonstrates "membresía vencida" alert
    prisma.user.upsert({
      where:  { email: "evergara.ing@gmail.com" },
      update: { name: "Sofía Ramos", role: "MEMBER", isActive: true },
      create: { email: "evergara.ing@gmail.com", name: "Sofía Ramos", role: "MEMBER", isActive: true },
    }),
  ]);
  // Secondary placeholder users — no real Google accounts, data richness only
  // anaPlaceholder is used in GROUP bookings so laloosky (PT) stays out of GROUP sessions
  const [, luciaPlaceholder, anaPlaceholder] = await Promise.all([
    prisma.user.upsert({
      where:  { email: "felipesoto@primaryperf.com" },
      update: { name: "Felipe Soto", role: "COACH", isActive: true },
      create: { email: "felipesoto@primaryperf.com", name: "Felipe Soto", role: "COACH", isActive: true },
    }),
    prisma.user.upsert({
      where:  { email: "luciap@primaryperf.com" },
      update: { name: "Lucía Pérez", isActive: true },
      create: { email: "luciap@primaryperf.com", name: "Lucía Pérez", role: "MEMBER", isActive: true },
    }),
    prisma.user.upsert({
      where:  { email: "ana@primaryperf.com" },
      update: { name: "Ana García", isActive: true },
      create: { email: "ana@primaryperf.com", name: "Ana García", role: "MEMBER", isActive: true },
    }),
    prisma.user.upsert({
      where:  { email: "sofia@primaryperf.com" },
      update: { name: "Sofía Ramos", isActive: true },
      create: { email: "sofia@primaryperf.com", name: "Sofía Ramos", role: "MEMBER", isActive: true },
    }),
  ]);
  console.log(`   ✓ 9 users (5 real) + 4 secondary placeholders\n`);

  // ─── Programs ─────────────────────────────────────────────────────────────
  console.log("→ Programs");
  const [progGrupalMon, progGrupalWed, progGrupalFull, progPersonal, progKinesio] = await Promise.all([
    prisma.program.upsert({
      where:  { id: ID.progGrupalMon },
      update: {},
      create: {
        id: ID.progGrupalMon,
        name: "Funcional Grupal Mañana",
        serviceType: "GROUP",
        durationMin: 60,
        maxCapacity: 15,
        dayOfWeek: 0,
        startTime: "08:00",
        defaultCoachId: coach1.id,
        isActive: true,
      },
    }),
    prisma.program.upsert({
      where:  { id: ID.progGrupalWed },
      update: {},
      create: {
        id: ID.progGrupalWed,
        name: "Funcional Grupal Tarde",
        serviceType: "GROUP",
        durationMin: 60,
        maxCapacity: 15,
        dayOfWeek: 2,
        startTime: "18:00",
        defaultCoachId: coach1.id,
        isActive: true,
      },
    }),
    // Capacity=2 program for "Sin cupos" demo — fills with 2 bookings
    prisma.program.upsert({
      where:  { id: ID.progGrupalFull },
      update: {},
      create: {
        id: ID.progGrupalFull,
        name: "Funcional Express",
        serviceType: "GROUP",
        durationMin: 45,
        maxCapacity: 2,
        dayOfWeek: 0,
        startTime: "07:00",
        defaultCoachId: coach1.id,
        isActive: true,
      },
    }),
    prisma.program.upsert({
      where:  { id: ID.progPersonal },
      update: {},
      create: {
        id: ID.progPersonal,
        name: "Entrenamiento Personal",
        serviceType: "PERSONAL_TRAINING",
        durationMin: 60,
        maxCapacity: 1,
        defaultCoachId: coach2.id,
        isActive: true,
      },
    }),
    prisma.program.upsert({
      where:  { id: ID.progKinesio },
      update: {},
      create: {
        id: ID.progKinesio,
        name: "Kinesiología Básica",
        serviceType: "KINESIOLOGY",
        durationMin: 45,
        maxCapacity: 1,
        defaultCoachId: coach1.id,
        isActive: true,
      },
    }),
  ]);
  console.log("   ✓ 5 programs\n");

  // ─── Sessions ─────────────────────────────────────────────────────────────
  // Delete existing seed sessions first — cascade deletes seed bookings + invitations.
  // Then recreate with fresh future dates. This avoids @@unique([programId, startsAt]) conflicts.
  console.log("→ Sessions");
  const allSeedSessionIds = Object.entries(ID)
    .filter(([k]) => k.startsWith("sess"))
    .map(([, v]) => v);

  await prisma.session.deleteMany({ where: { id: { in: allSeedSessionIds } } });

  // Mon=1, Tue=2, Wed=3 in JS (0=Sun)
  const t = {
    gMon0: nextWeekday(1, 0, 8),   gMon1: nextWeekday(1, 1, 8),
    gMon2: nextWeekday(1, 2, 8),   gMon3: nextWeekday(1, 3, 8),
    gWed0: nextWeekday(3, 0, 18),  gWed1: nextWeekday(3, 1, 18),
    gWed2: nextWeekday(3, 2, 18),  gWed3: nextWeekday(3, 3, 18),
    gFull: nextWeekday(1, 0, 7),
    p0:    nextWeekday(2, 0, 10),  p1: nextWeekday(2, 1, 10),  p2: nextWeekday(2, 2, 10),
    k0:    nextWeekday(2, 0, 11),
  };

  await prisma.session.createMany({
    data: [
      // GROUP Monday — 4 weeks
      { id: ID.sessGMon1, programId: progGrupalMon.id,  coachId: coach1.id, startsAt: t.gMon0, endsAt: addMin(t.gMon0, 60), status: "SCHEDULED" },
      { id: ID.sessGMon2, programId: progGrupalMon.id,  coachId: coach1.id, startsAt: t.gMon1, endsAt: addMin(t.gMon1, 60), status: "SCHEDULED" },
      { id: ID.sessGMon3, programId: progGrupalMon.id,  coachId: coach1.id, startsAt: t.gMon2, endsAt: addMin(t.gMon2, 60), status: "SCHEDULED" },
      { id: ID.sessGMon4, programId: progGrupalMon.id,  coachId: coach1.id, startsAt: t.gMon3, endsAt: addMin(t.gMon3, 60), status: "SCHEDULED" },
      // GROUP Wednesday — 4 weeks
      { id: ID.sessGWed1, programId: progGrupalWed.id,  coachId: coach1.id, startsAt: t.gWed0, endsAt: addMin(t.gWed0, 60), status: "SCHEDULED" },
      { id: ID.sessGWed2, programId: progGrupalWed.id,  coachId: coach1.id, startsAt: t.gWed1, endsAt: addMin(t.gWed1, 60), status: "SCHEDULED" },
      { id: ID.sessGWed3, programId: progGrupalWed.id,  coachId: coach1.id, startsAt: t.gWed2, endsAt: addMin(t.gWed2, 60), status: "SCHEDULED" },
      { id: ID.sessGWed4, programId: progGrupalWed.id,  coachId: coach1.id, startsAt: t.gWed3, endsAt: addMin(t.gWed3, 60), status: "SCHEDULED" },
      // GROUP Express (filled — "Sin cupos" demo)
      { id: ID.sessGFull, programId: progGrupalFull.id, coachId: coach1.id, startsAt: t.gFull, endsAt: addMin(t.gFull, 45), status: "SCHEDULED" },
      // PERSONAL_TRAINING — 3 weeks
      { id: ID.sessP1,    programId: progPersonal.id,   coachId: coach2.id, startsAt: t.p0,    endsAt: addMin(t.p0, 60),    status: "SCHEDULED" },
      { id: ID.sessP2,    programId: progPersonal.id,   coachId: coach2.id, startsAt: t.p1,    endsAt: addMin(t.p1, 60),    status: "SCHEDULED" },
      { id: ID.sessP3,    programId: progPersonal.id,   coachId: coach2.id, startsAt: t.p2,    endsAt: addMin(t.p2, 60),    status: "SCHEDULED" },
      // KINESIOLOGY
      { id: ID.sessK1,    programId: progKinesio.id,    coachId: coach1.id, startsAt: t.k0,    endsAt: addMin(t.k0, 45),    status: "SCHEDULED" },
    ],
    skipDuplicates: true,
  });

  const sessions = await prisma.session.findMany({ where: { id: { in: allSeedSessionIds } } });
  const sess = Object.fromEntries(sessions.map(s => [s.id, s]));
  console.log(`   ✓ ${sessions.length} sessions (4 sem GROUP Mon+Wed, 1 Express, 3 sem PT, 1 Kinesio)\n`);

  // ─── MemberCoach ──────────────────────────────────────────────────────────
  console.log("→ MemberCoach");
  const mcRelations = await Promise.all([
    prisma.memberCoach.upsert({
      where:  { id: ID.mcAnaMarisol },
      update: { memberId: mem1.id, coachId: coach2.id },
      create: { id: ID.mcAnaMarisol, memberId: mem1.id, coachId: coach2.id, serviceType: "PERSONAL_TRAINING", isActive: true },
    }),
    prisma.memberCoach.upsert({
      where:  { id: ID.mcCarlosFelipe },
      update: {},
      create: { id: ID.mcCarlosFelipe, memberId: mem2.id, coachId: coach1.id, serviceType: "KINESIOLOGY", isActive: true },
    }),
    prisma.memberCoach.upsert({
      where:  { id: ID.mcLuciaFelipe },
      update: { memberId: mem3.id, coachId: coach1.id },
      create: { id: ID.mcLuciaFelipe, memberId: mem3.id, coachId: coach1.id, serviceType: "GROUP", isActive: true },
    }),
    // evergara.ing@gmail.com — GROUP EXPIRED with real coach
    prisma.memberCoach.upsert({
      where:  { id: ID.mcSofiaFelipe },
      update: { memberId: mem4.id, coachId: coach1.id },
      create: { id: ID.mcSofiaFelipe, memberId: mem4.id, coachId: coach1.id, serviceType: "GROUP", isActive: true },
    }),
    // luciap@primaryperf.com — GROUP placeholder for "sin sesiones" demo (no real login)
    prisma.memberCoach.upsert({
      where:  { id: ID.mcLuciaPlaceholder },
      update: {},
      create: { id: ID.mcLuciaPlaceholder, memberId: luciaPlaceholder.id, coachId: coach1.id, serviceType: "GROUP", isActive: true },
    }),
  ]);
  console.log(`   ✓ ${mcRelations.length} member-coach relations\n`);

  // ─── Memberships ──────────────────────────────────────────────────────────
  console.log("→ Memberships");
  const memberships = await Promise.all([
    // Real PT MEMBER (laloosky): PT active — 8 sessions remaining
    prisma.membership.upsert({
      where:  { id: ID.membrAna },
      update: { memberId: mem1.id, planName: "Personal 10 sesiones", status: "ACTIVE", amount: 65000, paymentStatus: "PAID", startDate: new Date("2026-05-01"), endDate: new Date("2026-07-31"), grantType: "PURCHASED", grantedById: admin.id },
      create: {
        id: ID.membrAna, memberId: mem1.id,
        planName: "Personal 10 sesiones", serviceType: "PERSONAL_TRAINING",
        totalSessions: 10, usedSessions: 2,
        startDate: new Date("2026-05-01"), endDate: new Date("2026-07-31"),
        status: "ACTIVE", amount: 65000, paymentStatus: "PAID",
        grantType: "PURCHASED", grantedById: admin.id,
      },
    }),
    // Carlos: KINESIOLOGY active — 7 sessions remaining
    prisma.membership.upsert({
      where:  { id: ID.membrCarlos },
      update: { planName: "Kinesiología 8 sesiones", status: "ACTIVE", amount: 48000, paymentStatus: "PAID", startDate: new Date("2026-05-01"), endDate: new Date("2026-06-30"), grantType: "PURCHASED", grantedById: admin.id },
      create: {
        id: ID.membrCarlos, memberId: mem2.id,
        planName: "Kinesiología 8 sesiones", serviceType: "KINESIOLOGY",
        totalSessions: 8, usedSessions: 1,
        startDate: new Date("2026-05-01"), endDate: new Date("2026-06-30"),
        status: "ACTIVE", amount: 48000, paymentStatus: "PAID",
        grantType: "PURCHASED", grantedById: admin.id,
      },
    }),
    // Real MEMBER: GROUP active — expiring 2026-05-31 → shows "expiring soon" alert in Home
    prisma.membership.upsert({
      where:  { id: ID.membrLucia },
      update: { memberId: mem3.id, planName: "Grupal Mensual", status: "ACTIVE", amount: 25000, paymentStatus: "PENDING", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"), grantType: "PURCHASED", grantedById: admin.id },
      create: {
        id: ID.membrLucia, memberId: mem3.id,
        planName: "Grupal Mensual", serviceType: "GROUP",
        totalSessions: 20, usedSessions: 0,
        startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31"),
        status: "ACTIVE", amount: 25000, paymentStatus: "PENDING",
        grantType: "PURCHASED", grantedById: admin.id,
      },
    }),
    // Real EXPIRED MEMBER (evergara.ing@gmail.com): GROUP EXPIRED — demonstrates "membresía vencida" alert
    prisma.membership.upsert({
      where:  { id: ID.membrSofia },
      update: { memberId: mem4.id, planName: "Grupal Mensual", status: "EXPIRED", amount: 25000, paymentStatus: "PAID", startDate: new Date("2026-04-01"), endDate: new Date("2026-04-30"), grantType: "PURCHASED", grantedById: admin.id },
      create: {
        id: ID.membrSofia, memberId: mem4.id,
        planName: "Grupal Mensual", serviceType: "GROUP",
        totalSessions: 20, usedSessions: 8,
        startDate: new Date("2026-04-01"), endDate: new Date("2026-04-30"),
        status: "EXPIRED", amount: 25000, paymentStatus: "PAID",
        grantType: "PURCHASED", grantedById: admin.id,
      },
    }),
    // luciap@primaryperf.com: GROUP ACTIVE sin sesiones — demonstrates "no_sessions" alert (visible in admin panel)
    prisma.membership.upsert({
      where:  { id: ID.membrLuciaPlaceholder },
      update: { memberId: luciaPlaceholder.id, planName: "Grupal Mensual", status: "ACTIVE", amount: 25000, paymentStatus: "PAID", startDate: new Date("2026-05-01"), endDate: new Date("2026-06-30"), grantType: "PURCHASED", grantedById: admin.id },
      create: {
        id: ID.membrLuciaPlaceholder, memberId: luciaPlaceholder.id,
        planName: "Grupal Mensual", serviceType: "GROUP",
        totalSessions: 5, usedSessions: 5,
        startDate: new Date("2026-05-01"), endDate: new Date("2026-06-30"),
        status: "ACTIVE", amount: 25000, paymentStatus: "PAID",
        grantType: "PURCHASED", grantedById: admin.id,
      },
    }),
  ]);
  console.log(`   ✓ ${memberships.length} memberships\n`);

  // Clean up extra memberships for real accounts created during manual testing.
  // Each real account keeps only its seed membership so /profile shows cleanly.
  await prisma.membership.deleteMany({ where: { memberId: mem1.id, id: { not: ID.membrAna } } });
  await prisma.membership.deleteMany({ where: { memberId: mem2.id, id: { not: ID.membrCarlos } } });
  await prisma.membership.deleteMany({ where: { memberId: mem3.id, id: { not: ID.membrLucia } } });
  await prisma.membership.deleteMany({ where: { memberId: mem4.id,             id: { not: ID.membrSofia } } });
  await prisma.membership.deleteMany({ where: { memberId: luciaPlaceholder.id, id: { not: ID.membrLuciaPlaceholder } } });

  // ─── Bookings ─────────────────────────────────────────────────────────────
  // Sessions were deleted+recreated above, so their bookings were cascade-deleted.
  // Also clean up any non-seed bookings for real accounts from previous manual testing.
  await prisma.booking.deleteMany({ where: { memberId: mem1.id, sessionId: { notIn: allSeedSessionIds } } });
  await prisma.booking.deleteMany({ where: { memberId: mem3.id, sessionId: { notIn: allSeedSessionIds } } });
  await prisma.booking.deleteMany({ where: { memberId: mem4.id, sessionId: { notIn: allSeedSessionIds } } });
  // Recreate all bookings fresh.
  console.log("→ Bookings");
  await prisma.booking.createMany({
    data: [
      // Monday GROUP (sessGMon1, cap=15): anaPlaceholder + Carlos + Lucía → 3/15
      { id: ID.bookAnaGrupal,    sessionId: sess[ID.sessGMon1].id, memberId: anaPlaceholder.id, status: "CONFIRMED" },
      { id: ID.bookCarlosGrupal, sessionId: sess[ID.sessGMon1].id, memberId: mem2.id,           status: "CONFIRMED" },
      { id: ID.bookLuciaGrupal,  sessionId: sess[ID.sessGMon1].id, memberId: mem3.id,           status: "CONFIRMED" },
      // PT (sessP1, cap=1): laloosky booked → demonstrates PT session
      { id: ID.bookAnaPersonal,  sessionId: sess[ID.sessP1].id,    memberId: mem1.id, status: "CONFIRMED" },
      // KINESIOLOGY (sessK1, cap=1): Carlos booked
      { id: ID.bookCarlosKinesio,sessionId: sess[ID.sessK1].id,    memberId: mem2.id, status: "CONFIRMED" },
      // GROUP Express (sessGFull, cap=2): anaPlaceholder + Carlos → 2/2 → "Sin cupos" for GROUP demo
      { id: ID.bookGFullAna,     sessionId: sess[ID.sessGFull].id, memberId: anaPlaceholder.id, status: "CONFIRMED" },
      { id: ID.bookGFullCarlos,  sessionId: sess[ID.sessGFull].id, memberId: mem2.id,           status: "CONFIRMED" },
    ],
    skipDuplicates: true,
  });
  console.log("   ✓ 7 bookings\n");

  // ─── BookingInvitation ────────────────────────────────────────────────────
  // Clean up spurious PENDING invitations for real accounts from previous test runs.
  // Only the seed invitation (ID.invLuciaGrupal) should appear in /solicitudes.
  // Delete ALL non-seed invitations for real GROUP member — includes ACCEPTED/DECLINED/EXPIRED from test sessions
  await prisma.bookingInvitation.deleteMany({
    where: { memberId: mem3.id, id: { not: ID.invLuciaGrupal } },
  });
  await prisma.bookingInvitation.deleteMany({ where: { memberId: mem1.id, status: "PENDING" } });
  await prisma.bookingInvitation.deleteMany({ where: { memberId: mem4.id, status: "PENDING" } });

  // Real member gets PENDING invitation for sessGWed1 (GROUP Wednesday week 1)
  // → calendar shows chip "Invitado" + /solicitudes shows invitation
  console.log("→ BookingInvitations");
  await prisma.bookingInvitation.createMany({
    data: [
      {
        id:          ID.invLuciaGrupal,
        sessionId:   sess[ID.sessGWed1].id,
        memberId:    mem3.id,
        invitedById: coach1.id,
        status:      "PENDING",
        message:     "Te esperamos en el Funcional Grupal del miércoles",
      },
    ],
    skipDuplicates: true,
  });
  console.log("   ✓ 1 BookingInvitation PENDING (Lucía → Funcional Grupal Tarde)\n");

  // ─── Announcements ────────────────────────────────────────────────────────
  console.log("→ Announcements");
  const announcementSeeds = await Promise.all([
    prisma.announcement.upsert({
      where:  { id: ID.annPinned1 },
      update: {
        publishedAt:   new Date("2026-05-17T10:00:00"),
        linkUrl:       "https://www.instagram.com",
        linkLabel:     "Síguenos en Instagram",
        coverImageKey: "community",
      },
      create: {
        id:            ID.annPinned1,
        title:         "¡Bienvenidos a Primary Performance!",
        content:       "Inauguramos nuestra plataforma digital. Aquí encontrarás tu calendario de clases, reservas y toda la información del gimnasio. Cualquier consulta, escríbenos.",
        type:          "INFO",
        authorId:      admin.id,
        isPinned:      true,
        status:        "PUBLISHED",
        publishedAt:   new Date("2026-05-17T10:00:00"),
        linkUrl:       "https://www.instagram.com",
        linkLabel:     "Síguenos en Instagram",
        coverImageKey: "community",
      },
    }),
    prisma.announcement.upsert({
      where:  { id: ID.annPinned2 },
      update: {
        content:       "Próximamente sumamos talleres de movilidad y elongación al calendario de Primary Performance. Los talleres serán grupales, con cupos limitados de 6 personas. Si tienes interés, avísanos para coordinar el grupo y elegir el horario más conveniente para todos.",
        coverImageKey: "mobility",
      },
      create: {
        id:            ID.annPinned2,
        title:         "Taller de movilidad — junio 2026",
        content:       "Próximamente sumamos talleres de movilidad y elongación al calendario de Primary Performance. Los talleres serán grupales, con cupos limitados de 6 personas. Si tienes interés, avísanos para coordinar el grupo y elegir el horario más conveniente para todos.",
        type:          "EVENT",
        authorId:      admin.id,
        isPinned:      true,
        status:        "PUBLISHED",
        publishedAt:   new Date("2026-05-17T09:00:00"),
        coverImageKey: "mobility",
      },
    }),
    prisma.announcement.upsert({
      where:  { id: ID.annAlert1 },
      update: {
        content: "Las clases grupales del miércoles comenzarán a las 19:00 hrs en lugar de las 18:00 hrs. Este cambio se debe a una actividad especial en el espacio. Si ya tienes tu reserva confirmada, no necesitas hacer nada: tu lugar está asegurado. Para cualquier consulta, escríbenos con anticipación y te respondemos a la brevedad.",
      },
      create: {
        id:          ID.annAlert1,
        title:       "Cambio de horario — próximo miércoles",
        content:     "Las clases grupales del miércoles comenzarán a las 19:00 hrs en lugar de las 18:00 hrs. Este cambio se debe a una actividad especial en el espacio. Si ya tienes tu reserva confirmada, no necesitas hacer nada: tu lugar está asegurado. Para cualquier consulta, escríbenos con anticipación y te respondemos a la brevedad.",
        type:        "ALERT",
        authorId:    admin.id,
        isPinned:    false,
        status:      "PUBLISHED",
        publishedAt: new Date("2026-05-15T10:00:00"),
      },
    }),
    prisma.announcement.upsert({
      where:  { id: ID.annInfo1 },
      update: {},
      create: {
        id:          ID.annInfo1,
        title:       null,
        content:     "Recuerden traer su toalla y botella de agua. El estacionamiento está disponible a partir de las 7:30 hrs.",
        type:        "INFO",
        authorId:    coach1.id,
        isPinned:    false,
        status:      "PUBLISHED",
        publishedAt: new Date("2026-05-16T08:00:00"),
      },
    }),
  ]);
  console.log(`   ✓ ${announcementSeeds.length} announcements\n`);

  // ─── Health Module ────────────────────────────────────────────────────────
  console.log("→ Health module (kinesiologist + records + sessions + restrictions)");

  const kine = await prisma.user.upsert({
    where:  { email: "kine@primaryperf.com" },
    update: { name: "Valentina Reyes", role: "KINESIOLOGIST", isActive: true },
    create: { email: "kine@primaryperf.com", name: "Valentina Reyes", role: "KINESIOLOGIST", isActive: true },
  });

  await prisma.memberCoach.upsert({
    where:  { id: ID.mcKineCarlos },
    update: { isActive: true },
    create: { id: ID.mcKineCarlos, memberId: mem2.id, coachId: kine.id, serviceType: "KINESIOLOGY", isActive: true },
  });
  await prisma.memberCoach.upsert({
    where:  { id: ID.mcKineLucia },
    update: { isActive: true },
    create: { id: ID.mcKineLucia, memberId: mem3.id, coachId: kine.id, serviceType: "KINESIOLOGY", isActive: true },
  });

  await prisma.membership.upsert({
    where:  { id: ID.membrLuciaKine },
    update: {},
    create: {
      id: ID.membrLuciaKine, memberId: mem3.id,
      planName: "Kinesiología 6 sesiones", serviceType: "KINESIOLOGY",
      totalSessions: 6, usedSessions: 2,
      startDate: new Date("2026-05-15"), endDate: new Date("2026-07-15"),
      status: "ACTIVE", amount: 36000, paymentStatus: "PAID",
      grantType: "PURCHASED", grantedById: admin.id,
    },
  });

  const [hrCarlos, hrLucia] = await Promise.all([
    prisma.healthRecord.upsert({
      where:  { patientId: mem2.id },
      update: {},
      create: {
        id: ID.hrCarlos,
        patientId: mem2.id, createdById: kine.id,
        birthDate: new Date("1990-03-15"), biologicalSex: "Masculino", occupation: "Ingeniero",
        reasonForConsult: "Dolor lumbar crónico con irradiación a pierna derecha",
        medicalBackground: "Hernia discal L4-L5 diagnosticada 2024",
        surgeries: "Ninguna", currentMedication: "Ibuprofeno 400mg SOS",
        allergies: "Sin alergias conocidas", painLevel: 6,
        initialAssessment: "Paciente refiere dolor lumbar 6/10 de 6 meses de evolución. Limitación de movilidad en flexión anterior.",
        diagnosis: "Síndrome facetario L4-L5 con componente muscular",
        treatmentGoals: "Reducir dolor a 2/10 en 8 semanas.",
        internalNotes: "Paciente motivado. Revisar ergonomía laboral.",
      },
    }),
    prisma.healthRecord.upsert({
      where:  { patientId: mem3.id },
      update: {},
      create: {
        id: ID.hrLucia,
        patientId: mem3.id, createdById: kine.id,
        birthDate: new Date("1995-08-22"), biologicalSex: "Femenino", occupation: "Profesora",
        reasonForConsult: "Tendinitis de hombro derecho post-actividad deportiva",
        medicalBackground: "Sin antecedentes relevantes",
        surgeries: "Ninguna", currentMedication: "Ninguno",
        allergies: "Alergia a AINES", painLevel: 4,
        initialAssessment: "Dolor 4/10 en hombro derecho al elevar el brazo. Arco doloroso entre 60-120°.",
        diagnosis: "Tendinitis del manguito rotador — supraespinoso derecho",
        treatmentGoals: "Recuperar movilidad completa del hombro. Retorno al deporte en 6 semanas.",
        internalNotes: "Coordinar con coach Felipe para adaptar clases grupales.",
      },
    }),
  ]);

  const nowMs = Date.now();
  await Promise.all([
    prisma.healthSession.upsert({
      where:  { id: ID.hsCar1 },
      update: {},
      create: {
        id: ID.hsCar1, healthRecordId: hrCarlos.id, patientId: mem2.id, kinesiologistId: kine.id,
        sessionDate: new Date(nowMs - 14 * 86400_000),
        subjective: "Refiere dolor 7/10 al inclinarse.", objective: "Limitación flexión lumbar 50%.",
        assessment: "Inicio de tratamiento.", plan: "Termoterapia + masoterapia.",
        exercises: "Gato-camello 3x10. Puente glúteo 3x15.",
        patientNotes: "Realiza los ejercicios 2 veces al día. El calor local antes ayuda.", status: "CLOSED",
      },
    }),
    prisma.healthSession.upsert({
      where:  { id: ID.hsCar2 },
      update: {},
      create: {
        id: ID.hsCar2, healthRecordId: hrCarlos.id, patientId: mem2.id, kinesiologistId: kine.id,
        sessionDate: new Date(nowMs - 7 * 86400_000),
        subjective: "Mejoría notable. Dolor 4/10.", objective: "Flexión lumbar 70%.",
        assessment: "Buena evolución.", plan: "Agregar fortalecimiento de core.",
        exercises: "Dead bug 3x10. Plancha lateral 3x20seg.",
        patientNotes: "Excelente avance. Agrega el dead bug a tu rutina.", status: "CLOSED",
      },
    }),
    prisma.healthSession.upsert({
      where:  { id: ID.hsCar3 },
      update: {},
      create: {
        id: ID.hsCar3, healthRecordId: hrCarlos.id, patientId: mem2.id, kinesiologistId: kine.id,
        sessionDate: new Date(nowMs), subjective: "Dolor 3/10 hoy. Realizó ejercicios todos los días.", status: "OPEN",
      },
    }),
    prisma.healthSession.upsert({
      where:  { id: ID.hsLuc1 },
      update: {},
      create: {
        id: ID.hsLuc1, healthRecordId: hrLucia.id, patientId: mem3.id, kinesiologistId: kine.id,
        sessionDate: new Date(nowMs - 10 * 86400_000),
        subjective: "Dolor 5/10 al levantar el brazo.", objective: "Arco doloroso 60-120°. Fuerza 4/5.",
        assessment: "Inflamación activa.", plan: "Crioterapia + control motor.",
        exercises: "Péndulo de Codman 5min. Rotación externa con banda 3x15.",
        patientNotes: "Aplica hielo 15 minutos post-sesión. Evita levantar peso sobre la cabeza.", status: "CLOSED",
      },
    }),
    prisma.healthSession.upsert({
      where:  { id: ID.hsLuc2 },
      update: {},
      create: {
        id: ID.hsLuc2, healthRecordId: hrLucia.id, patientId: mem3.id, kinesiologistId: kine.id,
        sessionDate: new Date(nowMs - 4 * 86400_000),
        subjective: "Mejora. Dolor 3/10. Ya eleva el brazo a 140°.", objective: "Arco doloroso reducido.",
        assessment: "Evolución favorable.", plan: "Fortalecimiento progresivo.",
        exercises: "Press frontal con banda liviana 3x12.",
        patientNotes: "Puedes retomar clases de grupo sin ejercicios con carga sobre la cabeza.", status: "CLOSED",
      },
    }),
    prisma.healthSession.upsert({
      where:  { id: ID.hsLuc3 },
      update: {},
      create: {
        id: ID.hsLuc3, healthRecordId: hrLucia.id, patientId: mem3.id, kinesiologistId: kine.id,
        sessionDate: new Date(nowMs),
        subjective: "En la última clase grupal notó molestia leve al hacer burpees.", status: "OPEN",
      },
    }),
    prisma.healthRestriction.upsert({
      where:  { id: ID.resCar1 },
      update: {},
      create: { id: ID.resCar1, healthRecordId: hrCarlos.id, patientId: mem2.id, createdById: kine.id, label: "Evitar impacto lumbar", severity: "WARNING", isActive: true, startDate: new Date("2026-05-15") },
    }),
    prisma.healthRestriction.upsert({
      where:  { id: ID.resCar2 },
      update: {},
      create: { id: ID.resCar2, healthRecordId: hrCarlos.id, patientId: mem2.id, createdById: kine.id, label: "Precaución en flexión de tronco", severity: "INFO", isActive: true, startDate: new Date("2026-05-15") },
    }),
    prisma.healthRestriction.upsert({
      where:  { id: ID.resLuc1 },
      update: {},
      create: { id: ID.resLuc1, healthRecordId: hrLucia.id, patientId: mem3.id, createdById: kine.id, label: "Sin carga sobre la cabeza", severity: "WARNING", isActive: true, startDate: new Date("2026-05-20") },
    }),
    prisma.healthRestriction.upsert({
      where:  { id: ID.resLuc2 },
      update: {},
      create: { id: ID.resLuc2, healthRecordId: hrLucia.id, patientId: mem3.id, createdById: kine.id, label: "Alergia a AINES", severity: "CRITICAL", isActive: true, startDate: new Date("2026-05-15") },
    }),
  ]);
  console.log("   ✓ 1 kinesiologist + 2 health records + 6 sessions + 4 restrictions\n");

  console.log("✅ Seed completado.");
  console.log("   Cuentas con login Google real:");
  console.log("     ADMIN:  lalopeluuza01@gmail.com");
  console.log("     COACH:  primary.coach.test@gmail.com   (sesiones GROUP + KINESIO)");
  console.log("     MEMBER: performanceprimary.task@gmail.com  (GROUP, Reservada/Invitado/Disponible/Sin cupos)");
  console.log("     MEMBER: laloosky@gmail.com              (PT ACTIVE, sesión PT reservada)");
  console.log("     MEMBER: evergara.ing@gmail.com          (GROUP EXPIRED, alerta membresía vencida)");
  console.log("   Placeholders @primaryperf.com: datos de relleno, sin cuenta Google real");
  console.log("     KINESIOLOGIST: kine@primaryperf.com    (Valentina Reyes — 2 pacientes, fichas + sesiones)");
  console.log("   Abre Prisma Studio con: npx prisma studio");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
