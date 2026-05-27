# Friends & Family Readiness — Primary Performance

Este documento cubre el estado de preparación para una prueba controlada de friends & family.
Es distinto de `demo-readiness.md`, que cubre validación técnica de escenarios individuales.

---

## A. Estado del MVP

Este MVP está preparado para una prueba friends & family controlada con usuarios definidos, datos semilla conocidos y monitoreo manual.
No está diseñado todavía para operación pública sin supervisión.

**Versión actual:** `feat/fase-6-persistence-auth` — commit `17d3338`

---

## B. Cuentas de prueba

Todas las cuentas usan **Google OAuth**. Solo las siguientes pueden hacer login real:

| Email | Rol | Escenario |
|-------|-----|-----------|
| `lalopeluuza01@gmail.com` | ADMIN | Panel completo — gestión total |
| `primary.coach.test@gmail.com` | COACH | Sesiones GROUP + KINESIO, convocar alumnos |
| `performanceprimary.task@gmail.com` | MEMBER GROUP | Todos los estados calendario + alerta "por vencer" |
| `laloosky@gmail.com` | MEMBER PT | PT activo, sesión reservada |
| `evergara.ing@gmail.com` | MEMBER vencido | Alerta roja "membresía vencida", calendario bloqueado |

### Caso sin sesiones (placeholder, sin login real)

| Email | Nota |
|-------|------|
| `luciap@primaryperf.com` | GROUP ACTIVE, 5/5 sesiones usadas — estado visible en `/admin/memberships`, no como login visual |

---

## C. Cómo preparar el entorno

```bash
# 1. Instalar dependencias
npm install

# 2. Generar cliente Prisma
npx prisma generate

# 3. Cargar datos demo (idempotente — se puede repetir)
npx tsx --env-file=.env.local prisma/seed.ts

# 4. Verificar build
npm run build

# 5. Iniciar servidor de desarrollo
npm run dev
```

> Re-ejecutar el seed antes de cada sesión de demo garantiza fechas futuras y estado limpio.

---

## D. Variables opcionales de contacto

```
# .env.local — agregar sin valores reales por defecto
NEXT_PUBLIC_GYM_WHATSAPP_NUMBER=521XXXXXXXXXX  # abre wa.me con mensaje prellenado
NEXT_PUBLIC_GYM_CONTACT_EMAIL=gym@ejemplo.com  # fallback si no hay WhatsApp
```

**Reglas:**
- Si `NEXT_PUBLIC_GYM_WHATSAPP_NUMBER` existe → botón "Contactar para renovar" abre WhatsApp.
- Si no existe pero `NEXT_PUBLIC_GYM_CONTACT_EMAIL` existe → abre mailto.
- Si ninguna está definida → el botón no aparece; solo texto de alerta.
- No hay pagos reales dentro de la app.

El botón aparece en alertas: membresía vencida, sin sesiones, por vencer.
No aparece en alertas de invitación pendiente.

---

## E. Flujos validados

### ADMIN (`lalopeluuza01@gmail.com`)

- [x] Login con Google → Home de admin
- [x] Crear MEMBER, COACH y ADMIN (formulario separado por rol)
- [x] Servicios contratados visibles solo al crear MEMBER
- [x] Ver y editar lista de miembros
- [x] Crear y renovar membresías
- [x] Ver calendario completo
- [x] Ver inscritos en detalle de clase con emails
- [x] Invitar alumno a clase desde detalle
- [x] Registrar asistencia: ATTENDED / ABSENT
- [x] Crear y archivar anuncios

### COACH (`primary.coach.test@gmail.com`)

- [x] Login con Google → Home de coach
- [x] Ver calendario — todas las clases visibles
- [x] Ver solo sus clases como gestionables
- [x] Ver lista de inscritos (nombres + emails en sus clases)
- [x] No puede ver inscritos de clases de otro coach
- [x] Convocar alumno desde detalle de clase
- [x] No puede crear COACH ni ADMIN

### MEMBER (`performanceprimary.task@gmail.com`, `laloosky@gmail.com`)

- [x] Login con Google → Home con alertas si corresponde
- [x] Ver invitaciones pendientes en Home
- [x] Aceptar / rechazar invitación desde detalle de clase
- [x] Reservar clase disponible (si tiene membresía activa con sesiones)
- [x] Cancelar reserva propia desde detalle de clase
- [x] Ver compañeros inscritos solo por nombre (sin emails ni datos privados)
- [x] Ver chip correcto en calendario: Reservada / Invitado / Disponible / Sin cupos
- [x] Alerta naranja "por vencer" en Home si membresía vence en ≤7 días
- [x] Alerta roja "vencida" en Home si membresía expiró
- [x] Alerta ámbar "sin sesiones" si agotó sesiones
- [x] Calendario bloquea reserva si membresía no cubre el servicio

