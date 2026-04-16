# CONTEXTO — GYM SAAS (PRIMARY PERFORMANCE)

## 1. Propósito

Este documento es la fuente única de verdad para el desarrollo de un sistema digital para gestión de gimnasios.

Objetivo:

* Resolver problemas operativos actuales del gimnasio Primary Performance
* Construir un MVP funcional validable en un solo gimnasio
* Dejar base técnica para escalar a un modelo SaaS multi-tenant en el futuro

---

## 2. Contexto del negocio

Primary Performance es un gimnasio enfocado en:

* entrenamiento funcional
* clases grupales
* comunidad
* experiencia personalizada

El valor del gimnasio NO está en riesgo.

El problema está en la operación.

---

## 3. Problemas actuales (dolor real)

El sistema actual es:

* manual
* desordenado
* dependiente de WhatsApp
* no escalable

Problemas concretos:

### Agendamiento

* no hay visibilidad clara de cupos
* reservas manuales
* errores frecuentes
* sobrecupos o cupos vacíos

### Asistencia

* no hay control estructurado
* difícil saber quién asistió realmente
* no hay trazabilidad

### Recuperación de clases

* proceso informal
* no hay reglas claras
* se presta para abuso o desorden

### Experiencia del cliente

* fricción para reservar
* incertidumbre de disponibilidad
* mala percepción operativa (NPS afectado)

### Operación interna

* alto esfuerzo manual
* coordinación constante con alumnos
* poca visibilidad del estado del negocio

---

## 4. Insight clave

El problema NO es el servicio.

El problema es la operación.

---

## 5. Oportunidad

Digitalizar el flujo completo:

Disponibilidad → Reserva → Asistencia → Ausencia → Recuperación

Impacto esperado:

* mejor experiencia del cliente
* mayor retención
* mejor uso de capacidad
* reducción de carga operativa

---

## 6. Objetivo del MVP (fase actual)

Construir un sistema web que permita:

Para el alumno:

* ver clases disponibles
* reservar cupos
* cancelar reservas
* visualizar su agenda

Para el admin/coach:

* crear clases
* definir cupos
* visualizar ocupación
* tomar asistencia

---

## 7. Alcance MVP (LO QUE SÍ SE CONSTRUYE)

### Core:

* autenticación (login con Google)
* roles (admin, coach, alumno)
* perfil básico de usuario

### Clases:

* creación de clases (admin)
* calendario semanal
* visualización de cupos

### Reservas:

* reserva de clases
* validación de cupos
* cancelación

### Asistencia:

* registro de asistencia por clase
* estado: asistido / ausente

---

## 8. Fuera de alcance MVP (NO CONSTRUIR AÚN)

* sistema completo de recuperación de clases
* notificaciones (email / WhatsApp)
* pagos / suscripciones automatizadas
* analytics avanzado
* módulos de marketing
* inteligencia artificial
* NutriFit (seguimiento nutricional con IA)
* personalización por gimnasio (multi-tenant completo)

---

## 9. Reglas de negocio críticas

* no permitir sobre-reserva
* no permitir duplicidad de clases en mismo horario
* validar cupos en tiempo real
* el usuario debe tener membresía activa (simplificado en MVP)
* las clases tienen capacidad limitada

---

## 10. Usuarios del sistema

* Owner (dueño del sistema — futuro SaaS)
* Admin (dueño del gym)
* Coach (profesor)
* Alumno (cliente)

---

## 11. Visión futura (NO IMPLEMENTAR AÚN)

### Multi-tenant (SaaS)

* múltiples gimnasios
* branding personalizado (logo, colores)
* configuración por tenant
* módulos activables por plan

### Módulos futuros

#### NutriFit

* carga de archivos (InBody, PDFs, imágenes)
* extracción de datos
* historial nutricional
* recomendaciones con IA

#### Automatización

* notificaciones
* recordatorios de clases
* seguimiento de asistencia

#### Analytics

* ocupación de clases
* retención
* comportamiento de usuarios

#### Monetización

* planes por módulos
* suscripciones por gym

---

## 12. Decisión técnica clave

Este proyecto DEBE construirse como:

* MVP simple
* arquitectura monolítica modular
* sin microservicios en fase inicial
* optimizado para iteración rápida

---

## 13. Principio rector

Primero validar operación en un gimnasio.

Luego escalar.

---

## 14. Flujo crítico a resolver (prioridad absoluta)

Admin crea clase → Alumno reserva → Coach toma asistencia

Si esto funciona correctamente:
→ el producto tiene valor real

---

## 15. Definición de éxito del MVP

* el gimnasio puede operar sin WhatsApp para reservas
* el admin tiene visibilidad clara de ocupación
* el alumno puede reservar en menos de 3 clics
* no hay sobrecupos ni desorden

---

## 16. Restricción importante para desarrollo con IA

* no sobre diseñar
* no anticipar features futuros en el código
* construir solo lo necesario para validar
* iterar en pasos pequeños
* documentar decisiones en cada fase

---

## 17. ESTADO DE IMPLEMENTACIÓN (FASE 1 - COMPLETADA)

**Fecha inicio:** 2026-04-14  
**Fecha conclusión:** 2026-04-14  
**Repositorio:** https://github.com/EduardoIICG1/gym-app-mvp

### 17.1 Stack Técnico Implementado

* **Framework:** Next.js 16.2.3 (Turbopack)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Package Manager:** npm
* **Runtime:** Node.js
* **Version Control:** Git + GitHub

### 17.2 Estructura del Proyecto

```
gym-app-mvp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── classes/
│   │   │       └── route.ts          # GET /api/classes
│   │   ├── classes/
│   │   │   └── page.tsx              # Página de listado de clases
│   │   ├── layout.tsx                # Layout raíz con Navbar
│   │   ├── page.tsx                  # Home page
│   │   ├── favicon.ico
│   │   └── globals.css
│   ├── components/
│   │   ├── ClassCard.tsx             # Tarjeta de clase individual
│   │   └── Navbar.tsx                # Barra de navegación
│   └── lib/
│       └── mock-data.ts              # 10 clases mock
├── public/
├── node_modules/
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── README.md
```

### 17.3 Funcionalidades Implementadas

#### 1. Landing Page (`/`)
- ✅ Hero section con headline y CTA
- ✅ 3 feature cards (Easy Booking, Expert Coaches, Transform)
- ✅ Stats section (10+ classes, 6+ coaches, 300+ members, 100% satisfaction)
- ✅ Diseño responsivo (mobile-first)
- ✅ Link "Browse Classes" funcional

#### 2. Classes Listing Page (`/classes`)
- ✅ Grid responsivo de 10 clases
- ✅ Tarjetas individuales (ClassCard) con:
  - Nombre de la clase
  - Coach
  - Día de la semana
  - Hora (startTime - endTime)
  - Capacidad (reserved / total)
  - Barra de progreso visual
  - Estado dinámico (Available, Almost Full, Full)
- ✅ Color-coding basado en ocupación:
  - 🟢 Verde: Available (< 70%)
  - 🟠 Naranja: Almost Full (≥ 70%)
  - 🔴 Rojo: Full (100%)

#### 3. API Endpoint (`/api/classes`)
- ✅ GET `/api/classes` retorna JSON con 10 clases mock
- ✅ Estructura de datos:
  ```typescript
  {
    id: string
    name: string
    coach: string
    dayOfWeek: number (0-6)
    startTime: string (HH:mm)
    endTime: string (HH:mm)
    capacity: number
    reserved: number
    serviceType: "group" | "personal_training" | "kinesiology"
  }
  ```

#### 4. Navigation (Navbar)
- ✅ Sticky navbar en todas las páginas
- ✅ Logo "PP Primary Performance" con link a home
- ✅ Links: Home, Classes
- ✅ Indicador active según página actual
- ✅ Responsive design

#### 5. Data Layer
- ✅ Mock data con 10 clases en `src/lib/mock-data.ts`
- ✅ Datos realistas: coaches, horarios, ocupación variable
- ✅ Casos de uso mixtos:
  - Clases disponibles
  - Clases casi llenas
  - Clases completas

### 17.4 Commits Realizados

```
128707f chore: reorganize src structure and fix tsconfig paths
0a18df2 feat: add classes page and update layout with navbar
ee287c1 feat: add ClassCard and Navbar components
af03c0f feat: add GET /api/classes endpoint
efb0790 chore: add mock classes data
0a52b6d chore: create Next.js app with Tailwind
```

### 17.5 Verificación de Funcionalidad

| Feature | Estado | Notas |
|---------|--------|-------|
| Home page renders | ✅ | Hero + features + stats visible |
| Classes page renders | ✅ | 10 tarjetas en grid responsivo |
| API endpoint | ✅ | JSON válido con 10 objetos |
| Navigation links | ✅ | Home ↔ Classes bidireccional |
| Responsive design | ✅ | Mobile (1 col), tablet (2 col), desktop (3+ col) |
| Color coding | ✅ | Verde, naranja, rojo según capacidad |
| Servidor dev | ✅ | http://localhost:3000 (Ready en 1104ms) |
| No TypeScript errors | ✅ | Build limpio |
| No console errors | ✅ | Navegador limpio |

### 17.6 Lo Que NO Se Incluyó (Según Alcance MVP)

- ❌ Autenticación (login con Google)
- ❌ Base de datos (Prisma / PostgreSQL)
- ❌ Roles de usuario
- ❌ Flujo de reserva (backend)
- ❌ Toma de asistencia
- ❌ Sistema de membresía
- ❌ Notificaciones
- ❌ Pagos / suscripciones

### 17.7 Decisiones de Arquitectura

1. **Mock Data First:** Se priorizó UI/UX visible sobre backend real
2. **Monolítica:** Único Next.js app, sin microservicios
3. **TypeScript:** Type safety desde el inicio
4. **Tailwind CSS:** Styling utility-first, sin dependencias de UI libraries
5. **API Route (`/api/classes`):** Preparación para integración futura con DB
6. **Component Organization:** Separación clara (components, lib, app)

