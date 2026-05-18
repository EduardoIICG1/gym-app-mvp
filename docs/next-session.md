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

#### Home real sin mocks ✅ — Validado (2026-05-15)

- `src/app/page.tsx`: eliminados todos los imports de mock-data (`mockPosts`, `mockClasses`, `mockReservations`)
- Feed comunitario y "Crear publicación" ocultados — no existe modelo Post/Announcement en Prisma
- "Clases de hoy" y "Próximamente" con fetch real a `/api/classes?weekStart=YYYY-MM-DD`
- "Mis próximas reservas" (MEMBER) con fetch real a `/api/reservations` — muestra `className` y `startTime` reales
- "Resumen operativo" (ADMIN) calculado desde sesiones reales — sin NaN
- Guards de auth: fetch no se dispara hasta `activeUser.isLoading === false`
- Build limpio ✅

**Validación manual completada:**
- ADMIN ✅: "Clases de hoy", "Próximamente" y "Resumen operativo" con datos reales; sin feed; sin crear publicación
- MEMBER ✅: "Mis próximas reservas" con `className` real; sin resumen operativo; sin feed
- COACH ✅ con observación: carga sin errores, sin feed, sin crear publicación
  → **Vista COACH queda mínima** — solo "Clases de hoy" visible; si no hay clases hoy, la vista queda vacía sin valor operativo
  → Brecha de producto aceptada; se documenta como backlog prioritario

## Backlog prioritario

### Home Coach operativo ✅ — Implementado (2026-05-15)

- `src/app/page.tsx`: vista COACH completamente separada de ADMIN y MEMBER
- **Filtro principal:** `coachId === activeUser.id && sessionDate === todayStr` — usa la fecha real de la sesión (no `dayOfWeek`) como fuente de verdad
- **"Mis clases de hoy":** sesiones del coach filtradas por `sessionDate === hoy`; si no hay → "No tienes clases hoy"
- **"Próximas clases":** sesiones con `sessionDate > hoy`, ordenadas por `sessionDate + startTime`, máximo 5; muestran fecha real, hora e inscritos/cupo
- **"Resumen de hoy":** 4 KPIs reales sin NaN — clases hoy, inscritos hoy, ocupación media (guard contra division/0), próxima clase
- `coachId` y `sessionDate` ya estaban en la respuesta de `/api/classes`; solo faltaban en la interfaz `HomeClass`
- No se tocaron APIs, schema ni auth
- Build limpio ✅; validación manual correcta ✅

**Observación de validación:**
La validación con DevPanel usa `activeUser.id` real. Si el usuario autenticado no está asignado como `coachId` en ninguna sesión, la vista aparece vacía — comportamiento correcto. Para validar el caso positivo se requiere un usuario COACH real con sesiones asignadas.

**Backlog pendiente (no implementar ahora):**
- Validar caso positivo con usuario COACH real o asignando temporalmente una sesión al coach de prueba
- Acceso al detalle de la clase desde Home COACH
- Ver lista de inscritos por sesión (requiere decisión de privacidad)
- Tomar asistencia desde Home COACH
- Invitar alumnos a una sesión (requiere modelo de invitación)
- Alertas visuales para sesiones llenas, canceladas o con baja ocupación

---

### Task futura: Inscritos visibles por sesión
**Objetivo:** mostrar quiénes están inscritos en una sesión con reglas de privacidad por rol.

**Reglas por rol:**
- ADMIN: puede ver todos los inscritos con nombre y email completo
- COACH: puede ver inscritos de sus sesiones con nombre y email completo
- MEMBER: puede ver al menos la cantidad de inscritos; visibilidad de nombres a definir

**Caso de uso MEMBER (válido, documentado):**
Un alumno que ve que un amigo está inscrito en una clase puede motivarse a reservar o escribirle para coordinar. Esto conecta directamente con el flujo de invitación del coach y con social proof/gamificación.