---

## F. Flujos no incluidos todavía

Los siguientes flujos están fuera del alcance de esta prueba friends & family:

- Pagos reales (tarjeta, transferencia, POS)
- Link de pago integrado
- Subida de comprobantes
- WhatsApp API real (solo link prellenado por ahora)
- Notificaciones automáticas (email, push)
- Producción multi-tenant (múltiples gimnasios)
- Panel financiero avanzado
- Filtro de ingresos por fecha
- Módulo Health / Kinesiología con flujo dedicado
- Gestión avanzada de múltiples servicios por usuario con coach distinto por cada uno
- Asignación de coach por servicio con flujo de UI propio

---

## G. Riesgos conocidos

| Riesgo | Estado |
|--------|--------|
| Caso "sin sesiones" sin cuenta Google real | Conocido — validable solo desde admin panel |
| CTA renovación depende de env vars no definidas por defecto | Conocido — botón no aparece sin configurar vars |
| Friends & family requiere monitoreo manual | Requerido — no hay alertas automáticas |
| Correr seed resetea datos demo | Documentado — avisar antes de la sesión |
| Emails de alumnos no visibles entre miembros | Verificado — solo nombres en detalle de clase |
| No prometer pagos integrados a participantes | Requerido — comunicar alcance antes |
| Datos reales sensibles no deben ingresarse todavía | Requerido — solo datos de prueba |

---

## H. Checklist antes de la prueba

### Entorno

- [ ] Confirmar que `.env.local` tiene `DATABASE_URL` apuntando a la DB correcta
- [ ] Correr `npx tsx --env-file=.env.local prisma/seed.ts` y verificar salida sin errores
- [ ] Correr `npm run build` — sin errores TypeScript ni de compilación
- [ ] Correr `npm run dev` — app arranca en `localhost:3000`

### Variables opcionales (si se quiere probar CTA)

- [ ] Definir `NEXT_PUBLIC_GYM_WHATSAPP_NUMBER` con número real (formato: `521XXXXXXXXXX`)
- [ ] O definir `NEXT_PUBLIC_GYM_CONTACT_EMAIL` como fallback
- [ ] Rebuild después de definir las vars (`npm run build && npm run dev`)

### Validación por rol

- [ ] Login ADMIN → Home, panel, crear miembro, crear membresía
- [ ] Login COACH → Home, calendario, clase propia, inscritos, convocar
- [ ] Login MEMBER GROUP (`performanceprimary.task`) → alerta "por vencer", invitación, reserva, cancelación
- [ ] Login MEMBER PT (`laloosky`) → Home sin alertas, sesión PT reservada, perfil correcto
- [ ] Login MEMBER EXPIRED (`evergara.ing`) → alerta roja, calendario bloqueado

### Seguridad mínima

- [ ] MEMBER no ve emails de otros miembros en detalle de clase
- [ ] MEMBER no puede gestionar reservas de otros miembros
- [ ] COACH no puede ver inscritos de clases ajenas
- [ ] COACH no puede crear COACH ni ADMIN

### Comunicación con participantes

- [ ] Informar a participantes que es una prueba controlada, no producción final
- [ ] Aclarar que no hay pagos reales dentro de la app
- [ ] Definir canal de soporte manual (WhatsApp, email, etc.)
- [ ] Definir quién monitorea feedback durante la prueba

---

## I. Criterio para INICIAR friends & family

La prueba puede iniciar cuando se cumple **todo** lo siguiente:

- Build limpio (`npm run build` sin errores)
- Seed aplicado exitosamente
- Las 5 cuentas Google reales pueden hacer login
- Flujos core de ADMIN, COACH y MEMBER validados manualmente
- Bugs críticos = 0
- Bugs menores conocidos documentados
- Responsable de soporte durante la prueba definido

---

## J. Criterio para NO iniciar

No iniciar si alguno de los siguientes falla:

- Login falla para cualquiera de las cuentas reales
- Reservas no se crean o no se cancelan correctamente
- Miembros pueden ver emails u otros datos privados de compañeros
- COACH puede editar o ver inscritos de clases de otro coach
- ADMIN no puede gestionar membresías o crear usuarios
- Build falla o TypeScript reporta errores
- Base de datos no está estable o seed falla

---

## Referencias

- [docs/demo-readiness.md](demo-readiness.md) — Validación técnica detallada por escenario
- [docs/00_CONTEXTO_GYM.md](00_CONTEXTO_GYM.md) — Contexto de negocio
- Branch activa: `feat/fase-6-persistence-auth`
