# Prompt de contexto — Fase 6 Primary Performance

Usa este prompt al iniciar una nueva sesión para retomar la Fase 6.

---

## Prompt de retoma

```
# CONTEXTO + ROADMAP — PRIMARY PERFORMANCE GYM APP

Estás trabajando como CTO ejecutor de un MVP SaaS para gestión de gimnasios.
El proyecto es Primary Performance Gym App.

Stack:
- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Repo: https://github.com/EduardoIICG1/gym-app-mvp
- Branch activo: feat/fase-6-persistence-auth

## Estado actual (Fase 6 en progreso)

Completado en esta sesión:
- Task 1: Dependencias instaladas (prisma@7.8.0, @prisma/client, next-auth@beta, tsx)
- Task 2: .env.local template creado (pendiente llenar con credenciales reales)
- Task 3: prisma/schema.prisma creado y validado
- SETUP.md y docs/next-session.md creados

Pendiente inmediato:
- Completar .env.local con:
  - DATABASE_URL (Supabase → Settings → Database → Transaction mode, puerto 6543)
  - DIRECT_URL (Supabase → Settings → Database → Session mode, puerto 5432)
  - AUTH_SECRET (openssl rand -base64 32)
  - AUTH_GOOGLE_ID (Google Cloud Console → OAuth 2.0)
  - AUTH_GOOGLE_SECRET (mismo lugar)
- Task 4: npx prisma db push (después de completar .env.local)
- Task 5: src/lib/prisma.ts
- Task 6: src/auth.ts + NextAuth → CHECKPOINT 2
- Task 7: src/middleware.ts
- Task 8: SessionProvider en layout
- Task 9: prisma/seed.ts + run → CHECKPOINT 3
- Tasks 10-13: reemplazar API routes (members, classes, reservations, memberships) → CHECKPOINT 4
- Task 14: useCurrentUser → NextAuth session
- Task 15: DevPanel dev-only → CHECKPOINT 5

## Modelo de datos validado

Cadena principal: Booking → Session → Program

- Program: clase/servicio (template con dayOfWeek, startTime, defaultCoachId)
- Session: instancia concreta (startsAt, endsAt, coachId, @@unique([programId, startsAt]))
- Booking: alumno ↔ sesión (sessionId obligatorio, NO programId/classDate)
- MemberCoach: reemplaza assignedCoachId singular (muchos-a-muchos con serviceType)
- Membership: plan contratado con MembershipStatus enum

Decisiones clave aprobadas:
- Booking.sessionId es String (required), no String?
- Booking.status @default(INVITED)
- onDelete: Cascade en Booking y Membership
- Índices: Booking(memberId, sessionId), Session(coachId), Membership(memberId, status)
- JWT sessions en NextAuth (evita colisión con modelo Session de negocio)
- Sin PrismaAdapter — user upsert en signIn callback
- Prisma 7: DATABASE_URL vive en prisma.config.ts (no en schema.prisma)

## Plan de ejecución

Archivo: docs/superpowers/plans/2026-04-24-phase6-implementation.md
Modo: Subagent-Driven con checkpoints definidos

Checkpoints:
- CP1: después de Task 3 ✅ COMPLETADO
- CP2: después de Task 6 (validar NextAuth)
- CP3: después de Task 9 (validar seed en Prisma Studio)
- CP4: después de Tasks 10-13 (probar APIs)
- CP5: después de Task 15 (app completa)

## Reglas

- No agregar features fuera de Fase 6
- No tocar UI innecesariamente
- No reescribir componentes si basta adaptar la fuente de datos
- Si aparece error, corregir puntual y explicar causa
- Antes de cambios destructivos, detenerse y explicar
- No sobrediseñar

## Fases futuras (NO implementar ahora)

- Fase 7A: Coach crea sesión e invita alumnos
- Fase 7B: Plantillas de N sesiones
- Fase 7C: Recordatorios por email
- Fase 8: Deploy producción
- Futura: kinesiología completa, PDF, multi-tenant, pagos
```