**Opciones de visibilidad para MEMBER (decisión de producto pendiente):**
1. Todos los nombres completos de inscritos
2. Solo amigos/contactos definidos en la plataforma
3. Iniciales o nombres parciales (e.g. "Juan P.")
4. Opción de ocultar asistencia propia (el usuario decide si aparece en la lista)
5. Solo cantidad de inscritos, sin nombres (opción mínima)

**Pendiente de decisión de producto:**
- ¿Qué opción de visibilidad adoptar por defecto para MEMBER?
- ¿Existe un concepto de "amigos/contactos" en la plataforma? (aún no modelado)
- ¿El MEMBER puede optar por ocultar su asistencia?
- ¿La visibilidad es por clase, por tipo de servicio, o global?

**Conexiones con otras tasks:**
- Invitación del coach a clase: el coach necesita ver quiénes aún no están inscritos para invitar
- Gamificación/social proof: ver que un amigo asiste puede disparar la reserva
- Notificaciones: "Tu amigo Juan reservó Funcional del lunes"

---

### Task futura: Invitación del coach a clase
**Objetivo:** permitir al coach invitar alumnos directamente a una sesión.

**Flujo esperado:**
- COACH selecciona una sesión y elige alumnos a invitar
- MEMBER recibe notificación o alerta de invitación
- MEMBER puede aceptar o rechazar
- Si acepta → se crea o confirma Booking para esa sesión
- Si rechaza → no se genera reserva; COACH puede ver el estado

**Conexiones con otras tasks:**
- Depende de "Inscritos por sesión" (COACH necesita ver quiénes ya están, quiénes no)
- Puede conectar con gamificación: incentivo social a reservar cuando el coach invita o cuando un amigo acepta
- Potencial para notificaciones push/email en el futuro

**Pendiente de decisión de producto:**
- ¿Invitación individual o grupal (invitar a todos sus alumnos activos)?
- ¿Caduca la invitación si no se acepta antes de la sesión?
- ¿El MEMBER puede ver que el coach lo invitó antes de decidir?

---

### Inscritos por sesión ✅ — Implementado (2026-05-15)

- `GET /api/classes/[id]` añadido con respuesta role-based:
  - ADMIN: sesión completa + `attendees[]` (nombre, email, estado de reserva)
  - COACH: igual que ADMIN si `session.coachId === auth.user.id`; 403 en sesión ajena
  - MEMBER: solo datos base (sin lista nominal)
  - Sin sesión → 401
- `src/app/classes/[id]/page.tsx`: página de detalle de sesión
  - ADMIN/COACH: tabla de inscritos con nombre, email y badge de estado
  - MEMBER: panel de conteo grande (N personas inscritas de X cupos)
  - Manejo de errores 403/404 con link de vuelta
- Security fix en `GET /api/reservations`: `auth()` ahora siempre al inicio, antes de cualquier filtro; `?classId=` sin sesión devuelve 401
- `src/app/admin/classes/page.tsx`: eliminado panel inline de inscritos que calculaba fechas incorrectas con `weekDateForDay(cls.dayOfWeek)`. Reemplazado por link "Ver →" a `/classes/[id]`
- `src/components/ClassCard.tsx`: link "Ver inscritos →" en azul (`#4fc3f7`) debajo del botón de acción
- Causa raíz del bug anterior: `weekDateForDay` usaba la semana actual mientras la sesión era de otra semana — inconsistencia entre `reservedCount` real (Prisma `_count`) y filtro client-side por fecha incorrecta
- Build limpio ✅; validado ADMIN, MEMBER, seguridad ✅

### Gestión de reservas y asistencia ✅ — Implementado (2026-05-15)

- `PATCH /api/reservations/[id]`: auth añadida; ADMIN puede modificar cualquier booking; COACH solo los de sus sesiones; MEMBER → 403; sin sesión → 401
  - `attendanceStatus: "attended"` → `Booking.status = ATTENDED`
  - `attendanceStatus: "absent"` → `Booking.status = ABSENT`
  - `attendanceStatus: "pending_attendance"` → `Booking.status = CONFIRMED`