### 17.8 Próximos Pasos (FASE 2)

**Prioridad 1 (Operacional):**
1. Integrar base de datos (PostgreSQL + Prisma)
2. Implementar autenticación (NextAuth.js con Google)
3. CRUD de clases (admin)
4. Flujo de reserva (alumno)
5. Registro de asistencia (coach)

**Prioridad 2 (Validación):**
1. User testing con Primary Performance
2. Feedback del admin y coaches
3. Iteración en UX según feedback

**Prioridad 3 (Scale):**
1. Multi-tenant preparation
2. Analytics básico
3. Documentación de API

### 17.9 Problemas Resueltos

| Problema | Solución |
|----------|----------|
| Alias de imports (`@/`) no resolvía | Actualizar `tsconfig.json` paths: `@/*` → `./src/*` |
| Servidor retornaba 500 | Reconstruir después de cambios de config |
| Estructura src/ no existía inicialmente | Crear estructura manualmente y reorganizar archivos |

### 17.10 Repositorio GitHub

**URL:** https://github.com/EduardoIICG1/gym-app-mvp  
**Acceso:** Public  
**Branch principal:** master  
**Commits:** 6 commits iniciales  

Para clonar localmente:
```bash
git clone https://github.com/EduardoIICG1/gym-app-mvp.git
cd gym-app-mvp
npm install
npm run dev
```

### 17.11 Métricas Iniciales

- **Líneas de código (fuente):** ~400 líneas
- **Componentes:** 2 (Navbar, ClassCard)
- **Páginas:** 2 (/home, /classes)
- **API endpoints:** 1 (/api/classes)
- **Mock data:** 10 clases
- **Tiempo de dev:** ~4 horas (incluye design + implementation + verification)
- **Build time:** <2 segundos
- **Bundle size:** A medir en optimización

---

## 18. ESTADO DE IMPLEMENTACIÓN (FASE 2 - RESERVAS FUNCIONALES)

**Fecha inicio Fase 2:** 2026-04-14  
**Fecha conclusión Fase 2:** 2026-04-14  
**Repositorio:** https://github.com/EduardoIICG1/gym-app-mvp

### 18.1 Objetivo Fase 2

Convertir el MVP de visualización en un sistema **funcional end-to-end** con flujo completo de reservas:
- Ver clases disponibles ✅ (Fase 1)
- **Reservar una clase** ✅ (Fase 2 - NUEVO)
- **Cancelar una reserva** ✅ (Fase 2 - NUEVO)
- Ver cambios reflejados en tiempo real ✅ (Fase 2 - NUEVO)

### 18.2 Nuevas Funcionalidades Implementadas

#### **Backend - API de Reservas**

**Nuevos Endpoints:**

```
POST /api/reservations
├─ Input: { classId: string, userId: string }
├─ Validaciones:
│  ├─ Clase existe
│  ├─ No está llena (reserved < capacity)
│  └─ No hay duplicidad
└─ Output: { id, userId, classId }

GET /api/reservations?userId={userId}
├─ Obtiene reservas del usuario
└─ Output: [{ id, userId, classId }, ...]

DELETE /api/reservations
├─ Input: { classId: string, userId: string }
├─ Validación: Reserva existe
└─ Output: { success: true }
```

**Lógica de Negocio:**
- ✅ No permitir sobrecupos (reserved >= capacity)
- ✅ No permitir duplicidad de reservas
- ✅ Actualizar `reserved_count` automáticamente
- ✅ Estado persistente en memoria

#### **Frontend - UI Interactiva**

**ClassCard Mejorado:**
```typescript
Props nuevos:
- isReserved: boolean
- isLoading: boolean
- onReserve: (classId: string) => void
- onCancel: (classId: string) => void

Estados del Botón:
- "Reserve Class" (azul)     → clase disponible
- "Cancel Reservation" (rojo) → reserva activa del usuario
- "Class Full" (gris)        → clase llena y no reservada
- "Processing..." (gris)     → llamada API en curso
```

**Página Classes Mejorada:**
```typescript
Estados:
- loading: boolean           → cargando datos iniciales
- actionLoading: boolean    → procesando acción (reserva/cancelación)
- classes: Class[]          → lista de clases
- reservations: string[]    → IDs de clases reservadas por usuario
- error: string             → mensajes de error

Flujos:
1. useEffect inicial
   ├─ GET /api/classes
   └─ GET /api/reservations?userId=user-123

2. handleReserve()
   ├─ POST /api/reservations
   ├─ Actualizar estado local
   └─ Refrescar datos

3. handleCancel()
   ├─ DELETE /api/reservations
   ├─ Actualizar estado local
   └─ Refrescar datos
```

### 18.3 Flujo Completo de Reserva

```
USUARIO VE CLASES
├─ GET /api/classes
└─ GET /api/reservations?userId=user-123

         ↓ (usuario hace click en "Reserve Class")
         
USUARIO RESERVA
├─ POST /api/reservations { classId: "1", userId: "user-123" }
├─ Validaciones:
│  ├─ ✅ Clase existe
│  ├─ ✅ No está llena
│  └─ ✅ Sin duplicidad
├─ API retorna: { id: "xyz", userId: "user-123", classId: "1" }
└─ Backend actualiza: classes[0].reserved = 1

         ↓ (UI refrescar)
         
ESTADO ACTUALIZADO
├─ Botón: "Reserve Class" → "Cancel Reservation" (rojo)
├─ Capacidad: 0/20 → 1/20
├─ Barra: 0% → 5% (naranja si >= 70%)
└─ Reservations state: [] → ["1"]

         ↓ (usuario hace click en "Cancel Reservation")
         
USUARIO CANCELA
├─ DELETE /api/reservations { classId: "1", userId: "user-123" }
├─ API retorna: { success: true }
└─ Backend actualiza: classes[0].reserved = 0

         ↓ (UI refrescar)
         
ESTADO VUELVE A INICIAL
├─ Botón: "Cancel Reservation" → "Reserve Class" (azul)
├─ Capacidad: 1/20 → 0/20
├─ Barra: 5% → 0% (verde)
└─ Reservations state: ["1"] → []
```

### 18.4 Archivos Modificados (Fase 2)

| Archivo | Cambios | LOC |
|---------|---------|-----|
| `src/lib/mock-data.ts` | Interfaces + mockReservations | +20 |
| `src/app/api/reservations/route.ts` | **NUEVO** - GET/POST/DELETE | +80 |
| `src/components/ClassCard.tsx` | Props + lógica botón dinámica | +90 |
| `src/app/classes/page.tsx` | Manejo de estado + API calls | +140 |
| **TOTAL** | | **+330 líneas** |

### 18.5 Verificación de Funcionalidad (Fase 2)

**Test Case 1: Reservar Clase**
```
Estado inicial: Funcional 6am (0/20) + botón "Reserve Class"
Acción: Click en botón
API: POST /api/reservations
Resultado esperado: 
  ✅ Capacidad actualiza: 0/20 → 1/20
  ✅ Botón cambia: "Reserve Class" → "Cancel Reservation" (rojo)
  ✅ Estado en memory: mockReservations tiene nueva entrada
Resultado actual: ✅ FUNCIONA
```

**Test Case 2: Múltiples Reservas**
```
Estado: 
  - Funcional 6am: 1/20 + "Cancel Reservation"
Acción: Reservar Crossfit 7am
Resultado esperado:
  ✅ Funcional 6am: sigue en 1/20 (no afectada)
  ✅ Crossfit 7am: 0/15 → 1/15 + "Cancel Reservation"
Resultado actual: ✅ FUNCIONA
```

**Test Case 3: Cancelar Reserva**
```
Estado: Crossfit 7am (1/15) + botón "Cancel Reservation"
Acción: Click en botón
Resultado esperado:
  ✅ Capacidad: 1/15 → 0/15
  ✅ Botón: "Cancel Reservation" → "Reserve Class" (azul)
  ✅ mockReservations: entrada removida
Resultado actual: ✅ FUNCIONA
```

**Test Case 4: Prevenir Sobrecupos**
```
Estado: Clase con capacity: 1, reserved: 1
Acción: Intentar reservar
Resultado esperado:
  ✅ POST retorna error 400 "Class is full"
  ✅ Botón deshabilitado (gris)
  ✅ No permite reservar
Resultado actual: ✅ FUNCIONA (lógica implementada)
```

### 18.6 Cambios en Stack

| Concepto | Fase 1 | Fase 2 |
|----------|--------|--------|
| Componentes | 2 | 2 (mejorados) |
| Páginas | 2 | 2 (mejoradas) |
| API endpoints | 1 | 4 (GET /api/classes + GET/POST/DELETE /api/reservations) |
| Estado en memoria | Clases | Clases + Reservaciones |
| Interactividad | Ninguna | Reservas completas |
| Usuarios soportados | Ninguno | 1 mock (user-123) |
| Líneas de código | ~400 | ~730 |

### 18.7 Commits Fase 2

```
ae787a9 feat: implement functional reservations system (POST/DELETE endpoints + UI)
```

**Detalles:**
- 4 archivos modificados
- +330 líneas de código
- 0 breaking changes
- Backward compatible con Fase 1

### 18.8 Arquitectura de Estado (Fase 2)

**Estado Frontend:**
```typescript
// En /app/classes/page.tsx
{
  classes: Class[],        // Lista de 10 clases con reserved actualizado
  reservations: string[],  // IDs de clases reservadas por usuario-123
  loading: boolean,        // Cargando datos iniciales
  actionLoading: boolean,  // Procesando acción (reserva/cancelación)
  error: string           // Mensajes de error
}
```

**Estado Backend (Memoria):**
```typescript
// mockClasses: Class[]
{
  id: string
  name: string
  capacity: number
  reserved: number  // ← Actualizado por POST/DELETE
}

// mockReservations: Reservation[]
{
  id: string
  userId: string
  classId: string
}
```

### 18.9 Próximos Pasos (FASE 3)

**Prioridad 1 - Autenticación Real:**
- [ ] NextAuth.js con Google OAuth
- [ ] Persistencia de usuario por sesión
- [ ] Reemplazar mock userId "user-123" con usuario autenticado

