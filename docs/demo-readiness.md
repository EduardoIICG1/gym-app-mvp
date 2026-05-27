# Demo Readiness — Primary Performance

Checklist para validar la web-app antes de una demo o control interno.

## Comando para cargar datos demo

```bash
npx prisma db seed
# o equivalente:
npx tsx --env-file=.env.local prisma/seed.ts
```

El seed es idempotente: re-ejecutarlo limpia residuos de testing, recalcula fechas futuras y restaura todos los estados demo.

---

## Cuentas reales para QA visual (login Google OAuth)

| Email | Rol | Escenario | Qué validar |
|-------|-----|-----------|-------------|
| `lalopeluuza01@gmail.com` | ADMIN | Admin completo | Panel admin, crear/editar miembros, membresías, clases, anuncios |
| `primary.coach.test@gmail.com` | COACH | GROUP + KINESIO | Sesiones propias, inscritos, convocar al MEMBER GROUP, bloqueo sobre sesiones PT |
| `performanceprimary.task@gmail.com` | MEMBER GROUP | Todos los estados calendario | Reservada / Invitado / Disponible / Sin cupos · alerta "expira pronto" · /solicitudes |
| `laloosky@gmail.com` | MEMBER PT | PT activo | Sesión PT reservada · calendario PT · perfil con membresía PT · sin acceso a GROUP |
| `evergara.ing@gmail.com` | MEMBER EXPIRED | GROUP vencido | Alerta "membresía vencida" en Home · intento de reserva bloqueado · sin solicitudes |

> Estas 5 cuentas son las únicas con login Google OAuth real. Todas las demás son placeholders.

---

## Placeholders @primaryperf.com (sin login real)

Existen en la DB para dar riqueza de datos. No tienen cuentas Google reales y **no pueden hacer login**.

| Email | Rol | Propósito |
|-------|-----|-----------|
| `admin@primaryperf.com` | ADMIN | Placeholder admin secundario |
| `felipesoto@primaryperf.com` | COACH | Placeholder coach sin sesiones asignadas |
| `marisolv@primaryperf.com` | COACH | Coach PT de relleno (sin login real) |
| `ana@primaryperf.com` | MEMBER | Placeholder PT member |
| `carlosl@primaryperf.com` | MEMBER | KINESIO member — bookings de relleno |
| `luciap@primaryperf.com` | MEMBER | GROUP member placeholder sin bookings |
| `sofia@primaryperf.com` | MEMBER | GROUP expired placeholder |

---

## Datos demo incluidos

### Membresías de cuentas reales

| Cuenta real | Tipo | Estado | Sesiones | Alerta |
|-------------|------|--------|----------|--------|
| `performanceprimary.task@gmail.com` | GROUP | ACTIVE | 20 disp., expira 31-May | `expiring_soon` — "vence en N días" |
| `laloosky@gmail.com` | PERSONAL_TRAINING | ACTIVE | 8/10 restantes | Ninguna |
| `evergara.ing@gmail.com` | GROUP | EXPIRED | vencida 30-Apr | `critical` — "membresía vencida" |

### Demo "sin sesiones" (placeholder, visible en admin)

| Cuenta | Tipo | Estado | Sesiones | Alerta |
|--------|------|--------|----------|--------|
| `luciap@primaryperf.com` | GROUP | ACTIVE | 5/5 usadas | `no_sessions` — "sin sesiones disponibles" |

> `luciap@primaryperf.com` no tiene cuenta Google real. El estado es visible en `/admin/memberships`.
> Para demo del alert `no_sessions`, el admin puede mostrar el panel de membresías o describir el flujo.

### Variables opcionales para CTA de renovación

```
# En .env.local (sin valores reales por defecto)
NEXT_PUBLIC_GYM_WHATSAPP_NUMBER=521XXXXXXXXXX   # → abre wa.me con mensaje prellenado
NEXT_PUBLIC_GYM_CONTACT_EMAIL=gym@ejemplo.com   # → fallback mailto si no hay WhatsApp
```