- `DELETE /api/reservations/[id]`: nuevo handler con misma auth guard; soft-delete `CANCELLED`; booking ya cancelado → 400
- `src/app/classes/[id]/page.tsx`: botones ✓ ✗ × por fila de inscrito (ADMIN/COACH)
  - ✓ verde → marcar ATTENDED; desactivado si ya ATTENDED
  - ✗ rojo → marcar ABSENT; desactivado si ya ABSENT
  - × gris → cancelar con confirm; fila cancelada queda en 45% opacity sin botones
  - Contador "Inscritos (N)" excluye CANCELLED
  - Error de acción en banda roja; loading por fila (no bloquea lista entera)
  - Estado local actualizado optimistamente; sin refetch completo
- Build limpio ✅; validado ADMIN: ATTENDED, ABSENT, CANCELLED, contador correcto ✅

**Decisión de producto documentada:**
El estado actual del Booking se persiste (`Booking.status`). No existe historial de cambios de estado. Si el admin pisa ATTENDED → ABSENT, el estado ATTENDED se pierde. Esto es aceptable para MVP.

**Backlog: AttendanceLog / BookingStatusHistory**
- Necesario para: gamificación, rachas de asistencia, métricas históricas, auditoría de cambios
- Campos mínimos: `oldStatus`, `newStatus`, `changedByUserId`, `changedAt`, `reason`
- Requiere nueva tabla en schema (no implementar hasta definir alcance de gamificación)

---

### Task futura: Gestión de reservas y asistencia (ADMIN/COACH) — Backlog avanzado
**Objetivo:** funciones adicionales de gestión más allá del MVP.

**Contenido esperado:**
- Marcar asistencia (ATTENDED/ABSENT) desde `/classes/[id]` para ADMIN y COACH autorizado
- Cancelar reserva de un alumno específico desde el detalle
- Crear reserva manualmente para un alumno (admin puede inscribir directamente)
- Ver historial de cambios de estado por reserva

**Reglas:**
- Solo ADMIN y COACH de la sesión pueden modificar reservas/asistencia
- MEMBER no puede modificar el estado de su reserva desde esta vista (usa `/classes` para cancelar)
- No requiere cambios de schema: Booking.status ya tiene ATTENDED/ABSENT/CONFIRMED/CANCELLED

**Conexión:** usa el mismo `GET /api/classes/[id]` ya implementado; solo requiere PATCH/DELETE sobre `/api/reservations/[id]`

---

### Task futura: Reglas de cancelación y cambio de clase por MEMBER
**Objetivo:** definir e implementar las políticas del gimnasio para cancelación de reservas.

**Pendiente de decisión de producto:**
- ¿Con cuántas horas de anticipación puede cancelar un MEMBER?
- ¿Hay penalización por cancelación tardía (afecta créditos de sesiones)?
- ¿Puede el MEMBER cambiar de sesión (cancelar una y reservar otra del mismo servicio)?
- ¿Sesión vencida = sin crédito (sesión usada)?
- Estas reglas deben estar en un reglamento explícito antes de implementar

**No implementar hasta tener reglamento definido.**

---

### Task futura: Módulo Comunicados/Announcements
**Objetivo:** feed comunitario real con persistencia.
- Modelo `Post` (o `Announcement`) en Prisma con CRUD
- CRUD solo para ADMIN y COACH (publicar, editar, eliminar)
- MEMBER puede leer y reaccionar
- Likes y comentarios persistentes (no state local)
- Feed en Home left-panel actualmente oculto

---

#### Logout visible ✅ — Validado (2026-05-15)

- `src/components/Navbar.tsx`: ícono `LogOut` añadido a la derecha del avatar en la Navbar
- Usa `signOut({ callbackUrl: "/" })` — el middleware detecta sin sesión y redirige a sign-in con `callbackUrl=/`; tras el login Google aterriza en `/` sin rebote
- Estilo consistente con el theme toggle: `w-8 h-8 rounded-lg hover:bg-white/5`, tooltip "Cerrar sesión"
- Visible en desktop y mobile (siempre presente en top-right)
- Flujo validado: logout → Google sign-in → login → aterriza en `/` con sesión activa ✅