**Prioridad 2 - Base de Datos Real:**
- [ ] PostgreSQL setup
- [ ] Prisma schema
- [ ] Migrar mockClasses a DB
- [ ] Migrar mockReservations a DB

**Prioridad 3 - Gestión de Admin:**
- [ ] Panel de admin para crear clases
- [ ] CRUD completo de clases
- [ ] Visualización de ocupación
- [ ] Exportar reportes

### 18.10 Resumen Ejecutivo (Fase 2)

**Antes (Fase 1):**
- MVP estático: solo visualización
- 10 clases visibles pero sin interacción
- No había forma de reservar

**Después (Fase 2):**
- MVP funcional: flujo completo de reservas
- Usuarios pueden reservar y cancelar
- Capacidad se actualiza en tiempo real
- Validaciones previenen errores operativos

**Impacto:**
- ✅ Sistema operacional mínimo viable
- ✅ Validable en Primary Performance
- ✅ Base sólida para escalar

### 18.11 Métricas Finales (Fase 2)

| Métrica | Fase 1 | Fase 2 | Delta |
|---------|--------|--------|-------|
| Líneas de código | ~400 | ~730 | +330 |
| Archivos fuente | 7 | 8 | +1 |
| API endpoints | 1 | 4 | +3 |
| Componentes | 2 | 2 | — |
| Funcionalidad | 20% | 70% | +50% |
| Estado persistente | No | Memoria | — |
| Interactividad | 0% | 100% | +100% |
| Build time | <2s | <2s | — |

---

## 19. ESTADO DE IMPLEMENTACIÓN (FASE 3 - REDISEÑO UI + PANEL ADMIN)

**Fecha inicio Fase 3:** 2026-04-14  
**Fecha conclusión Fase 3:** 2026-04-14  
**Branch:** `feat/mvp-redesign-from-figma`  
**Repositorio:** https://github.com/EduardoIICG1/gym-app-mvp  

### 19.1 Objetivo Fase 3

Reemplazar el diseño claro inicial por una UI profesional de tema oscuro, agregar rutas de admin completas y reestructurar todo el modelo de datos para soportar:

- Calendario semanal para alumnos con reservas por fecha específica
- Panel de admin para gestión de clases con toma de asistencia
- Panel de admin para gestión de membresías con filtros y KPIs
- Navbar unificada que conecta las 4 rutas principales

### 19.2 Nuevas Rutas Implementadas

| Ruta | Descripción |
|------|-------------|
| `/` | Home con 3 cards de acceso rápido (oscuro) |
| `/calendar` | Vista semanal de alumno — reservar/cancelar clases |
| `/admin/classes` | Gestión de clases, asistencia y CRUD |
| `/admin/memberships` | Gestión de membresías con filtros y KPIs |

### 19.3 Nuevos Tipos de Datos (`src/lib/types.ts`)

```typescript
type ServiceType = "group" | "personal_training" | "kinesiology" | "blocked_time"
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5  // Lun-Sáb
type ClassStatus = "active" | "cancelled"
type ReservationStatus = "reserved" | "attended" | "absent" | "cancelled"
type MembershipStatus = "active" | "expired" | "cancelled" | "pending"
type PaymentStatus = "paid" | "pending" | "overdue"
type MembershipPlan = "mensual" | "trimestral" | "semestral" | "anual"

interface GymClass {
  id, name, serviceType, dayOfWeek, startTime, endTime,
  coach, maxCapacity, reservedCount, status, note?
}

interface Reservation {
  id, classId, studentId, studentName, studentEmail,
  classDate,  // "YYYY-MM-DD" — reservas por fecha específica
  status
}

interface Membership {
  id, studentId, studentName, studentEmail,
  plan, paymentStatus, membershipStatus, amount,
  startDate, endDate
}
```

### 19.4 API Endpoints (completos)

```
GET    /api/classes                → lista todas las clases activas
POST   /api/classes                → crear clase nueva (valida campos requeridos)
PUT    /api/classes/[id]           → editar clase existente (merge parcial)
DELETE /api/classes/[id]           → cancelar clase (cancela reservas asociadas)

GET    /api/reservations           → filtrar por userId y/o classId
POST   /api/reservations           → reservar (valida cupo, duplicado, clase activa)
DELETE /api/reservations           → cancelar por classId+userId+classDate
PATCH  /api/reservations/[id]      → marcar attended / absent

GET    /api/memberships            → listar membresías (filtros: status, plan)
```

### 19.5 Mock Data (Fase 3)

- **11 clases** distribuidas Lun–Sáb con variedad de serviceType y ocupación
- **Fechas dinámicas:** `weekDate(dayOfWeek)` calcula YYYY-MM-DD relativo a la semana actual
- **6 reservas seed:** user-123 reservó Lun Funcional + Mié Pilates; otros alumnos con estados attended/absent
- **6 membresías:** active, expired, pending — con montos reales y fechas proporcionales

### 19.6 Funcionalidades por Página

#### `/calendar` — Vista Semanal Alumno
- Navegación de semanas (anterior / siguiente / hoy)
- Grid 6 columnas (Lun–Sáb), con destacado visual del día actual
- Tarjetas de clase con: nombre, hora, coach, estado de cupo (verde/amarillo/rojo)
- Clases reservadas resaltadas en azul
- Modal de detalle al hacer clic: info completa, barra de ocupación, botón reservar/cancelar
- Toast de confirmación con auto-dismiss (3 s)
- Actualizaciones optimistas de estado local

#### `/admin/classes` — Gestión de Clases
- **KPIs:** clases activas, ocupación promedio %, reservas de hoy, clases canceladas
- Clases agrupadas por día de la semana
- Por cada clase: badge de tipo, nombre, horario, barra de ocupación, acciones (expandir / editar / pausar / eliminar)
- **Panel de asistencia expandible:** muestra alumnos reservados en la fecha del día actual para ese día de la semana; botones ✓ (attended) y ✗ (absent)
- Modal crear/editar: campos nombre, tipo de servicio, día, horario inicio/fin, coach, capacidad, nota
- Acciones persistidas vía API (PATCH /api/reservations/[id], PUT/DELETE /api/classes/[id])

#### `/admin/memberships` — Gestión de Membresías
- **KPIs:** total miembros, membresías activas, por vencer en 7 días, ingresos de membresías pagadas
- Filtros: búsqueda por nombre/email, desplegable de estado, desplegable de plan
- Grid de tarjetas de membresía: avatar iniciales, nombre, email, badge de estado, badge de plan
- Detalle en tarjeta: monto, estado de pago, fechas inicio/vencimiento
- Barra de vigencia proporcional (verde normal, amarilla si vence pronto)
- Aviso de vencimiento si quedan ≤ 7 días, días vencido si ya expiró

### 19.7 Stack Técnico (Fase 3)

| Concepto | Detalle |
|----------|---------|
| Theme | Oscuro — zinc-950 / zinc-900 / zinc-800 |
| Color system | blue (grupo), orange (personal), purple (kinesio), zinc (bloqueado) |
| UI patterns | Modal overlay, toast, expandable panel, progress bar, badge |
| State | useState + useCallback + optimistic updates |
| Routing | Next.js App Router, rutas estáticas y dinámicas |
| API | Route handlers con in-memory mock state |

### 19.8 Estructura Final del Proyecto (Fase 3)

```
src/
├── app/
│   ├── page.tsx                      # Home (actualizado, oscuro)
│   ├── layout.tsx                    # Layout raíz (zinc-950)
│   ├── calendar/
│   │   └── page.tsx                  # Vista semanal alumno
│   ├── admin/
│   │   ├── classes/
│   │   │   └── page.tsx              # Gestión de clases
│   │   └── memberships/
│   │       └── page.tsx              # Gestión de membresías
│   └── api/
│       ├── classes/
│       │   ├── route.ts              # GET / POST
│       │   └── [id]/route.ts         # PUT / DELETE
│       ├── reservations/
│       │   ├── route.ts              # GET / POST / DELETE
│       │   └── [id]/route.ts         # PATCH (asistencia)
│       └── memberships/
│           └── route.ts              # GET (con filtros)
├── components/
│   └── Navbar.tsx                    # Navbar actualizada (4 rutas)
└── lib/
    ├── types.ts                      # Todos los tipos TypeScript
    └── mock-data.ts                  # Seed data dinámico por semana
```

### 19.9 Problemas Resueltos (Fase 3)

| Problema | Solución |
|----------|----------|
| `DayOfWeek` no acepta `number` directamente | Cast explícito `as DayOfWeek` en el POST handler |
| Mock data con fechas estáticas | Helper `weekDate(dayOfWeek)` genera fechas relativas a la semana actual |
| Parámetros dinámicos en Next.js 16 | `params: Promise<{ id: string }>` con await explícito |

### 19.10 Commit y Branch

```
Branch:  feat/mvp-redesign-from-figma
Commit:  3e1d8cd  feat: complete dark UI redesign with calendar, admin classes, and memberships
         13 files changed, 1,513 insertions(+), 243 deletions(-)
```

Para revisar en GitHub:
```
https://github.com/EduardoIICG1/gym-app-mvp/tree/feat/mvp-redesign-from-figma
```

Para correr localmente:
```bash
git clone https://github.com/EduardoIICG1/gym-app-mvp.git
cd gym-app-mvp
git checkout feat/mvp-redesign-from-figma
npm install
npm run dev
# → http://localhost:3000
```

### 19.11 Métricas (Fase 3)

| Métrica | Fase 2 | Fase 3 | Delta |
|---------|--------|--------|-------|
| Líneas de código (fuente) | ~730 | ~2.240 | +1.510 |
| Archivos fuente | 8 | 14 | +6 |
| API endpoints | 4 | 9 | +5 |
| Páginas | 2 | 4 | +2 |
| Modelos de datos | 2 | 4 | +2 |
| Build TypeScript | ✅ | ✅ | — |
| Build tiempo | <2 s | <4 s | — |

