# Estado actual - Primary Performance

Fase actual: Fase 6 (persistencia + auth)

## Checkpoints

### CP1 ✅ Completado (sesión anterior)
- Dependencias instaladas: prisma@7.8.0, @prisma/client, next-auth@beta, tsx
- prisma/schema.prisma creado y validado

### CP2 ✅ Cerrado (2026-05-12)

#### Task 4 ✅ — prisma db push exitoso
- DIRECT_URL (Session pooler, 5432) en prisma.config.ts para Prisma CLI
- DATABASE_URL (Transaction pooler, 6543) para runtime de la app
- Todas las tablas creadas en Supabase: User, MemberCoach, Program, Session, Booking, Membership

#### Task 5 ✅ — PrismaClient singleton
- Archivo: src/lib/prisma.ts
- Usa @prisma/adapter-pg con DATABASE_URL en runtime
- Patrón globalForPrisma para hot reload en dev

#### Task 6 ✅ — NextAuth Google OAuth con JWT sessions
- Archivo: src/auth.ts
- Provider: Google
- Strategy: JWT (sin PrismaAdapter, sin tabla Session de NextAuth)
- signIn callback: upsert en User por email (name, image, isActive, role=MEMBER)
- jwt callback: agrega id y role al token desde DB
- session callback: expone id, email, name, image, role en session.user
- Route handler: src/app/api/auth/[...nextauth]/route.ts
- Tipos extendidos: src/types/next-auth.d.ts

#### Validación CP2
- Usuario validado: lalopeluuza01@gmail.com
- role: MEMBER ✅
- isActive: true ✅
- session.user expone id, email, name, image, role ✅
- Endpoint dev temporal: GET /api/auth/session-test

## Próximo paso

Task 7: proxy.ts — protección de rutas (middleware en Next.js 16 se llama proxy.ts)

## Advertencias antes de producción

- NODE_TLS_REJECT_UNAUTHORIZED=0 en el script dev (package.json) — SOLO para desarrollo local.
  Debe eliminarse o restringirse antes de cualquier deploy a producción.
- El endpoint /api/auth/session-test devuelve 404 en producción (guard implementado).

## Decisiones clave confirmadas
- Booking usa sessionId obligatorio
- Modelo: Program → Session → Booking
- MemberCoach reemplaza assignedCoachId
- JWT sessions en NextAuth (evita colisión con modelo Session de negocio)
- Sin PrismaAdapter
- prisma.config.ts usa DIRECT_URL para CLI; prisma.ts usa DATABASE_URL para runtime

## Reglas
- No agregar features fuera de Fase 6
- No tocar UI innecesariamente
- No sobrediseñar
