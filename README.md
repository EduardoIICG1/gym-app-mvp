# Gym App MVP — Primary Performance

Web-app MVP para gestión operativa de gimnasio, con flujos completos para administración, coaches y miembros.

[![GitHub](https://img.shields.io/badge/GitHub-gym--app--mvp-blue)](https://github.com/EduardoIICG1/gym-app-mvp)
![Next.js](https://img.shields.io/badge/Next.js-16.2.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-green)

---

## Estado actual

- **Checkpoint:** `demo-v0.1`
- **Branch principal:** `master` — Fase 6 integrada
- **Preparado para:** demo local, control interno y prueba friends & family controlada
- **No es:** producción pública sin supervisión

---

## Qué resuelve

El MVP cubre los flujos operativos principales de un gimnasio boutique:

- Gestión de miembros (crear, editar, asignar roles)
- Gestión de membresías (crear, renovar, reactivar, controlar sesiones)
- Calendario de clases con estados en tiempo real
- Reservas por servicio con consumo de sesiones
- Invitaciones de coach a miembros
- Inbox de solicitudes para miembros
- Registro de asistencia (ATTENDED / ABSENT)
- Alertas de membresía: vencida, sin sesiones, por vencer
- CTA de contacto para renovación vía WhatsApp o mailto
- Visualización segura de compañeros inscritos (solo nombres, sin emails)

---

## Roles

| Rol | Capacidades principales |
|-----|-------------------------|
| **ADMIN** | Crear/editar miembros y coaches, gestionar membresías, ver todo el calendario, convocar alumnos, crear anuncios |
| **COACH** | Ver y gestionar sus clases, ver inscritos, convocar alumnos. No puede crear roles elevados |
| **MEMBER** | Ver clases disponibles, reservar, aceptar/rechazar invitaciones, cancelar inscripción, ver alertas |

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.3 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Prisma v7.8 + adapter-pg |
| Database | PostgreSQL (Supabase) |
| Auth | Auth.js v5 (NextAuth beta) + Google OAuth |
| Animaciones | Motion (Framer Motion v12) |
| Hosting objetivo | Vercel |

---

## Setup local

### Requisitos

- Node.js 18+
- Acceso a una instancia PostgreSQL (Supabase u otro)
- Credenciales Google OAuth configuradas

### Instalación

```bash
# 1. Clonar
git clone https://github.com/EduardoIICG1/gym-app-mvp.git
cd gym-app-mvp

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Completar .env.local con los valores reales

# 4. Generar cliente Prisma
npx prisma generate

# 5. Sincronizar schema con la DB (solo primera vez o tras cambios de schema)
npx prisma db push

# 6. Cargar datos demo (solo para desarrollo/demo — NO en producción)
npx tsx --env-file=.env.local prisma/seed.ts

# 7. Verificar build
npm run build

# 8. Iniciar servidor de desarrollo
npm run dev
```

> El seed es idempotente — re-ejecutarlo restaura los estados demo y recalcula fechas futuras.
> **No correr el seed en producción** sin una decisión explícita — borra y recrea sesiones.

---

## Variables de entorno

Copiar `.env.example` como `.env.local` y completar los valores:

### Obligatorias

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL del connection pooler (Supabase: puerto 6543) |
| `DIRECT_URL` | URL de conexión directa para Prisma CLI (puerto 5432) |
| `AUTH_SECRET` | Secreto JWT para Auth.js — generar con `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Client ID de Google OAuth |
| `AUTH_GOOGLE_SECRET` | Client Secret de Google OAuth |
| `AUTH_URL` | URL pública del entorno — `https://tu-app.vercel.app` en producción |

### Opcionales

| Variable | Efecto si no está definida |
|----------|---------------------------|
| `NEXT_PUBLIC_GYM_WHATSAPP_NUMBER` | CTA de renovación no aparece |
| `NEXT_PUBLIC_GYM_CONTACT_EMAIL` | CTA no aparece (fallback si no hay WhatsApp) |

---

## Deploy en Vercel

### Checklist antes de conectar

1. Configurar todas las variables obligatorias en Vercel Dashboard
2. `AUTH_URL` debe ser la URL de producción — **no localhost**
3. Agregar `https://{vercel-domain}/api/auth/callback/google` como redirect URI autorizado en [Google Cloud Console](https://console.cloud.google.com/)
4. Confirmar que el schema de la DB de producción está sincronizado (`npx prisma db push`)
5. Las cuentas de usuario deben existir en la DB antes de que puedan hacer login

### Configuración de build en Vercel

```
Build Command:   npm run build   # incluye prisma generate automáticamente
Output:          .next
Root Directory:  .
```

> No agregar el seed como Build Command ni Post-build Hook.

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/demo-readiness.md](docs/demo-readiness.md) | Cuentas de prueba, estados demo, checklists QA por rol |
| [docs/friends-family-readiness.md](docs/friends-family-readiness.md) | Guía de preparación para prueba controlada con usuarios externos |
| [docs/next-session.md](docs/next-session.md) | Notas técnicas y decisiones de arquitectura de sesiones anteriores |

---

## Fuera de alcance actual

- Pagos reales (tarjeta, transferencia, POS)
- Subida de comprobantes de pago
- WhatsApp API real (solo link prellenado)
- Notificaciones automáticas (email, push)
- Multi-tenant productivo (múltiples gimnasios)
- Módulo Health / Kinesiología con flujo dedicado
- Panel financiero con filtros de ingresos
- Producción pública sin monitoreo manual

---

## Nota de portfolio

Este proyecto demuestra un ciclo completo de desarrollo de producto:

- Modelado de datos (schema Prisma, relaciones, constraints)
- APIs REST con validación de roles y acceso (ADMIN / COACH / MEMBER)
- UI por rol con estados condicionales y flujos de negocio
- Autenticación con Google OAuth y JWT (Auth.js v5)
- Reglas de negocio: consumo de sesiones, membresías, política de cancelación
- Seed idempotente con escenarios demo reproducibles
- QA visual por rol antes de cada commit
- Documentación operativa y de deployment
- CI-ready: build limpio con TypeScript estricto

Construido iterativamente con Claude Code como herramienta principal de desarrollo.

---

**Última actualización:** 2026-05-27 — Checkpoint `demo-v0.1`
