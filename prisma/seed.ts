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
  progGrupalMon: "seed_prog_grupal_mon",
  progGrupalWed: "seed_prog_grupal_wed",
  progPersonal:  "seed_prog_personal",
  progKinesio:   "seed_prog_kinesio",

  // Sessions — week of 2026-05-18 and 2026-05-25
  sessGMon1: "seed_sess_g_mon1",
  sessGWed1: "seed_sess_g_wed1",
  sessP1:    "seed_sess_p_1",
  sessK1:    "seed_sess_k_1",
  sessGMon2: "seed_sess_g_mon2",
  sessGWed2: "seed_sess_g_wed2",

  // MemberCoach
  mcAnaMarisol:   "seed_mc_ana_marisol",
  mcCarlosFelipe: "seed_mc_carlos_felipe",
  mcLuciaFelipe:  "seed_mc_lucia_felipe",

  // Memberships
  membrAna:    "seed_membr_ana",
  membrCarlos: "seed_membr_carlos",
  membrLucia:  "seed_membr_lucia",

  // Bookings
  bookAnaGrupal:     "seed_book_ana_grupal",
  bookCarlosGrupal:  "seed_book_carlos_grupal",
  bookLuciaGrupal:   "seed_book_lucia_grupal",
  bookAnaPersonal:   "seed_book_ana_personal",
  bookCarlosKinesio: "seed_book_carlos_kinesio",
};