### Navegación contextual en /classes/[id] ✅ — Validado (2026-05-16)

**Causa raíz corregida:** El botón "Volver a clases" en `/classes/[id]/page.tsx` estaba hardcodeado a `href="/classes"`. Al entrar desde `/admin/classes` (lista compacta de gestión) → "Ver" → detalle → "Volver", el ADMIN aterrizaba en `/classes` (cards para miembros), no en su panel de gestión. Esto se percibía como "cambio de layout" o inconsistencia visual — en realidad eran dos rutas con diseños distintos.

**Solución:** Query param `?from=` en cada punto de entrada + `BACK_MAP` en el detalle.

- `src/app/admin/classes/page.tsx`: link "Ver" → `/classes/${id}?from=admin-classes`
- `src/components/ClassCard.tsx`: link "Ver inscritos" → `/classes/${id}?from=classes`
- `src/app/calendar/page.tsx`: link "Ver detalle" → `/classes/${id}?from=calendar`
- `src/app/page.tsx` (Home Coach): links → `/classes/${id}?from=classes`
- `src/app/classes/[id]/page.tsx`: `useSearchParams()` + `BACK_MAP` resuelve destino y etiqueta del botón:
  - `from=admin-classes` → `/admin/classes` · "← Volver a gestión"
  - `from=calendar` → `/calendar` · "← Volver al calendario"
  - `from=classes` o sin param → `/classes` · "← Volver a clases"

**Correcciones adicionales en la misma sesión:**
- `GET /api/classes/[id]`: `serviceType` ahora mapeado via `SVC_MAP` (antes devolvía enum DB en mayúsculas como `PERSONAL_TRAINING`); `SERVICE_LABELS` de `labels.ts` usado en el frontend para mostrar en español
- `src/components/ClassCard.tsx`: badge de estado cambiado de clases Tailwind light-mode (`bg-orange-50 text-orange-700`) a inline styles con transparencia (`#f59e0b20`/`#f59e0b`) — consistente con dark theme
- `src/app/classes/[id]/page.tsx`: `canSeeAttendees` reforzado con guard de rol de cliente: `session.attendees !== undefined && activeUser.role !== "member"` — previene el caso DevPanel donde JWT real es ADMIN pero visual role es "member"

Build limpio ✅; validación manual correcta ✅

---

### Backlog UX general
- Limpiar `mock-data.ts` completamente cuando Home y DevPanel dejen de depender de mocks

### Membership gating ✅ — Implementado (2026-05-16)

**Objetivo:** bloquear reservas de MEMBER sin membresía válida para el tipo de servicio de la clase.

**Server-side (autoridad):** `POST /api/reservations`
- Solo aplica a `session.user.role === "MEMBER"`. ADMIN y COACH bypassean el gating.
- Busca membresías del usuario con `serviceType === program.serviceType`.
- Regla de validación: `status = ACTIVE`, `startDate <= ahora`, `endDate >= hoy OR null`, y si `totalSessions` existe: `usedSessions < totalSessions`.
- Errores específicos con HTTP 403:
  - Sin membresía para el servicio: "No tienes una membresía activa para este tipo de clase."
  - Membresía ACTIVE con fecha vencida: "Tu membresía está vencida. Regulariza tu membresía para reservar."
  - Membresía EXPIRED: mismo mensaje de vencida.
  - Membresía PENDING/CANCELLED: "Tu membresía no está activa. Contacta a administración."
  - Sesiones agotadas: "No tienes sesiones disponibles en tu membresía."