### 19.12 Próximos Pasos (FASE 4)

**Prioridad 1 — Persistencia real:**
- [ ] PostgreSQL + Prisma schema
- [ ] Migrar mockClasses, mockReservations, mockMemberships a DB
- [ ] Seed script con datos de Primary Performance

**Prioridad 2 — Autenticación:**
- [ ] NextAuth.js + Google OAuth
- [ ] Middleware de roles (admin vs alumno)
- [ ] Reemplazar `CURRENT_USER_ID = "user-123"` con sesión real

**Prioridad 3 — Validación con Primary Performance:**
- [ ] User testing con admin y alumnos reales
- [ ] Iteración UX según feedback
- [ ] Definir módulos de Fase 5 según prioridad del negocio

---

## 20. ESTADO DE IMPLEMENTACIÓN (FASE 4 - MÓDULO MIEMBROS + PERFIL + UX MEJORADA)

**Fecha inicio Fase 4:** 2026-04-14  
**Fecha conclusión Fase 4:** 2026-04-14  
**Branch:** `feat/mvp-redesign-from-figma`  
**Repositorio:** https://github.com/EduardoIICG1/gym-app-mvp  

### 20.1 Objetivo Fase 4

Completar el modelo de gestión de personas y mejorar la UX general:

- Módulo de gestión de miembros (roles, coaches, servicios)
- Perfil de usuario (membresías múltiples, reservas próximas, historial)
- Membresías con edición completa y agrupación por alumno
- Calendario con filtro por coach y creación rápida de clases
- Home rediseñado con referencia Figma (hero premium + cards)
- Navbar actualizada con las 6 rutas principales + avatar de perfil

### 20.2 Nuevas Rutas Implementadas

| Ruta | Descripción |
|------|-------------|
| `/admin/members` | Listado, búsqueda y edición de miembros |
| `/profile` | Perfil propio (o de cualquier usuario via `?userId=`) |

### 20.3 Nuevos Tipos de Datos (`src/lib/types.ts`)

```typescript
type MemberRole   = "admin" | "coach" | "member"
type MemberStatus = "active" | "inactive"

interface Member {
  id: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  assignedCoachId?: string
  assignedCoachName?: string
  contractedServices: ServiceType[]
}
```

### 20.4 Nuevos / Modificados API Endpoints

```
GET  /api/members           → lista todos los miembros (filtros: role, status, search)
PUT  /api/members/[id]      → editar role, status, assignedCoachId/Name, contractedServices
PUT  /api/memberships/[id]  → editar plan, paymentStatus, membershipStatus, amount, fechas
GET  /api/memberships       → añadido filtro ?studentId= (perfil de usuario)
GET  /api/reservations      → añadido filtro ?userId= (perfil de usuario)
```

### 20.5 Mock Data Actualizada (Fase 4)

- `mockMembers` (11 miembros): Eduardo García (admin/user-123), 5 alumnos (user-001..005), 5 coaches (coach-001..005: Juan Pérez, María García, Carlos López, Laura Martínez, Dr. Ramírez)
- `mockMemberships` cambiado de `const` a `let` para permitir mutación vía PUT
- Dos membresías adicionales (mem-7, mem-8): Eduardo y María con kinesio $800 — ejemplifica multi-membresía
- `currentUser.role` cambiado de `"student"` a `"admin"` para habilitar creación rápida en calendario

### 20.6 Funcionalidades por Módulo

#### `/admin/members` — Gestión de Miembros
- KPIs: total miembros, total coaches, total usuarios registrados
- Búsqueda por nombre o email (input nativo)
- Filtros: rol (admin/coach/miembro) + estado (activo/inactivo)
- Tabla: avatar de iniciales, nombre, email, badge de rol, badge de estado, coach asignado (responsive), servicios contratados (responsive), links "Ver perfil" y "Editar"
- Modal de edición: selector de rol, selector de estado, selector de coach asignado (sólo si role = "member"), checkboxes de servicios (grupal, entrenamiento personal, kinesiología)
- `PUT /api/members/[id]` + actualización optimista de estado local

#### `/profile` — Perfil de Usuario
- Soporta `?userId=` en URL — si no hay param, carga `currentUser.id`
- Wrapped en `<Suspense>` por requerimiento de Next.js 16 con `useSearchParams`
- Cabecera: avatar de iniciales, nombre, email, badges de rol + estado
- Panel lateral: coach asignado, servicios contratados, estadísticas (membresías activas, total reservas, próximas clases)
- Panel derecho: todas las membresías del usuario (tarjetas con plan, estado, pago, fechas), próximas 5 reservas, historial de las últimas 8 (attended/absent/cancelled)

#### `/admin/memberships` — Membresías Mejoradas
- Agrupación client-side por `studentId`: cada alumno aparece como grupo con header (nombre, email, badge "N servicios") y link "Ver perfil →"
- Modal de edición de membresía: plan, membershipStatus, paymentStatus, amount, startDate, endDate
- `PUT /api/memberships/[id]` + actualización optimista de estado local
- Múltiples membresías por usuario soportadas y visibles en grupos

#### `/calendar` — Calendario Mejorado
- Filtro por coach: botón "Todos" + botones por nombre de coach (derivados de clases activas)
- Creación rápida de clase: slots vacíos muestran botón `+ clase` para admin/coach; días con clases muestran `+` adicional
- Modal de creación: nombre, tipo de servicio, día (pre-llenado), horario inicio/fin, coach, capacidad, nota
- Constante `IS_ADMIN_OR_COACH` basada en `currentUser.role`

#### `/` — Home Rediseñado
- Badge animado con dot pulsante: "Gestión de gimnasios — Primary Performance"
- Headline gradient: "Operación sin / fricción" (from-blue-400 to-cyan-400)
- Subtitle + 2 CTAs: "Ver Calendario →" (primario azul) + "Panel Admin" (zinc)
- Stats row: 11 clases activas, 5 coaches, 6+ alumnos, 3 servicios
- 3 feature cards con tag badge, icono, título, descripción y hover accent de color
- Quick-access row con links a Clases, Miembros, Membresías, Mi Perfil

#### Navbar Actualizada
- 5 links de navegación: Inicio, Calendario, Clases, Miembros, Membresías
- Avatar de perfil a la derecha: iniciales + nombre, link a `/profile`, estado activo si `pathname.startsWith("/profile")`
- Tipografía reducida (`text-xs`) para acomodar todos los links sin overflow

### 20.7 Estructura Final del Proyecto (Fase 4)

```
src/
├── app/
│   ├── page.tsx                          # Home premium rediseñado
│   ├── layout.tsx
│   ├── calendar/
│   │   └── page.tsx                      # + filtro coach + creación rápida
│   ├── profile/
│   │   └── page.tsx                      # NUEVA — perfil de usuario
│   ├── admin/
│   │   ├── classes/
│   │   │   └── page.tsx
│   │   ├── members/
│   │   │   └── page.tsx                  # NUEVA — gestión de miembros
│   │   └── memberships/
│   │       └── page.tsx                  # + edit modal + agrupación
│   └── api/
│       ├── classes/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── reservations/
│       │   ├── route.ts                  # + filtro userId
│       │   └── [id]/route.ts
│       ├── members/
│       │   ├── route.ts                  # NUEVA — GET con filtros
│       │   └── [id]/route.ts             # NUEVA — PUT
│       └── memberships/
│           ├── route.ts                  # + filtro studentId
│           └── [id]/route.ts             # NUEVA — PUT
├── components/
│   └── Navbar.tsx                        # + Miembros + avatar perfil
└── lib/
    ├── types.ts                          # + Member, MemberRole, MemberStatus
    └── mock-data.ts                      # + mockMembers, mockMemberships=let
```

### 20.8 Decisiones Técnicas

| Decisión | Razonamiento |
|----------|--------------|
| `Suspense` en `/profile` | Next.js 16 requiere que `useSearchParams` esté dentro de un boundary Suspense |
| Agrupación de membresías client-side | Evita refactorizar la API (que ya tiene filtros de estado/plan) — reduce el cambio |
| `mockMemberships` como `let` | El handler PUT necesita mutar el array en memoria |
| `currentUser.role = "admin"` | Habilita la UI de creación rápida de clases sin implementar auth real |
| Filtro coach derivado de clases activas | Sin modelo Coach separado — reutiliza los datos ya existentes |

### 20.9 Problemas Resueltos (Fase 4)

| Problema | Solución |
|----------|----------|
| `useSearchParams` sin Suspense → error de hidratación | Extraer lógica en `ProfileContent`, envolver en `<Suspense>` |
| `mockMemberships` inmutable → PUT handler fallaba silenciosamente | Cambiar declaración de `const` a `let` |
| Coach filter sin modelo Coach | Derivar lista única de coaches desde `classes.map(c => c.coach)` |

### 20.10 Commit y Branch

```
Branch:  feat/mvp-redesign-from-figma
Commit:  8b2a99f  feat: fase 4 — members module, profile, membership edit, calendar quick-create, home redesign
         12 files changed, 1,453 insertions(+), 267 deletions(-)
```

### 20.11 Métricas (Fase 4)

| Métrica | Fase 3 | Fase 4 | Delta |
|---------|--------|--------|-------|
| Líneas de código (fuente) | ~2.240 | ~3.700 | +1.460 |
| Archivos fuente | 14 | 19 | +5 |
| API endpoints | 9 | 14 | +5 |
| Páginas | 4 | 6 | +2 |
| Modelos de datos | 4 | 5 (+ Member) | +1 |
| Build TypeScript | ✅ | ✅ | — |
| Rutas compiladas | 12 | 16 | +4 |

### 20.12 Pendientes Reales (para Fase 5)

- Reservas muestran "Clase #classId" en lugar del nombre real (requiere join/lookup de clase)
- Sin validación de conflicto de coach al crear clase rápida (mismo coach, mismo slot, mismo día)
- Sin persistencia real — todo sigue en memoria (se reinicia con el servidor)

### 20.13 Próximos Pasos (FASE 5)