async function main() {
  console.log("🌱 Iniciando seed...\n");

  // ─── Users ────────────────────────────────────────────────────────────────
  // Upsert by email → never duplicates, never touches real Google users
  console.log("→ Users");

  // Dev admin — real Google account, must survive DB resets
  await prisma.user.upsert({
    where:  { email: "lalopeluuza01@gmail.com" },
    update: { name: "Eduardo Vergara Alvarado", role: "ADMIN", isActive: true },
    create: { email: "lalopeluuza01@gmail.com", name: "Eduardo Vergara Alvarado", role: "ADMIN", isActive: true },
  });

  const [admin, coach1, coach2, mem1, mem2, mem3] = await Promise.all([
    prisma.user.upsert({
      where:  { email: "admin@primaryperf.com" },
      update: { name: "Admin PP", role: "ADMIN", isActive: true },
      create: { email: "admin@primaryperf.com", name: "Admin PP", role: "ADMIN", isActive: true },
    }),
    // coach1: Felipe — grupo + kinesio
    prisma.user.upsert({
      where:  { email: "felipesoto@primaryperf.com" },
      update: { name: "Felipe Soto", role: "COACH", isActive: true },
      create: { email: "felipesoto@primaryperf.com", name: "Felipe Soto", role: "COACH", isActive: true },
    }),
    // coach2: Marisol — personal training
    prisma.user.upsert({
      where:  { email: "marisolv@primaryperf.com" },
      update: { name: "Marisol Vega", role: "COACH", isActive: true },
      create: { email: "marisolv@primaryperf.com", name: "Marisol Vega", role: "COACH", isActive: true },
    }),
    prisma.user.upsert({
      where:  { email: "ana@primaryperf.com" },
      update: { name: "Ana García", isActive: true },
      create: { email: "ana@primaryperf.com", name: "Ana García", role: "MEMBER", isActive: true },
    }),
    prisma.user.upsert({
      where:  { email: "carlosl@primaryperf.com" },
      update: { name: "Carlos López", isActive: true },
      create: { email: "carlosl@primaryperf.com", name: "Carlos López", role: "MEMBER", isActive: true },
    }),
    prisma.user.upsert({
      where:  { email: "luciap@primaryperf.com" },
      update: { name: "Lucía Pérez", isActive: true },
      create: { email: "luciap@primaryperf.com", name: "Lucía Pérez", role: "MEMBER", isActive: true },
    }),
  ]);
  console.log(`   ✓ 6 users (${[admin, coach1, coach2].map(u => u.name).join(", ")}, ...)\n`);

  // ─── Programs ─────────────────────────────────────────────────────────────
  console.log("→ Programs");
  const [progGrupalMon, progGrupalWed, progPersonal, progKinesio] = await Promise.all([
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
  console.log("   ✓ 4 programs\n");

  // ─── Sessions ─────────────────────────────────────────────────────────────
  console.log("→ Sessions");
  const sessions = await Promise.all([
    // Week 1 — 2026-05-18
    prisma.session.upsert({
      where:  { id: ID.sessGMon1 },
      update: {},
      create: {
        id: ID.sessGMon1,
        programId: progGrupalMon.id,
        coachId:   coach1.id,
        startsAt:  new Date("2026-05-18T08:00:00"),
        endsAt:    new Date("2026-05-18T09:00:00"),
        status:    "SCHEDULED",
      },
    }),
    prisma.session.upsert({
      where:  { id: ID.sessGWed1 },
      update: {},
      create: {
        id: ID.sessGWed1,
        programId: progGrupalWed.id,
        coachId:   coach1.id,
        startsAt:  new Date("2026-05-20T18:00:00"),
        endsAt:    new Date("2026-05-20T19:00:00"),
        status:    "SCHEDULED",
      },
    }),
    prisma.session.upsert({
      where:  { id: ID.sessP1 },
      update: {},
      create: {
        id: ID.sessP1,
        programId: progPersonal.id,
        coachId:   coach2.id,
        startsAt:  new Date("2026-05-19T10:00:00"),
        endsAt:    new Date("2026-05-19T11:00:00"),
        status:    "SCHEDULED",
      },
    }),
    prisma.session.upsert({
      where:  { id: ID.sessK1 },
      update: {},
      create: {
        id: ID.sessK1,
        programId: progKinesio.id,
        coachId:   coach1.id,
        startsAt:  new Date("2026-05-19T11:00:00"),
        endsAt:    new Date("2026-05-19T11:45:00"),
        status:    "SCHEDULED",
      },
    }),
    // Week 2 — 2026-05-25
    prisma.session.upsert({
      where:  { id: ID.sessGMon2 },
      update: {},
      create: {
        id: ID.sessGMon2,
        programId: progGrupalMon.id,
        coachId:   coach1.id,
        startsAt:  new Date("2026-05-25T08:00:00"),
        endsAt:    new Date("2026-05-25T09:00:00"),
        status:    "SCHEDULED",
      },
    }),
    prisma.session.upsert({
      where:  { id: ID.sessGWed2 },
      update: {},
      create: {
        id: ID.sessGWed2,
        programId: progGrupalWed.id,
        coachId:   coach1.id,
        startsAt:  new Date("2026-05-27T18:00:00"),
        endsAt:    new Date("2026-05-27T19:00:00"),
        status:    "SCHEDULED",
      },
    }),
  ]);
  console.log("   ✓ 6 sessions (semanas 2026-05-18 y 2026-05-25)\n");

  // ─── MemberCoach ──────────────────────────────────────────────────────────
  console.log("→ MemberCoach");
  const mcRelations = await Promise.all([
    prisma.memberCoach.upsert({
      where:  { id: ID.mcAnaMarisol },
      update: {},
      create: {
        id:          ID.mcAnaMarisol,
        memberId:    mem1.id,
        coachId:     coach2.id,
        serviceType: "PERSONAL_TRAINING",
        isActive:    true,
      },
    }),
    prisma.memberCoach.upsert({
      where:  { id: ID.mcCarlosFelipe },
      update: {},
      create: {
        id:          ID.mcCarlosFelipe,
        memberId:    mem2.id,
        coachId:     coach1.id,
        serviceType: "KINESIOLOGY",
        isActive:    true,
      },
    }),
    prisma.memberCoach.upsert({
      where:  { id: ID.mcLuciaFelipe },
      update: {},
      create: {
        id:          ID.mcLuciaFelipe,
        memberId:    mem3.id,
        coachId:     coach1.id,
        serviceType: "GROUP",
        isActive:    true,
      },
    }),
  ]);
  console.log(`   ✓ ${mcRelations.length} member-coach relations\n`);

  // ─── Memberships ──────────────────────────────────────────────────────────
  console.log("→ Memberships");
  const memberships = await Promise.all([
    prisma.membership.upsert({
      where:  { id: ID.membrAna },
      update: { planName: "Personal 10 sesiones", status: "ACTIVE", amount: 65000, paymentStatus: "PAID", startDate: new Date("2026-05-01"), endDate: new Date("2026-07-31") },
      create: {
        id:            ID.membrAna,
        memberId:      mem1.id,
        planName:      "Personal 10 sesiones",
        serviceType:   "PERSONAL_TRAINING",
        totalSessions: 10,
        usedSessions:  2,
        startDate:     new Date("2026-05-01"),
        endDate:       new Date("2026-07-31"),
        status:        "ACTIVE",
        amount:        65000,
        paymentStatus: "PAID",
      },
    }),
    prisma.membership.upsert({
      where:  { id: ID.membrCarlos },
      update: { planName: "Kinesiología 8 sesiones", status: "ACTIVE", amount: 48000, paymentStatus: "PAID", startDate: new Date("2026-05-01"), endDate: new Date("2026-06-30") },
      create: {
        id:            ID.membrCarlos,
        memberId:      mem2.id,
        planName:      "Kinesiología 8 sesiones",
        serviceType:   "KINESIOLOGY",
        totalSessions: 8,
        usedSessions:  1,
        startDate:     new Date("2026-05-01"),
        endDate:       new Date("2026-06-30"),
        status:        "ACTIVE",
        amount:        48000,
        paymentStatus: "PAID",
      },
    }),
    prisma.membership.upsert({
      where:  { id: ID.membrLucia },
      update: { planName: "Grupal Mensual", status: "ACTIVE", amount: 25000, paymentStatus: "PENDING", startDate: new Date("2026-05-01"), endDate: new Date("2026-05-31") },
      create: {
        id:            ID.membrLucia,
        memberId:      mem3.id,
        planName:      "Grupal Mensual",
        serviceType:   "GROUP",
        totalSessions: 20,
        usedSessions:  0,
        startDate:     new Date("2026-05-01"),
        endDate:       new Date("2026-05-31"),
        status:        "ACTIVE",
        amount:        25000,
        paymentStatus: "PENDING",
      },
    }),
  ]);
  console.log(`   ✓ ${memberships.length} memberships\n`);

  // ─── Bookings ─────────────────────────────────────────────────────────────
  console.log("→ Bookings");
  const bookings = await Promise.all([
    // 3 members → Funcional Grupal Lun (semana 1)
    prisma.booking.upsert({
      where:  { id: ID.bookAnaGrupal },
      update: {},
      create: { id: ID.bookAnaGrupal, sessionId: sessions[0].id, memberId: mem1.id, status: "CONFIRMED" },
    }),
    prisma.booking.upsert({
      where:  { id: ID.bookCarlosGrupal },
      update: {},
      create: { id: ID.bookCarlosGrupal, sessionId: sessions[0].id, memberId: mem2.id, status: "CONFIRMED" },
    }),
    prisma.booking.upsert({
      where:  { id: ID.bookLuciaGrupal },
      update: {},
      create: { id: ID.bookLuciaGrupal, sessionId: sessions[0].id, memberId: mem3.id, status: "CONFIRMED" },
    }),
    // Personal Training — Ana
    prisma.booking.upsert({
      where:  { id: ID.bookAnaPersonal },
      update: {},
      create: { id: ID.bookAnaPersonal, sessionId: sessions[2].id, memberId: mem1.id, status: "CONFIRMED" },
    }),
    // Kinesiología — Carlos
    prisma.booking.upsert({
      where:  { id: ID.bookCarlosKinesio },
      update: {},
      create: { id: ID.bookCarlosKinesio, sessionId: sessions[3].id, memberId: mem2.id, status: "CONFIRMED" },
    }),
  ]);
  console.log(`   ✓ ${bookings.length} bookings\n`);

  // ─── Optional: Google MEMBER for local validation (TEST_MEMBER_EMAIL in .env.local) ──
  const testMemberEmail = process.env.TEST_MEMBER_EMAIL;
  if (testMemberEmail) {
    console.log("→ Test MEMBER (TEST_MEMBER_EMAIL)");
    const testMember = await prisma.user.upsert({
      where:  { email: testMemberEmail },
      update: { name: "Miembro Test", role: "MEMBER", isActive: true },
      create: { email: testMemberEmail, name: "Miembro Test", role: "MEMBER", isActive: true },
    });
    await prisma.membership.upsert({
      where:  { id: "seed_membr_google_test_member" },
      update: {
        memberId:      testMember.id,
        planName:      "Grupal Mensual Test",
        serviceType:   "GROUP",
        totalSessions: null,
        usedSessions:  0,
        startDate:     new Date("2026-05-01"),
        endDate:       new Date("2026-07-31"),
        status:        "ACTIVE",
        amount:        0,
        paymentStatus: "PAID",
      },
      create: {
        id:            "seed_membr_google_test_member",
        memberId:      testMember.id,
        planName:      "Grupal Mensual Test",
        serviceType:   "GROUP",
        totalSessions: null,
        usedSessions:  0,
        startDate:     new Date("2026-05-01"),
        endDate:       new Date("2026-07-31"),
        status:        "ACTIVE",
        amount:        0,
        paymentStatus: "PAID",
      },
    });
    console.log(`   ✓ Test MEMBER creado: ${testMemberEmail}\n`);
  }

  console.log("✅ Seed completado — 28 registros en 6 tablas (+ test member si TEST_MEMBER_EMAIL definido).");
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
