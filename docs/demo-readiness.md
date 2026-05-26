# Demo Readiness — Primary Performance

Checklist para validar la web-app antes de una demo o control interno.

## Comando para cargar datos demo

```bash
npx prisma db seed
# o equivalente:
cross-env NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx prisma/seed.ts
```

El seed es idempotente: se puede ejecutar varias veces sin duplicar usuarios, membresías ni anuncios.
Las sesiones se eliminan y recrean en cada ejecución para mantener fechas futuras.

## Usuarios demo

| Email | Rol | Contraseña |
|-------|-----|------------|
| `lalopeluuza01@gmail.com` | ADMIN (dev) | Google |
| `admin@primaryperf.com` | ADMIN | Google* |
| `felipesoto@primaryperf.com` | COACH (GROUP + KINESIO) | Google* |
| `marisolv@primaryperf.com` | COACH (PT) | Google* |
| `ana@primaryperf.com` | MEMBER (PT) | Google* |
| `carlosl@primaryperf.com` | MEMBER (KINESIO) | Google* |
| `luciap@primaryperf.com` | MEMBER (GROUP, expira pronto) | Google* |
| `sofia@primaryperf.com` | MEMBER (GROUP, membresía vencida) | Google* |

> *Los emails `@primaryperf.com` deben corresponder a cuentas Google reales para que el login funcione.
> Sustituir por los emails reales de los participantes antes de hacer demo en vivo.

## Datos demo incluidos

### Membresías
| Miembro | Tipo | Estado | Sesiones | Alerta esperada |
|---------|------|--------|----------|----------------|
| Ana García | PERSONAL_TRAINING | ACTIVE | 8/10 restantes | Ninguna |
| Carlos López | KINESIOLOGY | ACTIVE | 7/8 restantes | Ninguna |
| Lucía Pérez | GROUP | ACTIVE | 20 disp., expira 31-May | "Membresía expira pronto" |
| Sofía Ramos | GROUP | EXPIRED | vencida 30-Apr | "Membresía vencida" |

### Sesiones (relativas a la fecha del seed)
| ID | Programa | Tipo | Capacidad | Día | Hora |
|----|----------|------|-----------|-----|------|
| sessGMon1–4 | Funcional Grupal Mañana | GROUP | 15 | Lunes semanas 1–4 | 08:00 |
| sessGWed1–4 | Funcional Grupal Tarde | GROUP | 15 | Miércoles semanas 1–4 | 18:00 |
| sessGFull | Funcional Express | GROUP | **2** | Lunes semana 1 | 07:00 |
| sessP1–3 | Entrenamiento Personal | PT | 1 | Martes semanas 1–3 | 10:00 |
| sessK1 | Kinesiología Básica | KINESIO | 1 | Martes semana 1 | 11:00 |

### Estados demo en calendario (como Lucía — GROUP MEMBER)
| Sesión | Estado esperado | Por qué |
|--------|----------------|---------|
| sessGFull (Lun 07:00) | **Sin cupos** | 2/2 reservas (Ana + Carlos) |
| sessGMon1 (Lun 08:00) | **Reservada** | Lucía tiene booking CONFIRMED |
| sessGWed1 (Mié 18:00) | **Invitado** | Lucía tiene BookingInvitation PENDING |
| Resto GROUP sessions | **Disponible** | Sin booking ni invitación |

### BookingInvitation
- Lucía → sessGWed1 (Funcional Grupal Tarde, semana 1) — status: PENDING
- Coach que invitó: Felipe Soto
- Mensaje: "Te esperamos en el Funcional Grupal del miércoles"

---

## Checklist QA — ADMIN

- [ ] Login con Google → Home de admin
- [ ] `/admin/members` — lista todos los usuarios
- [ ] Crear nuevo MEMBER (email ficticio)
- [ ] Editar nombre/status de un miembro
- [ ] Asignar/cambiar rol (MEMBER → COACH)
- [ ] `/admin/memberships` — lista todas las membresías con estados
- [ ] Crear membresía GROUP para Sofía (para demostrar renovación)
- [ ] Renovar membresía de Lucía (antes de vencimiento)
- [ ] `/calendar` — ver todas las clases sin chip "Invitado"
- [ ] `/classes` — lista de sesiones
- [ ] Invitar miembro desde detalle de clase (clases PT o KINESIO)
- [ ] Crear/editar anuncio desde `/announcements`