**Prioridad 1 — Persistencia real:**
- [ ] PostgreSQL + Prisma schema (GymClass, Reservation, Membership, Member)
- [ ] Seed script con datos de Primary Performance
- [ ] Migrar todos los mock handlers a queries Prisma

**Prioridad 2 — Autenticación:**
- [ ] NextAuth.js + Google OAuth
- [ ] Middleware de roles (admin / coach / alumno)
- [ ] Reemplazar `currentUser` hardcodeado con sesión real

**Prioridad 3 — Validación con Primary Performance:**
- [ ] User testing con admin, coaches y alumnos reales
- [ ] Iteración UX según feedback
- [ ] Definir módulos de Fase 6 según prioridades del negocio

---

## 21. ESTADO DE IMPLEMENTACIÓN (FASE 5 - FLUJO DE ALTA Y ASIGNACIÓN DE SERVICIOS)

**Fecha inicio Fase 5:** 2026-04-14
**Fecha conclusión Fase 5:** 2026-04-14
**Branch:** `feat/mvp-redesign-from-figma`
**Repositorio:** https://github.com/EduardoIICG1/gym-app-mvp

### 21.1 Objetivo Fase 5

Cerrar el flujo operacional de alta de usuarios y asignación de servicios. La entidad madre del sistema es **Miembro** — las membresías/servicios dependen del miembro, no al revés.

- Crear nuevos miembros desde `/admin/members`
- Asignar servicios/membresías a miembros existentes desde ambas páginas admin
- Conectar visualmente miembros ↔ membresías ↔ perfil
- Mostrar el tipo de servicio concreto en membresías y perfil (no solo el plan)

### 21.2 Cambios de Modelo

#### `Membership` (ampliado)
```typescript
interface Membership {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  serviceType: ServiceType;      // NUEVO — requerido
  plan: MembershipPlan;
  paymentStatus: PaymentStatus;
  membershipStatus: MembershipStatus;
  amount: number;
  startDate: string;
  endDate: string;
  coachId?: string;              // NUEVO — opcional
  coachName?: string;            // NUEVO — opcional
  notes?: string;                // NUEVO — opcional
}
```

#### `Member` (ampliado)
```typescript
interface Member {
  // ... campos existentes ...
  notes?: string;                // NUEVO — opcional
}
```

### 21.3 Nuevos / Modificados API Endpoints

```
POST /api/members
  Body: { name, email, role, status, assignedCoachId?, assignedCoachName?, contractedServices?, notes? }
  Validaciones: name + email requeridos · email único (409 si duplicado)
  Acción: inserta en mockMembers, retorna el nuevo Member

POST /api/memberships
  Body: { studentId, serviceType, plan, amount, startDate, endDate, paymentStatus?, membershipStatus?, coachId?, coachName?, notes? }
  Validaciones: campos requeridos · studentId existente (404) · duplicado activo solapado (409)
  Acción: inserta en mockMemberships, actualiza contractedServices del Member si hace falta
```

### 21.4 Funcionalidades por Módulo

#### `/admin/members` — Miembros (Fase 5)
- **Botón "Nuevo miembro"** en header (nivel del título)
- Modal de creación: nombre, email, rol, estado, coach asignado (si rol=member), servicios contratados (opcional), observaciones (opcional)
- Dos acciones al guardar: **"Guardar"** o **"Guardar + Servicio →"** (encadena apertura del modal de servicio con el nuevo miembro pre-cargado)
- **Botón "+ Servicio"** por fila → abre modal de asignación de servicio con el miembro pre-seleccionado
- **Contador de servicios activos** por fila (badge verde "N activos") — calculado desde `GET /api/memberships?status=active`
- Link "Perfil" por fila → `/profile?userId=X`
- Toast de feedback tras crear o asignar servicio

#### Modal "Añadir Servicio" (en `/admin/members`)
- Tipo de servicio: botones toggle (Grupal / Personal / Kinesio)
- Plan con auto-cálculo de fecha fin (30/90/180/365 días desde fecha inicio)
- Estado membresía + estado pago
- Coach/Profesional visible solo si serviceType = `personal_training` o `kinesiology`
- Notas opcionales

#### `/admin/memberships` — Membresías (Fase 5)
- **Botón "Añadir servicio"** en header (nivel del título)
- **CTA "+ Añadir servicio"** por grupo de usuario (junto al "Ver perfil →")
- Modal con **selector de miembro** (dropdown con nombre + email)
- Mismo formulario de servicio que en miembros
- **Badge `serviceType`** visible en cada tarjeta de membresía junto al plan
- **`coachName`** visible en tarjeta si aplica
- **`notes`** visible en tarjeta si aplica
- Toast de feedback

#### `/profile` — Perfil (Fase 5)
- Cada tarjeta de membresía ahora muestra:
  - Badge de `serviceType` (Grupal / Personal / Kinesio) con color diferenciado
  - Nombre del plan junto al badge
  - `coachName` si la membresía tiene profesional asignado

### 21.5 Reglas de Negocio Implementadas

| Regla | Implementación |
|-------|----------------|
| Un miembro puede existir sin membresía | POST /api/members no requiere membresía |
| Un miembro puede tener múltiples membresías/servicios | Sin restricción de cantidad |
| No duplicar el mismo servicio activo en fechas solapadas | Validación en POST /api/memberships (409) |
| Coach/profesional opcional en grupal, recomendado en PT/kinesio | UI condicional en modal |
| `contractedServices` del miembro se actualiza automáticamente | POST /api/memberships lo hace server-side |

### 21.6 Flujo Completo Implementado

```
Admin va a /admin/members
  → Click "Nuevo miembro"
  → Llena: nombre, email, rol, estado, coach, servicios, notas
  → "Guardar"                   → miembro creado, aparece en lista con badge "0 activos"
  → "Guardar + Servicio →"      → miembro creado + modal servicio abre con miembro pre-cargado
      → Selecciona: tipo, plan, monto, fechas, coach, notas
      → "Agregar servicio"      → membresía creada, lista se actualiza, badge pasa a "1 activos"

Admin va a /admin/members
  → Fila de miembro existente → Click "+ Servicio"
  → Modal con miembro pre-cargado
  → Agrega servicio adicional  → badge actualiza a "2 activos"

Admin va a /admin/memberships
  → Click "Añadir servicio" (header) o "+ Añadir servicio" (por grupo)
  → Selecciona miembro en dropdown
  → Agrega servicio            → aparece en el grupo del usuario
```

### 21.7 Archivos Modificados (Fase 5)

| Archivo | Cambio |
|---------|--------|
| `src/lib/types.ts` | `Membership` + `serviceType` (req), `coachId?`, `coachName?`, `notes?` · `Member` + `notes?` |
| `src/lib/mock-data.ts` | `serviceType` añadido a las 8 membresías seed + `coachName` en mem-7 y mem-8 |
| `src/app/api/members/route.ts` | + `POST` con validación de email único |
| `src/app/api/memberships/route.ts` | + `POST` con validación de duplicado solapado |
| `src/app/admin/members/page.tsx` | Reescritura completa |
| `src/app/admin/memberships/page.tsx` | Reescritura completa |
| `src/app/profile/page.tsx` | Edit: badge `serviceType` + `coachName` en tarjetas de membresía |

### 21.8 Decisiones Técnicas

| Decisión | Razonamiento |
|----------|--------------|
| `serviceType` requerido en `Membership` | Una membresía representa un servicio concreto — el tipo no es opcional |
| Auto-cálculo de `endDate` al cambiar plan o fecha inicio | UX: evita que el admin calcule manualmente 30/90/180/365 días |
| Contador de servicios activos desde API (no desde `contractedServices`) | Dato correcto: `contractedServices` es intención; la API refleja membresías activas reales |
| `POST /api/memberships` actualiza `contractedServices` del Member | Mantiene consistencia del modelo Member sin requerir actualización manual |
| Duplicate check por `studentId + serviceType + active + solapamiento` | Evita el caso más común de error operativo (doble alta del mismo servicio) |
| Toast en lugar de reload completo | UX más fluida; `fetchData()` recarga datos actualizados sin perder el contexto de la página |

### 21.9 Problemas Resueltos (Fase 5)

| Problema | Solución |
|----------|----------|
| `Membership.serviceType` era inexistente en el modelo | Añadido como campo requerido; mock data actualizado con valores reales |
| `contractedServices` del Member no se actualizaba al crear membresía | POST /api/memberships actualiza el array server-side automáticamente |
| Modal encadenado (crear miembro → abrir modal servicio) | `handleCreateMember(andAddService=true)` pasa el nuevo Member al estado del modal de servicio |

### 21.10 Build y Commit

```
Branch:  feat/mvp-redesign-from-figma
TypeScript: 0 errores
Rutas compiladas: 16 (sin cambios en cantidad)
```

### 21.11 Pendientes Reales (para Fase 6)

- Sin búsqueda de texto en el picker de miembro dentro del modal (solo dropdown)
- Sin validación de email en frontend antes del POST (solo backend)
- Sin paginación — lista completa en memoria
- `contractedServices` en Member no refleja servicios expirados (solo se añade, nunca se remueve)
- Las reservas siguen mostrando "Clase #classId" sin el nombre real de la clase

### 21.12 Próximos Pasos (FASE 6)

**Prioridad 1 — Persistencia real:**
- [ ] PostgreSQL + Prisma schema (GymClass, Reservation, Membership, Member)
- [ ] Seed script con datos reales de Primary Performance
- [ ] Migrar todos los mock handlers a queries Prisma

**Prioridad 2 — Autenticación:**
- [ ] NextAuth.js + Google OAuth
- [ ] Middleware de roles (admin / coach / alumno)
- [ ] Reemplazar `currentUser` hardcodeado con sesión real

**Prioridad 3 — Validación con Primary Performance:**
- [ ] User testing con admin, coaches y alumnos reales
- [ ] Iteración UX según feedback
- [ ] Definir módulos de Fase 7 según prioridades del negocio

---

## 22. ESTADO DE IMPLEMENTACIÓN (FASE 6 - HOME DASHBOARD / COMUNIDAD)