Si ninguna está definida, el botón "Contactar para renovar" no aparece — solo el texto de la alerta.
El CTA aparece en alertas: `critical`, `no_sessions`, `expiring_soon`. No aparece en `pending`.

### Sesiones (relativas a la fecha del seed)

| ID lógico | Programa | Tipo | Capacidad | Día | Hora local |
|-----------|----------|------|-----------|-----|-----------|
| sessGMon1–4 | Funcional Grupal Mañana | GROUP | 15 | Lunes semanas 1–4 | 08:00 |
| sessGWed1–4 | Funcional Grupal Tarde | GROUP | 15 | Miércoles semanas 1–4 | 18:00 |
| sessGFull | Funcional Express | GROUP | **2** | Lunes semana 1 | 07:00 |
| sessP1–3 | Entrenamiento Personal | PT | 1 | Martes semanas 1–3 | 10:00 |
| sessK1 | Kinesiología Básica | KINESIO | 1 | Martes semana 1 | 11:00 |

> IDs lógicos son aliases de documentación. IDs reales en DB: `seed_sess_g_mon1`, `seed_sess_g_full`, etc.

### Estados demo en calendario — `performanceprimary.task@gmail.com` (GROUP MEMBER)

| Sesión | Estado | Por qué |
|--------|--------|---------|
| sessGFull (Lun 07:00) | **Sin cupos** | 2/2 bookings (ana@primaryperf.com + carlosl) |
| sessGMon1 (Lun 08:00) | **Reservada** | booking CONFIRMED |
| sessGWed1 (Mié 18:00) | **Invitado** | BookingInvitation PENDING del COACH real |
| Resto GROUP sessions | **Disponible** | Sin booking ni invitación |

### BookingInvitation

- `performanceprimary.task@gmail.com` → sessGWed1 (Funcional Grupal Tarde, semana 1) — status: PENDING
- Coach que invitó: `primary.coach.test@gmail.com`
- Mensaje: "Te esperamos en el Funcional Grupal del miércoles"

---

## Checklist QA — ADMIN (`lalopeluuza01@gmail.com`)

- [ ] Login con Google → Home de admin
- [ ] `/admin/members` — lista todos los usuarios (incluye las 5 cuentas reales)
- [ ] Crear nuevo MEMBER (email ficticio)
- [ ] Editar nombre/status de un miembro
- [ ] Asignar/cambiar rol (MEMBER → COACH)
- [ ] `/admin/memberships` — lista todas las membresías con estados
- [ ] Crear membresía GROUP para `evergara.ing@gmail.com` (demostrar renovación de vencida)
- [ ] Renovar membresía de `performanceprimary.task@gmail.com` (antes de vencimiento)
- [ ] `/calendar` — ver todas las clases sin chip "Invitado"
- [ ] `/classes` — lista de sesiones
- [ ] Invitar miembro desde detalle de clase
- [ ] Crear/editar anuncio desde `/announcements`

## Checklist QA — COACH (`primary.coach.test@gmail.com`)

- [ ] Login con Google → Home de coach (próximas sesiones, inscritos)
- [ ] `/calendar` — ve todas las clases
- [ ] `/classes` — ve sus sesiones GROUP Mon/Wed y KINESIO como operables
- [ ] Entrar a sessGMon1 → ve lista de inscritos (ana@primaryperf.com, carlosl, performanceprimary.task)
- [ ] Registrar asistencia: ATTENDED / ABSENT
- [ ] Invitar a `performanceprimary.task@gmail.com` a otra sessGMon disponible
- [ ] Verificar que NO puede ver inscritos de sesiones PT (marisolv como coach)
- [ ] `/calendar` — NO aparece chip "Invitado" en ninguna clase

## Checklist QA — MEMBER GROUP (`performanceprimary.task@gmail.com`)