**Frontend (UX preventivo):**
- `src/app/classes/page.tsx`: fetch de `/api/memberships` al cargar, computa `validServiceTypes`. Botón "Reservar clase" → "Sin membresía" (deshabilitado y gris) cuando MEMBER sin membresía válida para ese serviceType. Error de API propagado correctamente (antes era genérico "Failed to reserve class").
- `src/components/ClassCard.tsx`: prop `membershipBlocked?: boolean` nueva. Estilo neutral `#71717a` cuando bloqueado.
- `src/app/calendar/page.tsx`: fetch de `/api/memberships` en useEffect separado (no re-fetcha por cambio de semana). Modal MEMBER muestra botón "Sin membresía para esta clase" deshabilitado. Usa `null` como centinela para evitar flash de bloqueo antes de cargar.

**`usedSessions` — pendiente de decisión:**
- La validación `usedSessions < totalSessions` está implementada pero es un placeholder.
- `usedSessions` nunca se incrementa actualmente (siempre 0 en DB).
- Membresías con `totalSessions` no null nunca bloquean por sesiones hasta implementar el incremento.
- Política de consumo (al reservar vs al asistir vs cancelación tardía) requiere revisión del reglamento del gym antes de implementar.

**Backlog generado:**
- Definir política de consumo de `usedSessions` y cuándo incrementar
- Alerta visual en perfil del alumno con membresía vencida o sin sesiones
- Validación de `endDate` para MEMBER en la vista de clases (actualmente puede ver clases sin bloqueo visual de fecha a nivel de sesión)

**Estado de validación:**
- Build limpio ✅
- Validación visual `/classes` y `/calendar` confirmada manualmente ✅
- Validación con JWT MEMBER real (cuenta Google vía `TEST_MEMBER_EMAIL`): ✅
  - Login Google MEMBER real → perfil muestra rol Miembro y membresía GROUP activa
  - `/classes`: clase GROUP → "Reservar clase" activo; reserva exitosa (POST 201, booking creado)
  - `/classes`: clase PERSONAL_TRAINING → "Sin membresía" (deshabilitado)
  - `/classes`: clase KINESIOLOGY → "Sin membresía" (deshabilitado)
  - `/calendar`: modal GROUP → botón de reserva activo; modal PT/KINE → "Sin membresía para esta clase"
- Validación server-side PT/KINE por API (POST con JWT MEMBER): **cubierta por orden de validación**
  - Las sesiones seed PT y KINE están llenas (1/1), por lo que no es posible enviar el POST completo por UI
  - El orden de validación en POST `/api/reservations` garantiza que membership gating (línea 104) se ejecuta **antes** del capacity check (línea 158)
  - Un MEMBER sin membresía PT/KINE recibirá 403 "No tienes una membresía activa para este tipo de clase." incluso si la clase está llena
  - Validación directa por API (curl/DevTools con JWT MEMBER) queda como verificación adicional opcional

---

---

### Decisión de producto: visibilidad del calendario por rol (backlog, no implementar todavía)

**Principio:** ver clases no es lo mismo que poder reservar. El calendario del MEMBER no debe funcionar como calendario global del gimnasio.

**Reglas futuras por rol:**

**MEMBER — vista normal:**
- Ve su agenda personal y sus reservas activas.
- Ve clases disponibles **solo si corresponden a su membresía activa** (serviceType contratado y vigencia válida).
- No ve clases de servicios que no tiene contratados.
- No ve bloques de coaches que no le corresponden.

**MEMBER — modo reservar:**
- Solo opciones filtradas por: serviceType de su membresía, vigencia, cupos disponibles, y coach asignado si aplica.

**MEMBER — modo reagendar** (solo al presionar "Reagendar" explícitamente):
- Se desbloquean alternativas compatibles con su membresía.
- Personal training: solo bloques disponibles de su coach asignado.
- Grupal: solo clases grupales permitidas.
- Kinesiología: solo bloques del profesional asignado.
- No accede a todo el calendario del gym.

**ADMIN:** ve todo, sin restricción.

**COACH:** ve sus propias clases, alumnos y agenda operativa.