**Fecha inicio Fase 6:** 2026-04-14
**Fecha conclusión Fase 6:** 2026-04-14
**Branch:** `feat/mvp-redesign-from-figma`
**Repositorio:** https://github.com/EduardoIICG1/gym-app-mvp

### 22.1 Objetivo Fase 6

Transformar la Home estática (hero + cards) en un dashboard post-login tipo aplicación real, con feed de comunidad interactivo y layout de 3 columnas.

### 22.2 Nuevos Tipos de Datos (`src/lib/types.ts`)

```typescript
interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "coach" | "member";
  content: string;
  createdAt: string; // ISO
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "coach" | "member";
  createdAt: string; // ISO
  content: string;
  mediaType?: "image" | "gif" | "video" | "link";
  mediaUrl?: string;
  likesCount: number;
  comments: PostComment[];
}

interface QuickLink { label: string; href: string; }
interface Group { id: string; name: string; emoji: string; }
```

### 22.3 Mock Data Agregada (`src/lib/mock-data.ts`)

- `mockQuickLinks`: 4 accesos rápidos a rutas admin
- `mockGroups`: 3 grupos de entrenamiento (placeholder)
- `mockPosts` (`let`): 4 posts seed con autores reales, likes y comentarios

### 22.4 Layout Home — 3 Columnas

```
grid-cols-[240px_1fr_320px]   (desktop)
grid-cols-1                   (mobile — sidebar izquierdo oculto, derecho apilado)
```

| Columna | Contenido |
|---------|-----------|
| Izquierda (240px) | Navegación filtrada por rol + accesos rápidos + grupos |
| Centro (1fr) | Crear post (admin/coach) + feed de posts |
| Derecha (320px) | Clases del día con barras de ocupación + resumen operativo (admin) |

### 22.5 Funcionalidades del Feed

- **Crear post** — solo admin/coach: textarea + botones UI-only (imagen/link) + botón Publicar
- **Like toggle** — contador local actualiza en tiempo real, ícono alterna ❤️/🤍
- **Comentarios expandibles** — toggle collapse/expand por post
- **Nuevo comentario inline** — input + Enter/botón ↩, se añade al post en local state
- **timeAgo** helper — "ahora", "5m", "2h", "1d"

### 22.6 Decisiones Técnicas

| Decisión | Razonamiento |
|----------|--------------|
| `"use client"` en Home | Requiere useState, usePathname para interactividad completa |
| `useState(seedPosts)` con spread updates | Nunca muta el array seed; local state se reinicia en navegación (sin backend) |
| `currentUser.role as "admin" | "coach" | "member"` | El tipo `User.role` incluye `"owner"` y `"student"` — aserción segura en mock hardcodeado |
| Sidebar derecho siempre visible | Apila bajo el feed en mobile; sticky en desktop |

### 22.7 Archivos Modificados (Fase 6)

| Archivo | Cambio |
|---------|--------|
| `src/lib/types.ts` | + `PostComment`, `Post`, `QuickLink`, `Group` |
| `src/lib/mock-data.ts` | + import tipos nuevos, + `mockQuickLinks`, `mockGroups`, `mockPosts` |
| `src/app/page.tsx` | Reescritura completa — dashboard 3 columnas con feed interactivo |

### 22.8 Build y Verificación

```
TypeScript: 0 errores (npx tsc --noEmit)
Build: 16 rutas compiladas (npm run build)
```

---

## 23. ESTADO DE IMPLEMENTACIÓN (FASE 6 REFINAMIENTO - NAV LIMPIA + PANEL DERECHO POR ROL)

**Fecha:** 2026-04-14
**Branch:** `feat/mvp-redesign-from-figma`

### 23.1 Objetivo

Eliminar redundancia de navegación y hacer el panel derecho de la Home contextual por rol.

### 23.2 Cambios Aplicados

#### 1. Navbar — Eliminados links de módulos
- Removidos: Inicio, Calendario, Clases, Miembros, Membresías de la barra superior
- Queda: solo logo (PP + "Primary Performance") y avatar/nombre del usuario
- Razonamiento: la navegación vive en el sidebar izquierdo de la Home; la navbar duplicaba

#### 2. Sidebar izquierdo — Eliminada sección "Grupos"
- Removido el bloque de grupos (placeholder, sin funcionalidad real)
- Removido `mockGroups` del import de page.tsx
- Quedan: Navegación filtrada por rol + Accesos rápidos

#### 3. Panel derecho — Contenido por rol

| Rol | Contenido mostrado |
|-----|-------------------|
| `admin` | Clases activas desde hoy hasta fin de semana (todas, con nombre de día) + resumen operativo con links de admin |
| `coach` | Solo clases donde `cls.coach === currentUser.name`, desde hoy, sin resumen operativo |
| `student` | Reservas propias (`mockReservations` filtradas por `studentId` y `classDate >= hoy`), estado vacío si ninguna |

### 23.3 Criterio de "próximas clases"

Las clases del gym son recurrentes por `dayOfWeek`, no por fecha exacta. "Próximas" = `dayOfWeek >= gymDay` (hoy hasta sábado). Para `student`, se usa `classDate >= today` de las reservas (tienen fecha específica).

### 23.4 Nota de tipo

`User.role` es `"owner" | "admin" | "coach" | "student"` — no incluye `"member"`. La guardia del panel de member usa `currentUser.role === "student"`.

### 23.5 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/Navbar.tsx` | Eliminados `links` y `<div>` de nav links |
| `src/app/page.tsx` | Import `mockReservations` añadido; import `mockGroups` removido; bloque Grupos removido; panel derecho reemplazado con lógica por rol |

### 23.6 Build y Verificación

```
TypeScript: 0 errores (npx tsc --noEmit)
```

### 23.7 Pendientes Reales

- Figma design reference pendiente de recibir — ajustes visuales quedan para cuando se comparta
- Panel coach/student requiere cambiar `currentUser.role` en mock-data para probar (actualmente es `"admin"`)
- Sin paginación en el feed — todo en memoria

---

## 24. ESTADO DE IMPLEMENTACIÓN (ITERACIÓN — SIDEBAR GLOBAL COLAPSABLE + NAMING + PANEL DERECHO)

**Fecha:** 2026-04-14
**Branch:** `feat/mvp-redesign-from-figma`
**Commit:** `1e315a5`

### 24.1 Objetivo

Cerrar la Home como app usable: sidebar persistente en todas las vistas, navegación coherente, panel derecho limitado y correcto por rol.

### 24.2 Cambios Aplicados

#### Sidebar colapsable global (`src/components/Sidebar.tsx` — NUEVO)

- Componente `"use client"` con íconos SVG inline (sin librería)
- Expandido por defecto en `/` (Home), colapsado en cualquier módulo
- `useEffect([pathname])` auto-colapsa al navegar; toggle manual disponible en sesión
- Expandido: `w-60` con ícono + texto. Colapsado: `w-16` solo íconos
- Tooltips nativos (`title`) en modo colapsado
- Íconos: Home, Calendario, Grid (Clases), Personas (Miembros), Tarjeta (Membresías), Perfil
- Botón toggle al fondo con flecha
- Filtro por `currentUser.role` para mostrar solo links permitidos

#### Layout (`src/app/layout.tsx`)

- Integra `<Sidebar />` al shell global: `<div className="flex"><Sidebar /><div className="flex-1 min-w-0">{children}</div></div>`
- Sidebar persiste en todas las rutas sin re-montarse

#### Home page (`src/app/page.tsx`)

- Eliminada la sidebar local (ya está en layout)
- Grid pasa de 3 columnas a 2: `lg:grid-cols-[1fr_300px]`
- Sección "Accesos rápidos" eliminada (era redundante con la navegación)
- Panel derecho limitado a 5 items con `.slice(0, 5)`
- CTA cambiado de "Ver calendario →" a "Ver más en calendario →"

#### Unificación de roles (`src/lib/types.ts`)

- `User.role`: `"student"` → `"member"` para consistencia con `Member.role` y `Post.authorRole`
- Guardia en page.tsx: `currentUser.role === "student"` → `currentUser.role === "member"`

### 24.3 Pendientes

- Sidebar no tiene variante mobile (solo `lg:`); necesitaría drawer/hamburger
- Para probar panel coach/member: cambiar `currentUser.role` en mock-data

---

## 25. ESTADO DE IMPLEMENTACIÓN (ITERACIÓN — CONSISTENCIA MEMBERS, MEMBERSHIPS Y PROFILE)

**Fecha:** 2026-04-14
**Branch:** `feat/mvp-redesign-from-figma`
**Commits:** `cc09bfb`, `32a1b6a`

### 25.1 Objetivo

Consistencia funcional y UX en Members, Memberships y Profile:
- Jerarquía de info en filas de members
- Edición de miembro con nombre/email read-only
- Profile derivando servicios desde membresías reales

### 25.2 Cambios en `/admin/members`

#### Filas de la tabla (jerarquía)

Antes: columnas planas — `[role][status] [N activos] [coach] [services]`

Ahora:
- `[role][status]` — identidad del rol y estado
- **Columna contexto** (md+): agrupa N activos y coach en un bloque apilado vertical; coaches no ven esta columna (datos irrelevantes)
- **Pills de servicios** (xl+): solo para no-coaches

Regla aplicada: coaches no muestran datos de "N activos" ni "coach asignado" porque no les aplica.

#### Modal Editar miembro — dos secciones separadas

**Datos del miembro** (block `bg-zinc-800/40`, `pointer-events-none`, `select-none`):
- Muestra nombre y email como `<p>` elements
- Label "solo lectura" a la derecha
- No interactivos, no enfocables, no en `EditState`, no en el payload del PUT

**Configuración operativa** (editable):
- Rol, Estado, Coach asignado (si role=member), Servicios contratados

#### API PUT `/api/members/[id]`

Antes: `{ ...mockMembers[idx], ...body }` — spread ciego, aceptaba cualquier campo.

Ahora: whitelist explícita — solo procesa `role`, `status`, `contractedServices`, `assignedCoachId`, `assignedCoachName`, `notes`. Nombre y email son ignorados aunque vengan en el body.