- [ ] Login con Google → Home con alerta naranja "vence en N días" (`expiring_soon`)
- [ ] Si `NEXT_PUBLIC_GYM_WHATSAPP_NUMBER` está definida → botón "Contactar para renovar" visible en alerta
- [ ] Si no hay var de entorno → alerta solo texto, sin botón
- [ ] Home muestra bloque de solicitudes pendientes (1 invitación)
- [ ] `/calendar` semana 1:
  - [ ] Lun 07:00 Funcional Express → chip "Sin cupos"
  - [ ] Lun 08:00 Funcional Grupal Mañana → chip "Reservada"
  - [ ] Mié 18:00 Funcional Grupal Tarde → chip "Invitado"
  - [ ] Resto → chip "Disponible"
- [ ] Click en clase "Invitado" → modal con aviso ámbar + "Ver solicitud →"
- [ ] Click en "Ver solicitud →" → navega a `/solicitudes`
- [ ] `/solicitudes` — invitación listada con "Asistiré" / "No asistiré"
- [ ] "Asistiré" → booking creado, chip cambia a "Reservada"
- [ ] Reservar clase GROUP disponible (semana 2+)
- [ ] Cancelar reserva (antes de 2 horas → sesión devuelta a membresía)
- [ ] `/profile` — membresía GROUP con alerta de vencimiento próximo

## Checklist QA — MEMBER PT (`laloosky@gmail.com`)

- [ ] Login con Google → Home sin alertas (PT activa, 8 sesiones disponibles)
- [ ] `/calendar` — ve sesiones PT (Martes) + clases GROUP
- [ ] sessP1 → chip "Reservada" (booking CONFIRMED)
- [ ] Reservar sessP2 o sessP3 si hay cupos disponibles
- [ ] `/profile` → membresía PT activa, sesiones usadas correctas
- [ ] Intentar reservar una clase GROUP → error si no tiene membresía GROUP

## Checklist QA — MEMBER EXPIRED (`evergara.ing@gmail.com`)

- [ ] Login con Google → Home con alerta roja "membresía vencida" (`critical`)
- [ ] Si `NEXT_PUBLIC_GYM_WHATSAPP_NUMBER` o `NEXT_PUBLIC_GYM_CONTACT_EMAIL` definida → botón "Contactar para renovar" en alerta
- [ ] `/calendar` — ve clases GROUP visibles
- [ ] Intentar reservar una clase GROUP → error "membresía vencida"
- [ ] `/solicitudes` → sin solicitudes pendientes
- [ ] `/profile` → membresía GROUP con estado EXPIRED

---

## Estados visuales calendario (resumen)

| Chip | Quién lo ve | Condición |
|------|------------|-----------|
| **Disponible** | performanceprimary.task | GROUP sem 2–4 sin booking |
| **Reservada** | performanceprimary.task | sessGMon1 CONFIRMED |
| **Invitado** | performanceprimary.task | sessGWed1 PENDING invitation |
| **Sin cupos** | performanceprimary.task | sessGFull 2/2 |
| **Reservada** | laloosky | sessP1 CONFIRMED (PT) |

---

## Limpiezas que hace el seed

El seed limpia automáticamente residuos de sesiones de testing para las cuentas reales:

- Elimina membresías extra (mantiene solo la del seed por cada cuenta real)
- Elimina bookings en sesiones no-seed para las cuentas reales
- Elimina invitaciones PENDING espurias (solo permanece la del seed para performanceprimary.task)

---

## Datos de prueba a NO incluir en demo

- Sesión `test_sess_pt_coach` y membresías `test_membr_*` (creadas por scripts de validación)
- Invitaciones ACCEPTED históricas en sesiones de test (no afectan /solicitudes)
- Scripts untracked en `prisma/` — no commitear

Verificar antes de demo:
```bash
npx tsx --env-file=.env.local prisma/validate-commit7.ts
```

---

## Advertencias

- Re-ejecutar el seed antes de cada demo para garantizar fechas futuras y DB limpia.
- El seed elimina y recrea todas las sesiones en cada ejecución.
- Las sesiones de test (`test_sess_*`) no son afectadas por el seed.
- La DB es compartida con el ambiente local. No ejecutar el seed en producción sin revisar variables de entorno.
- Los emails `@primaryperf.com` no tienen cuentas Google reales — no sirven para login. Toda validación visual debe hacerse con las 5 cuentas reales listadas arriba.