**Razón de no implementar ahora:**
- Requiere modelo de disponibilidad de coach (bloques horarios, no solo sesiones existentes).
- Requiere reglas de reagendamiento según reglamento (aún no definido).
- Requiere decisión sobre upsell: ¿el MEMBER puede ver servicios no contratados como vitrina? Si sí, requiere flujo de adquisición separado del calendario operativo.
- Requiere definir si el filtro es por `Membership.serviceType` activo, por `MemberCoach.serviceType`, o por ambos.

**Tasks bloqueadas hasta resolver:**
- `COACH availability blocks` — modelo para horarios disponibles de coach (no solo sesiones ya agendadas)
- `Calendar visibility by membership` — filtrar `/calendar` por serviceTypes de membresías activas del MEMBER
- `Reschedule mode` — UI separada del modo reserva estándar
- `Service upsell view` — vitrina de servicios no contratados, separada del calendario operativo

---

### Decisión de producto: cobertura / sustitución de coach (backlog, no implementar todavía)

**Caso de uso:** un coach se enferma o tiene una urgencia 2–3 horas antes de una clase. Otro coach debe tomar esa clase sin cancelar ni reagendar a los alumnos.

**Regla de producto:**
- La sesión se mantiene (mismo `sessionId`, mismo horario).
- Los bookings se mantienen — ningún inscrito es afectado.
- La asistencia se toma sobre la misma sesión.
- La membresía/servicio del alumno no cambia.
- Solo cambia el coach responsable de ejecutar esa sesión.
- No es reagendamiento. No borra ni recrea bookings. No pierde historial.

**Modelo de datos futuro — dos opciones:**

Opción simple (campos en Session):
- `coverCoachId String?` — coach sustituto asignado
- `coverReason String?` — motivo de la sustitución
- `coverAssignedAt DateTime?`
- `coverAssignedById String?` — quién asignó la cobertura

Opción robusta (tabla separada para historial completo):
- `SessionCoachAssignment` / `CoachCoverageLog`
  - `sessionId`, `originalCoachId`, `assignedCoachId`, `assignedByUserId`
  - `reason`, `createdAt`, `cancelledAt`
  - Permite historial de múltiples cambios por sesión

**Reglas por rol:**
- **ADMIN:** puede asignar, modificar y quitar coach sustituto en cualquier sesión.
- **COACH:** puede ver sesiones que debe cubrir; puede tomar asistencia si es coach original O coach sustituto; no se autoasigna cobertura sin permiso de ADMIN.
- **MEMBER:** mantiene su reserva sin acción requerida; puede ver que la clase será tomada por otro coach.

**Impacto técnico futuro:**
- Permisos de asistencia deben aceptar `session.coachId === auth.user.id` OR `session.coverCoachId === auth.user.id`
- Home COACH debe incluir: mis clases originales + clases que estoy cubriendo
- Calendar COACH debe distinguir: mis clases / clases cubiertas / ocupaciones de colegas como referencia
- `/classes/[id]` debe mostrar coach original y coach sustituto si existe

**Tasks bloqueadas hasta resolver:**
- Decisión de modelo: campos en Session (simple) vs tabla de log (robusto)
- `Coach coverage assignment` — UI en ADMIN para asignar sustitución
- `Coach coverage view` — Home y Calendar COACH muestran clases a cubrir
- `Cover visibility for MEMBER` — alerta en detalle de sesión cuando hay sustitución
- `Coverage history` — auditoría de cambios de coach por sesión
- `Notification flows` — alerta al coach sustituto y al alumno

---

### Calendar por rol ✅ — Implementado (2026-05-16)

**Cambios:**
- `src/lib/types.ts`: `coachId?: string` agregado a `GymClass` (opcional para compatibilidad con mock-data)
- `src/app/calendar/page.tsx`:
  - **MEMBER filtering:** `getColClasses` filtra clases por `validServiceTypes` (membresías activas del usuario). Si `validServiceTypes === null` (cargando), no filtra. Si `validServiceTypes.size === 0`, muestra estado vacío "Sin membresías activas."
  - **COACH permissions:** `handleCardClick` usa `cls.coachId === CURRENT_USER_ID` para determinar si el COACH puede abrir ManageModal. Clase propia → ManageModal; clase ajena → ClassModal (read-only).
  - **ADMIN:** sin cambios — ManageModal siempre.