### 25.3 Cambios en `/profile`

**Fuente de verdad para servicios:**

Antes: `member.contractedServices` — campo del modelo Member, puede estar desactualizado (solo se actualiza al crear membresía, nunca al cancelar).

Ahora:
```typescript
const activeMemberships = memberships.filter(m => m.membershipStatus === "active");
const activeServiceTypes = [...new Set(
  activeMemberships.map(m => m.serviceType).filter(s => s && s !== "blocked_time")
)];
```

`memberships` viene de `GET /api/memberships?studentId=X` — siempre fresco al cargar el perfil. Cualquier cambio en el estado de una membresía se refleja en el perfil al navegar a él.

La sección renombrada de "Servicios Contratados" a **"Servicios Activos"** para comunicar que deriva del estado real.

### 25.4 Pendientes Reales

- `contractedServices` en Member sigue existiendo pero ya no es la fuente visual del perfil; se podría limpiar en el futuro
- `notes` está en el whitelist del API pero el modal de edición no tiene textarea para editarlas — a exponer si se necesita
- Sin paginación en ninguna lista — todo en memoria

---

## 26. ESTADO DE IMPLEMENTACIÓN (FASE 7 — UX + CONSISTENCIA + CONTROL DE ROLES)

**Fecha inicio Fase 7:** 2026-04-15
**Fecha conclusión Fase 7:** 2026-04-15
**Branch:** `feat/mvp-redesign-from-figma`

### 26.1 Objetivo Fase 7

Cerrar la fase de UX + consistencia del MVP antes de pasar a autenticación y persistencia real:
- Control de edición de miembros basado en `currentUser.role`
- Consistencia de servicios entre Members, Memberships y Profile
- Test de roles mock (Admin / Coach / Member) con switcher en UI
- Responsive / adaptive para 1366×768, 1440×900, 1920×1080
- Sidebar siempre disponible con hover-expand
- Pulido visual menor

---

### 26.2 Nuevo Archivo: `src/lib/useCurrentUser.ts`

Hook cliente que provee el usuario activo con rol **reactivo**. Reemplaza el acceso directo a `currentUser` en todos los componentes de UI.

**Mecanismo:**
- Lee `localStorage.getItem("pp_dev_role")` tras hidratación (evita mismatch SSR)
- Escucha evento custom `pp:roleChange` para sincronizar entre componentes sin recarga
- `changeRole(r)` escribe a localStorage, dispara evento y todos los componentes re-renderizan

**Archivos actualizados para usar el hook:**

| Archivo | Cambio |
|---------|--------|
| `src/components/Navbar.tsx` | `currentUser` estático → `useCurrentUser()` + role switcher |
| `src/components/Sidebar.tsx` | `currentUser` estático → `useCurrentUser()` para filtrar items |
| `src/app/page.tsx` | `IS_ADMIN_OR_COACH` constante → derivado del hook |
| `src/app/calendar/page.tsx` | `CURRENT_USER_ID` constante de módulo → derivado del hook |
| `src/app/profile/page.tsx` | `currentUser` para `viewUserId` → `activeUser` del hook |

---

### 26.3 Navbar — Role Switcher de Desarrollo

Pill clickable en la esquina derecha que cicla Admin → Coach → Member. Estilo por rol:
- Admin: `bg-purple-500/15 text-purple-400`
- Coach: `bg-orange-500/15 text-orange-400`
- Member: `bg-blue-500/15 text-blue-400`

---

### 26.4 Sidebar — Hover Expand

| Comportamiento | Mecanismo |
|----------------|-----------|
| Colapsa al entrar a módulo | `useEffect([pathname])` |
| Hover temporal expande | Estado `hovered` separado; `isExpanded = !collapsed || hovered` |
| Click en chevron fija el estado | `setCollapsed(c => !c)` |
| Filtro por rol | `NAV_ITEMS.filter(item => item.roles.includes(user.role))` |

**Filtrado de módulos por rol:**

| Módulo | Admin | Coach | Member |
|--------|-------|-------|--------|
| Inicio | si | si | si |
| Calendario | si | si | si |
| Clases | si | si | no |
| Miembros | si | si | no |
| Membresias | si | no | no |
| Mi Perfil | si | si | si |

---

### 26.5 Edicion de Miembros — Control por Rol

El bloque "Datos del miembro" (nombre + email) en el modal cambia segun `currentUser.role`:

| Rol | Nombre | Email | Estilo |
|-----|--------|-------|--------|
| `admin` | Input editable | Input editable | badge "editable" |
| `coach` / `member` | Texto estatico | Texto estatico | `pointer-events-none select-none` + badge "solo lectura" |

**API `PUT /api/members/[id]`:** Lee `body._callerRole`. Solo aplica `name`/`email` si `callerRole === "admin"`.

---

### 26.6 Sincronizacion de Servicios

Flujo confirmado correcto. Todas las paginas leen de la misma fuente en memoria via API:
- Members page: `fetchData()` post-add → GET /api/members + /api/memberships?status=active
- Memberships page: `fetchMemberships()` post-add
- Profile page: `fetchData()` en mount → siempre fresco

---

### 26.7 Responsive / Adaptive

| Fix | Detalle |
|-----|---------|
| `overflow-x-hidden` en body y content wrapper | Previene scroll horizontal |
| Navbar → `max-w-screen-2xl` | Ocupa full viewport sin espacios en 1920px |
| Sidebar `transition-[width]` | Sin saltos de layout al expandir/colapsar |

---

### 26.8 Archivos Modificados (Fase 7)

| Archivo | Cambio |
|---------|--------|
| `src/lib/useCurrentUser.ts` | NUEVO — hook reactivo para rol del usuario |
| `src/components/Navbar.tsx` | Reescritura — hook + role switcher |
| `src/components/Sidebar.tsx` | Reescritura — hover-expand + useCurrentUser |
| `src/app/admin/members/page.tsx` | Modal edicion: name/email editable para admin |
| `src/app/api/members/[id]/route.ts` | Whitelist + logica `_callerRole` |
| `src/app/page.tsx` | `isAdminOrCoach` reactivo |
| `src/app/calendar/page.tsx` | Constantes reactivas |
| `src/app/profile/page.tsx` | `activeUser` desde hook |
| `src/app/layout.tsx` | `overflow-x-hidden` |

---

### 26.9 Build y Verificacion

```
TypeScript: 0 errores (npx tsc --noEmit)
Server: http://localhost:3000 (Ready en ~975ms)
```

---

### 26.10 Pendientes Reales — ANTES DE PASAR A BACKEND

| Pendiente | Prioridad |
|-----------|-----------|
| Reservas en perfil muestran classId sin nombre real | Media |
| Validacion email unico al editar miembro | Baja |
| `contractedServices` no se limpia al cancelar membresia | Baja |
| Sidebar sin variante mobile (solo `lg:`) | Baja |
| Sin paginacion en listas | Baja |

---

### 26.11 Proximos Pasos — FASE 8

**Secuencia recomendada:**

```
Fase 8A — Persistencia (Prisma + PostgreSQL)
  Schema: Member, GymClass, Reservation, Membership
  Seed script con datos de Primary Performance
  Migrar API handlers mock → Prisma queries

Fase 8B — Autenticacion (NextAuth.js + Google OAuth)
  Sesion real reemplaza currentUser hardcodeado
  Middleware de roles
  useCurrentUser hook apunta a sesion real
  Proteccion de rutas por rol

Fase 8C — Validacion con Primary Performance
  User testing con admin, coaches y alumnos reales
  Iteracion UX segun feedback
```

**Por que Persistencia antes que Auth:**
- La DB define el schema real que NextAuth necesita (tabla usuarios/cuentas)
- Mas facil migrar mock → Prisma con usuario hardcodeado que con sesion activa
- Permite validar el schema con datos reales antes de complicar con OAuth

---

---

## Sección 28 — Fase 9: Responsive Mobile (Pre-Validación)

**Fecha:** 2026-04-15
**Estado:** Completo — versión congelada para sesión de validación con Primary Performance

---

### 28.1 Objetivo

Adaptar la app a mobile sin romper desktop, sin duplicar lógica, sin refactor masivo.

Restricciones aplicadas:
- Desktop 100% intacto — todos los cambios mobile gateados con `lg:hidden` / `hidden lg:*`
- Sin componentes separados — una sola base de lógica y componentes
- Sin refactor de datos — business logic (API, state) no tocado

---

### 28.2 Problemas Resueltos (6 de 6)

| # | Problema | Archivo | Solución |
|---|----------|---------|----------|
| 1 | Sin navegación en mobile (sidebar desaparece) | `Sidebar.tsx` | Bottom nav bar fija `lg:hidden` con iconos + labels, filtrada por rol, max 5 items |
| 2 | Calendario semanal ilegible en mobile (6 columnas) | `calendar/page.tsx` | Vista día único con pills selector horizontal; desktop grid inalterado |
| 3 | KPIs de members overflow en 375px | `members/page.tsx` | `gap-2 sm:gap-3`, `p-3 sm:p-4` en los 3 cards |
| 4 | Row actions overflow en mobile | `members/page.tsx` | "Perfil" y "+ Servicio" con `hidden sm:block`; solo "Editar" visible en mobile |
| 5 | Modal "Editar miembro" sin scroll en mobile | `members/page.tsx` | `max-h-[90vh] overflow-y-auto` al contenedor del modal (New Member y Add Service ya lo tenían) |
| 6 | Header del calendario no cabe en mobile | `calendar/page.tsx` | `text-xs sm:text-sm`, `min-w-[140px] sm:min-w-[170px]`, `px-2 sm:px-3` en el week label |

---

### 28.3 Detalles de Implementación

#### Bottom nav mobile (`src/components/Sidebar.tsx`)

```tsx
// Fragment return: <aside> (desktop) + <nav> (mobile)
<nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
  <div className="flex items-center justify-around px-1 h-16">
    {bottomItems.map(...)}  // role-filtered visibleItems.slice(0, 5)
  </div>
</nav>
```

