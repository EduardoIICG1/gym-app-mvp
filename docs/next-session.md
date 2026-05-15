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

### CP3 ✅ Cerrado (2026-05-14)

#### Task 7 ✅ — Middleware: protección de rutas
- Archivo: src/middleware.ts (deprecated name — proxy.ts tiene bug con Turbopack)
- Rutas privadas protegidas; /api/auth/* y assets estáticos excluidos
- Usuarios no autenticados redirigen a /api/auth/signin con callbackUrl

#### Task 8 ✅ — SessionProvider en layout
- Archivo: src/components/Providers.tsx
- SessionProvider envuelve toda la app en src/app/layout.tsx

#### Task 9 ✅ — Seed idempotente
- Archivo: prisma/seed.ts
- 28 registros en 6 tablas (stable seed_* IDs + upsert por email para users)
- DB reseteada: sin datos legacy
- lalopeluuza01@gmail.com incluido como ADMIN para sobrevivir futuros resets

#### Fix auth ✅ — Login restringido a usuarios pre-registrados
- src/auth.ts: signIn callback reemplaza upsert con findUnique + validación
- Si email no existe en DB → AccessDenied
- Si isActive=false → AccessDenied
- Solo actualiza name/image desde Google; no crea usuarios nuevos
- Decisión de producto: User.isActive controla acceso; Membership.status controlará reservas

### CP4 — En progreso

#### Task 10 ✅ — /api/members usa Prisma real
- Archivos: src/app/api/members/route.ts, src/app/api/members/[id]/route.ts
- GET: consulta real a DB con memberRelations incluidas; mapping DB enum → frontend type
- POST: crea User en DB + MemberCoach si hay coach + servicios
- PUT: actualiza User; actualiza MemberCoach solo para usuarios MEMBER
- Compatibilidad mantenida con el frontend anterior (mismo shape de Member)
- Campos legacy no persistidos (sin schema en DB): notes, canBookMakeupClasses, makeupCredits
- Validación frontend: 7 usuarios desde DB, roles/status/contractedServices correctos

#### Tasks 11+12 ✅ — /api/classes y /api/reservations usan Prisma real
- Archivos: src/app/api/classes/route.ts, src/app/api/classes/[id]/route.ts
- Archivos: src/app/api/reservations/route.ts, src/app/api/reservations/[id]/route.ts
- Calendar: src/app/calendar/page.tsx

**Classes:**
- GET acepta ?weekStart=YYYY-MM-DD → filtra Session.startsAt dentro de esa semana
- Sin weekStart → devuelve sesiones desde hoy en adelante (para /classes view)
- Response: id=session.id, dayOfWeek/startTime desde Program, reservedCount desde Booking count
- PUT actualiza Program + Session; DELETE cancela Session + sus Bookings
- POST crea Program + Session para la semana actual

**Reservations:**
- GET con ?userId retorna Bookings del usuario autenticado (ignora el valor del param — fix de seguridad)
- GET con ?classId retorna todos los Bookings de esa Session (para vista admin)
- POST crea Booking usando sessionId = classId; usa auth session, no el userId del cliente
- DELETE cancela Booking (status=CANCELLED, no elimina el registro)
- PATCH actualiza Booking.status según attendanceStatus (ATTENDED/ABSENT/CONFIRMED)

**Decisión de contrato:** classId en frontend = session.id en DB. Eliminado uso de programId+classDate.

**Bugs corregidos:**
- Race condition en calendario: fetchVersionRef — descarta respuestas de fetches anteriores si llegaron tarde
- Reserva no visible: GET reservations usa auth session real; isReserved ya no requiere studentId === mockId

**Pendiente futuro:** selector de fecha/mes en el rango semanal del calendario.

#### Task 13 ✅ — /api/memberships usa Prisma real
- Archivos: src/app/api/memberships/route.ts, src/app/api/memberships/[id]/route.ts
- Schema: Membership ahora incluye amount (Int), paymentStatus (enum PaymentStatus), updatedAt (@updatedAt)
- GET: consulta real con join a User (studentName, studentEmail); filters: status, studentId, plan (contains)
- POST: crea Membership real con validación de duplicado activo por servicio/período
- PUT: persiste amount, paymentStatus, membershipStatus, startDate, endDate
- Cancelar membresía = soft-delete vía status=CANCELLED (no borrado físico)
- paymentStatus: PAID | PENDING | OVERDUE (mapeado desde/hacia frontend)
- amount: Int en CLP (0 por defecto; persiste lo que envía el frontend)
- updatedAt cambia automáticamente en cada update
- Membership guarda estado vigente, no historial de cambios

**Backlog futuro (no implementar todavía):**
- MembershipHistory o AuditLog para trazabilidad de cambios de membresía (changedBy, previousStatus, reason, etc.)
- Bloqueo de reservas si membresía del servicio está EXPIRED
- Alerta amarilla en perfil del alumno con membresía vencida
- Integración de pagos, facturación

#### CP4 ✅ Cerrado (2026-05-14)
Tasks 10, 11, 12 y 13 completadas. Todas las APIs principales (/api/members, /api/classes, /api/reservations, /api/memberships) usan Prisma real.

### CP5 — En progreso

#### Task 14 ✅ — useCurrentUser usa sesión real de NextAuth

- `src/lib/useCurrentUser.ts`: reemplaza mock con `useSession()` de next-auth/react
- `id`, `name`, `email`, `role` vienen del JWT real; nunca de datos hardcodeados
- `user-123` eliminado de toda lógica activa (solo queda en mock-data como dato de ejemplo)
- `MOCK_USER_ID` eliminado de calendar, classes, profile y admin/members
- `_callerRole` eliminado del frontend; el servidor usa `auth()` como fuente de verdad
- DevPanel role override (localStorage) se mantiene para dev tooling, pero no afecta APIs
- JWT stale tras cambio de rol → requiere sign out + sign in para refrescar token
- `/profile` ya no muestra IDs técnicos de sesión (e.g. "Clase #seed_sess_g_mon1")
  → Ahora muestra nombre real del programa (e.g. "Funcional Grupal Mañana") + fecha + hora
  → `/api/reservations` ahora incluye `className` (Program.name) y `startTime` en la respuesta
- Build limpio ✅; validación manual completa ✅

**Validado:**
- `/api/auth/session-test` devuelve usuario real con role ADMIN
- `/profile` muestra usuario real con reservas y historial con nombre de clase correcto
- `/classes` reservar/cancelar funciona con Booking.memberId real
- `/calendar` usa usuario autenticado real
- `/admin/members` funciona como ADMIN; edición persiste en DB

**Pendiente UX (backlog):**
- Agregar botón de cerrar sesión visible desde perfil/avatar
- Reemplazar Home mock con datos reales
- Limpiar mock-data cuando Home deje de depender de mocks

#### Task 15 ✅ — Dev tools restringidos a development

- `src/app/layout.tsx`: `<DevPanel />` envuelto en `process.env.NODE_ENV === "development"` — no se monta en producción
- `src/components/Sidebar.tsx`: sección "Demo: Rol" eliminada completamente de todos los entornos; Sidebar queda solo como navegación real
- `src/lib/useCurrentUser.ts`: `changeRole` es no-op en producción; localStorage no se lee; `role` siempre viene del JWT real en producción
- DevPanel (Shift+D) es el único punto de simulación de rol, exclusivo de development
- Build limpio ✅; validación manual completa ✅

**Estado de herramientas de desarrollo:**
- DevPanel: solo en `NODE_ENV=development`, Shift+D para abrir
- Sidebar: solo navegación, sin controles demo en ningún entorno
- `changeRole`: exportada pero no-op en producción (no rompe interfaz de useCurrentUser)
- `role` en producción: siempre del JWT, nunca de localStorage

#### Home real sin mocks ✅ — Implementado, pendiente validación manual

- `src/app/page.tsx`: eliminados todos los imports de mock-data (`mockPosts`, `mockClasses`, `mockReservations`)
- Feed comunitario (publicaciones, likes, comentarios) y "Crear publicación" **ocultados** — no existe modelo Post/Announcement en Prisma ni API real; mostrarlos sería falsa persistencia
- "Clases de hoy" reemplazado con fetch real a `/api/classes?weekStart=YYYY-MM-DD`
- "Próximamente" derivado del mismo fetch (sesiones con `dayOfWeek > gymDow`)
- "Mis próximas reservas" (MEMBER) reemplazado con fetch real a `/api/reservations?userId=...` — muestra `className` y `startTime` reales
- "Resumen operativo" (ADMIN) calculado desde datos reales: clases activas = sessions.length, ocupación promedio = avg(reserved/capacity), reservas hoy = sum(reserved) de sesiones de hoy
- Estados de carga y vacío honestos: "Cargando...", "No hay clases programadas para hoy", "Sin próximas reservas"
- `gymDayOfWeek()` mapea correctamente: Mon=0…Sat=5, Dom=-1 (día de descanso)
- Guards de auth: fetch no se dispara hasta que `activeUser.isLoading === false`
- Build limpio ✅

**Pendiente validación manual:**
- Como ADMIN: verificar "Clases de hoy" con sesiones reales, "Resumen operativo" con números reales
- Como MEMBER: verificar "Mis próximas reservas" con `className` real (no "Clase reservada")
- Verificar que feed/publicaciones no aparecen en ningún rol

**Backlog futuro:**
- Módulo Comunicados/Announcements con modelo Post en Prisma, CRUD, likes y comentarios persistentes
- Agregar logout visible desde avatar/perfil
- Limpiar `mock-data.ts` completamente cuando Home y DevPanel dejen de depender de mocks

## Próximo paso

Validar manualmente Home como ADMIN y MEMBER tras merge a master.

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