**`coachId` en API:** ya existía en `GET /api/classes` (línea 91) — no se tocó la API.

**Estado de validación:**
- ADMIN ✅: ve todas las clases; ManageModal para todas.
- MEMBER real (TEST_MEMBER_EMAIL, membresía GROUP) ✅: solo ve clases GROUP; PT/KINE ausentes del calendario.
- COACH real: **pendiente**
  - DevPanel cambia el rol visual pero no el `user.id` real del JWT.
  - `cls.coachId === CURRENT_USER_ID` compara IDs reales → el ADMIN logueado no coincide con ningún `coachId` del seed → todas las clases abren ClassModal. Comportamiento correcto.
  - Para validar COACH real se requiere una cuenta Google con rol COACH y sesiones asignadas a su ID.
  - Posible futuro: `TEST_COACH_EMAIL` en `.env.local`, pero requiere también reasignar `coachId` de al menos una sesión del seed al coach test. Más invasivo que `TEST_MEMBER_EMAIL` — diferir hasta tener un coach real en el sistema.

**No implementado (backlog):**
- Modo reagendar (requiere decisión de reglamento)
- Disponibilidad de coach (requiere nuevo modelo de datos)
- Filtro de coach ajeno con vista de referencia operativa
- Upsell de servicios no contratados

---

### Módulo Comunicados/Announcements ✅ — Implementado (2026-05-17)

#### Modelo

- `prisma/schema.prisma`: enums `AnnouncementType` (INFO | ALERT | EVENT | MAINTENANCE), `AnnouncementStatus` (PUBLISHED | ARCHIVED). Modelo `Announcement` con campos: `id`, `title?`, `content`, `type`, `authorId`, `isPinned`, `publishedAt`, `expiresAt?`, `linkUrl?`, `linkLabel?`, `status`, `createdAt`, `updatedAt`. Relación `User.announcements`.

#### API

- `GET /api/announcements`: auth requerida. MEMBER solo ve PUBLISHED no vencidos. ADMIN/COACH pueden pedir `?status=archived`. Orden: `isPinned DESC, publishedAt DESC`. `Cache-Control: no-store`. Usa `findMany` con `select` explícito (incluye `linkUrl`/`linkLabel`).
- `POST /api/announcements`: ADMIN/COACH. `authorId` siempre del JWT. `isPinned` ignorado silenciosamente para COACH (guarda `false`). Valida `linkUrl`: debe ser `http://` o `https://`. `linkLabel` fallback a `"Ver enlace"`.
- `PATCH /api/announcements/[id]`: ADMIN edita cualquier comunicado. COACH solo los propios (`authorId === user.id`). `isPinned` solo aceptado para ADMIN. Archivado: `{ status: "archived" }`.

#### Home (`src/app/page.tsx`)

- Layout responsive desktop: grid `minmax(0,1.5fr)` (main) + `minmax(320px,0.8fr)` (aside). Max-width 1200px.
- **Carrusel "Novedades destacadas"**: visible para todos los roles. Si 0 pineados → oculto. Si 1 → card sola. Si ≥2 → flechas `‹`/`›` + contador `N/M` + dots clicables. Estado `carouselIdx` con clamp `safeIdx`.
- **Feed "Comunicados"**: visible para todos los roles. ADMIN/COACH ven formulario de creación (título opcional, textarea, selector de tipo, checkbox "Pinear" solo ADMIN). MEMBER solo lectura.
- Links: si `linkUrl` existe → botón CTA con color del tipo, `target="_blank"`, `rel="noopener noreferrer"`. Aparece en carrusel y en cards del feed.
- Archivar: ADMIN puede archivar cualquiera; COACH solo los propios. Actualización local sin refetch.

#### Seed