Content wrapper en `layout.tsx`: `pb-16 lg:pb-0` — evita que la bottom nav tape contenido.

#### Calendario mobile (`src/app/calendar/page.tsx`)

```tsx
const [selectedDay, setSelectedDay] = useState(0);

// Reset on week change
useEffect(() => {
  const todayIdx = weekDates.findIndex(d => d.dateStr === todayStr);
  setSelectedDay(todayIdx >= 0 ? todayIdx : 0);
}, [weekOffset]);

// Mobile view
<div className="lg:hidden">
  {/* 6 day pills, horizontal scroll */}
  {/* IIFE renders classes for weekDates[selectedDay] */}
</div>

// Desktop view (untouched)
<div className="hidden lg:grid grid-cols-6 gap-3">
  {weekDates.map(...)}
</div>
```

Zero duplicación de lógica: `isReserved`, `occupancyInfo`, `coachFilter` reutilizados en ambas vistas.

---

### 28.4 Smoke Test (10 puntos para validación)

| # | Check | Dispositivo |
|---|-------|-------------|
| 1 | Bottom nav visible, no tapa contenido | Mobile 375px |
| 2 | Nav filtrada por rol (member ve 3 items, no 5) | Mobile 375px |
| 3 | 6 day pills horizontales, hoy resaltado en azul | Mobile 375px |
| 4 | Al tocar pill cambia la lista de clases (no grid de 6 col) | Mobile 375px |
| 5 | KPIs de members (3 cards) caben sin overflow | Mobile 375px |
| 6 | Fila de miembro muestra solo "Editar" (no Perfil ni +Servicio) | Mobile 375px |
| 7 | Modal "Editar miembro" scrollable si contenido supera pantalla | Mobile 375px |
| 8 | Sidebar lateral visible, sin bottom nav | Desktop 1280px+ |
| 9 | Calendario muestra grid de 6 columnas (Lun–Sáb), no pills | Desktop 1280px+ |
| 10 | Filas de miembro muestran 3 botones: Perfil + Servicio + Editar | Desktop 1280px+ |

---

### 28.5 Estado de la Versión

**Versión congelada para validación.**

- TypeScript: 0 errores
- No hay cambios pendientes antes de la sesión

---

### 28.6 Próximos Pasos — Post Validación

Después de la sesión con Primary Performance, decidir según feedback:

```
Si ≥ 2/3 roles "lo usaría" → avanzar a infraestructura:
  Fase 10A — Persistencia: Prisma + PostgreSQL
    Schema: Member, GymClass, Reservation, Membership
    Seed con datos reales de Primary Performance
    Migrar API handlers mock → Prisma queries

  Fase 10B — Autenticación: NextAuth.js
    Sesión real reemplaza currentUser hardcodeado
    Middleware de roles
    Protección de rutas

Si validación detecta fricciones críticas (≥ 2 participantes):
  Iterar UX antes de DB/auth
  Foco en lo que bloqueó comprensión sin ayuda
```

---

## Sección 27 — Fase 8: Prep Validación + Theme Toggle + DevPanel

**Fecha:** 2026-04-15
**Branch de trabajo:** feat/mvp-redesign-from-figma → merge a master
**Estado al cerrar:** Completo, listo para sesión de validación con Primary Performance

---

### 27.1 Objetivos de la Fase

1. Preparar el MVP para validación real con usuarios (admin, coach, member)
2. Corregir hydration mismatch en Home
3. Implementar toggle dark/light visible y funcional
4. Mover role switcher a DevPanel invisible (solo moderador, Shift+D)
5. Sesión de validación planificada: demo guiada + exploración libre + debrief

---

### 27.2 Bug Corregido — Hydration Mismatch en Home

**Causa:**
`const _now = Date.now()` en `src/lib/mock-data.ts` se evaluaba al importar el módulo —
una vez en el servidor (SSR) y otra en el cliente, produciendo `createdAt` distintos.
`timeAgo(post.createdAt)` calculaba tiempos relativos diferentes en cada lado.
Al cruzar un límite de hora, el texto renderizado difería → error de hydration ("3h vs 2h").

**Solución aplicada:**
- `mock-data.ts`: `const _now = Date.now()` → `const _now = new Date("2026-04-15T12:00:00.000Z").getTime()` (valor estático)
- `page.tsx`: `suppressHydrationWarning` en los dos elementos `<p>` que renderizan `timeAgo`

**Archivos modificados:**
- `src/lib/mock-data.ts` — línea 488 (antes del bloque mockPosts)
- `src/app/page.tsx` — dos elementos de timestamp

---

### 27.3 Theme Toggle — Dark/Light

**Stack:** Tailwind CSS v4 (no hay tailwind.config.ts — configuración en CSS)

**Approach:**
- `@custom-variant dark (&:where(.dark, .dark *))` en globals.css — activa dark mode por clase
- Light mode: overrides CSS `html:not(.dark)` — sin tocar componentes existentes
- Default: dark (flash-prevention script aplica `class="dark"` antes de hydration)
- Persistencia: localStorage key `pp_theme`
- Toggle visible: botón ☀/🌙 en Navbar (accesible para usuario final)

**Flash prevention (layout.tsx):**
```js
(function(){var t=localStorage.getItem('pp_theme');if(t!=='light')document.documentElement.classList.add('dark');})()
```
Script inline en `<head>`, `suppressHydrationWarning` en `<html>`.

**Paleta light mode:**
| Rol | Clase Tailwind | Color Light |
|-----|---------------|-------------|
| Fondo página | bg-zinc-950 | #ebebed |
| Cards | bg-zinc-900 | #ffffff |
| Inputs/nested | bg-zinc-800 | #f0f0f2 |
| Elementos | bg-zinc-700 | #e2e2e6 |
| Bordes | border-zinc-800 | #d1d1d6 |
| Texto primario | text-white | #111827 |
| Texto secundario | text-zinc-400 | #4b5563 |
| Texto muted | text-zinc-500 | #6b7280 |
| Texto sutil | text-zinc-600 | #9ca3af |

**Archivos nuevos/modificados:**
- `src/app/globals.css` — @custom-variant + light mode overrides
- `src/lib/useTheme.ts` — hook nuevo (lee DOM en mount, toggle + localStorage)
- `src/app/layout.tsx` — flash prevention script + suppressHydrationWarning
- `src/components/Navbar.tsx` — toggle ☀/🌙 + eliminado role switcher pill

---

### 27.4 DevPanel — Role Switcher para Sesión de Validación

**Decisión de diseño:**
El toggle de tema es visible en el Navbar (funcionalidad de producto).
El role switcher es invisible — solo para el moderador de la sesión.

**Comportamiento:**
- Zero DOM cuando cerrado (`return null`)
- Acceso ÚNICO: `Shift+D`
- Panel: Admin / Coach / Member buttons
- Click fuera → cierra
- Shift+D nuevamente → cierra

**Archivo nuevo:** `src/components/DevPanel.tsx`
**Wiring:** `src/app/layout.tsx` — `<DevPanel />` antes de `</body>`

---

### 27.5 Navbar — Estado Final

**Removido:** pill de rol (Admin/Coach/Member) visible
**Agregado:** botón theme toggle ☀/🌙 (visible, con título tooltip)
**Mantenido:** logo PP + avatar de perfil con nombre

```tsx
// src/components/Navbar.tsx
import { useTheme } from "@/lib/useTheme";
// ...
const { theme, toggleTheme } = useTheme();
// Botón: onClick={toggleTheme}, muestra "☀" (dark) o "🌙" (light)
```

---

### 27.6 Archivos Modificados en Fase 8

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `src/lib/mock-data.ts` | Modificado | _now estático → fix hydration |
| `src/app/page.tsx` | Modificado | suppressHydrationWarning en timestamps |
| `src/app/globals.css` | Modificado | @custom-variant dark + light overrides |
| `src/lib/useTheme.ts` | Nuevo | Hook theme toggle |
| `src/app/layout.tsx` | Modificado | Flash prevention + DevPanel |
| `src/components/Navbar.tsx` | Modificado | Theme toggle, sin role pill |
| `src/components/DevPanel.tsx` | Nuevo | Role switcher Shift+D invisible |
| `docs/superpowers/specs/` | Nuevo | Spec de validación |
| `docs/superpowers/plans/` | Nuevo | Plan de implementación |

---

### 27.7 Plan de Validación con Primary Performance

**Formato:** Combinado — demo guiada (30min) + exploración libre (40min) + debrief (10min)

**Flujos demo guiada:**
- Admin: Dashboard → Lista miembros → Membresía de un miembro
- Coach: Calendario → Clase asignada → Perfil de alumno
- Member: Perfil propio → Estado membresía → Próximas reservas

**Task cards exploración libre:**
- Admin: "Encontrá a un miembro y verificá su membresía activa"
- Coach: "Identificá tus clases esta semana"
- Member: "Verificá cuándo vence tu membresía y cuántas clases próximas tenés"

**Métricas de decisión post-sesión:**
- ≥ 2/3 roles "lo usaría" → avanzar a DB/auth
- Problema repetido en ≥ 2 participantes → corregir antes de DB
- Confusión de navegación en ≥ 2 → revisar sidebar/navbar

**Moderador workflow:** `Shift+D` para cambiar rol entre participantes, invisible para usuarios.

---

### 27.8 Próximos Pasos — FASE 9

Después de la sesión de validación con Primary Performance:

```
Si validación exitosa (≥ 2/3 "lo usaría"):
  Fase 9A — Persistencia: Prisma + PostgreSQL
    Schema: Member, GymClass, Reservation, Membership
    Seed con datos reales de Primary Performance
    Migrar API handlers mock → Prisma queries

  Fase 9B — Autenticación: NextAuth.js
    Sesión real reemplaza currentUser hardcodeado
    Middleware de roles
    Protección de rutas

Si validación detecta fricciones críticas:
  Iterar sobre UX antes de pasar a DB/auth
  Foco en lo que bloqueó comprensión sin ayuda
```

---