## Checklist QA — COACH (Felipe Soto)

- [ ] Login con Google → Home de coach (próximas sesiones, inscritos)
- [ ] `/calendar` — ve todas las clases
- [ ] `/classes` — ve sus sesiones asignadas como operables
- [ ] Entrar a sessGMon1 → ve lista de inscritos (Ana, Carlos, Lucía)
- [ ] Registrar asistencia: ATTENDED / ABSENT por miembro
- [ ] Invitar a Lucía o Ana a sessP1 (si es coach de esa sesión)
- [ ] Verificar que NO puede ver inscritos de sesiones de Marisol
- [ ] Verificar que NO puede editar membresías de miembros no asignados
- [ ] `/calendar` — NO aparece chip "Invitado" en ninguna clase

## Checklist QA — MEMBER Lucía Pérez (GROUP, todos los estados demo)

- [ ] Login con Google → Home con alerta "membresía expira pronto"
- [ ] Home muestra bloque de solicitudes pendientes (1 invitación)
- [ ] `/calendar` semana actual:
  - [ ] Lun 07:00 Funcional Express → chip "Sin cupos"
  - [ ] Lun 08:00 Funcional Grupal Mañana → chip "Reservada"
  - [ ] Mié 18:00 Funcional Grupal Tarde → chip "Invitado"
  - [ ] Otras semanas → "Disponible"
- [ ] Click en clase "Invitado" → modal muestra aviso ámbar + "Ver solicitud →"
- [ ] Click en "Ver solicitud →" → navega a `/solicitudes`
- [ ] `/solicitudes` — invitación listada con botones "Asistiré" / "No asistiré"
- [ ] Presionar "Asistiré" → booking creado, chip cambia a "Reservada"
- [ ] Presionar "No asistiré" en otra invitación → desaparece de solicitudes
- [ ] Reservar una clase GROUP disponible (semana 2+)
- [ ] Cancelar reserva (antes de 2 horas → sesión devuelta a membresía)
- [ ] `/profile` — datos del perfil visibles

## Checklist QA — MEMBER Sofía Ramos (GROUP expirada)

- [ ] Login con Google → Home con alerta "membresía vencida"
- [ ] `/calendar` — ve clases visibles (GROUP)
- [ ] Intentar reservar una clase → error "membresía vencida"
- [ ] No aparecen solicitudes pendientes

## Checklist QA — MEMBER Ana García (PT)

- [ ] Login → Home sin alertas (PT activa, 8 sesiones disponibles)
- [ ] `/calendar` — ve sesiones PT (Martes) y GROUP (si tiene membresía)
- [ ] sessP1 → chip "Reservada" (ya tiene booking)
- [ ] `/profile` → membresía PT activa visible

---

## Datos de prueba a NO incluir en demo real

- Emails `performanceprimary.task@gmail.com`, `primary.coach.test@gmail.com`
- Sesión `test_sess_pt_coach` (creada por scripts de validación)
- Membresía `test_membr_pt`, `test_membr_pt_sol`
- Cualquier `BookingInvitation` creada por scripts untracked

Antes de demo real, verificar con:
```bash
npx tsx --env-file=.env.local prisma/validate-commit7.ts
```

---

## Advertencias

- Los emails `@primaryperf.com` son **placeholders**. Para una demo en vivo se deben reemplazar por emails Google reales de los participantes (Eduardo puede crear cuentas Google, o actualizar los emails directamente en la DB via admin panel).
- La DB es compartida con el ambiente local. No ejecutar el seed en producción sin revisar las variables de entorno primero.
- El seed elimina y recrea todas las sesiones en cada ejecución. Los bookings e invitaciones de sesiones seed también se resetean.
- Sesiones de test (`test_sess_*`) **no son afectadas** por el seed.
