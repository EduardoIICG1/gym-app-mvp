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