- 4 announcements con IDs estables (`seed_ann_pinned_1`, `seed_ann_pinned_2`, `seed_ann_alert_1`, `seed_ann_info_1`).
- `annPinned1`: INFO, isPinned=true, linkUrl="https://www.instagram.com", linkLabel="Síguenos en Instagram" (TODO: actualizar con handle real de Instagram de Primary Performance).
- `annPinned2`: EVENT, isPinned=true, sin link.

#### Nota técnica: Turbopack cache + Prisma schema

Al agregar campos al modelo `Announcement` con `prisma generate`, el servidor dev con Turbopack puede no invalidar el bundle de `@prisma/client`. Fix documentado: `rm -rf .next` + reiniciar `npm run dev`. El `select` explícito en `findMany` garantiza que los campos nuevos se incluyen en la query SQL.

#### Backlog: edición de comunicados (no implementado)

Necesidad: ADMIN y COACH autores deben poder corregir un comunicado publicado sin necesidad de archivarlo y recrearlo.

**Campos editables:**
- `title`, `content`, `type`, `linkUrl`, `linkLabel`, `expiresAt`
- `isPinned`: solo ADMIN

**Reglas por rol:**
- ADMIN: edita cualquier comunicado (todos los campos).
- COACH: edita solo sus propios comunicados; no puede cambiar `isPinned`.
- MEMBER: solo lectura.

**Implementación:** el backend (`PATCH /api/announcements/[id]`) ya soporta edición de todos estos campos con las reglas de permisos correctas. Falta solo el **formulario de edición en el frontend** — una versión pre-poblada del formulario de creación que se activa al hacer clic en "Editar" en las cards del feed (visible solo para ADMIN/COACH autorizados).

**Riesgo:** bajo. El contrato de API ya existe. Solo requiere estado local en el Home o un modal de edición.

#### Preview + "Ver más" + Detalle ✅ — Implementado (2026-05-17)

**Home — preview truncado:**
- Carrusel: `line-clamp-3` + "Ver más →" si `content.length > 180`. Card con `minHeight: 140px` para estabilizar la altura entre slides.
- Feed: `line-clamp-4` + "Ver más →" si `content.length > 240`.
- CTA externo (`linkUrl`) coexiste independientemente del "Ver más": son acciones separadas (externo vs detalle interno).
- Textos cortos no muestran "Ver más" innecesariamente.

**API — `GET /api/announcements/[id]`:**
- En `src/app/api/announcements/[id]/route.ts` (junto al PATCH existente).
- Auth requerida (401 sin sesión). Solo PUBLISHED (ARCHIVED → 404). MEMBER: además filtra `expiresAt < now → 404`.
- Response: mismo shape que los items del GET list.
- `Cache-Control: no-store`.

**Ruta `/announcements/[id]`:**
- `src/app/announcements/[id]/page.tsx` — Client Component.
- `useParams()` + fetch a `GET /api/announcements/[id]`.
- Muestra: badge tipo, badge "📌 Destacado" si aplica, título, contenido completo con `whitespace-pre-wrap`, CTA link externo, autor + fecha.
- Estado de error/404 con link "← Volver al inicio".
- Botón "← Volver al inicio" siempre visible arriba.

**Seed actualizado:** `annPinned2` (258 chars) y `annAlert1` (334 chars) tienen contenido largo suficiente para validar "Ver más" en carrusel y feed respectivamente.

#### Backlog: imágenes y GIFs (fuera de alcance MVP)

- Requiere: storage (Supabase Storage o CDN), validación de tipo/tamaño, preview en formulario, eliminación de archivos huérfanos, seguridad.
- No implementar en Fase 6.

---

## Próximo paso

Backlog abierto. Opciones priorizadas:
1. Definir política de consumo de `usedSessions` (al reservar vs al asistir)
2. Validar COACH real: crear TEST_COACH_EMAIL con reasignación de sesión seed
3. AttendanceLog / BookingStatusHistory (necesario para gamificación y métricas)
4. Edición inline de comunicados (formulario pre-poblado en Home)
5. Coach coverage / sustitución de coach (requiere decisión de modelo de datos primero)

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
