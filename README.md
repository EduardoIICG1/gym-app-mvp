# Gym App MVP - Primary Performance

**Sistema web de gestión de clases grupales y reservas para gimnasios.**

[![GitHub](https://img.shields.io/badge/GitHub-gym--app--mvp-blue)](https://github.com/EduardoIICG1/gym-app-mvp)
![Next.js](https://img.shields.io/badge/Next.js-16.2.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

---

## 📋 Descripción

MVP de un sistema digital para resolver problemas operativos en gimnasios de alto rendimiento, específicamente Primary Performance.

**Problema:** Agendamiento manual en WhatsApp, sin visibilidad de cupos, errores frecuentes.

**Solución:** Plataforma web que centraliza:
- Visualización de clases disponibles
- Reservas en tiempo real
- Control de ocupación
- Registro de asistencia

---

## 🎯 Objetivos MVP (Fase 1)

✅ **COMPLETADO:**
- Visualizar catálogo de clases
- API de clases funcionando
- Interfaz responsiva
- Navigation con Navbar

⏳ **PRÓXIMAS FASES:**
- Autenticación de usuarios
- Base de datos (PostgreSQL + Prisma)
- Flujo de reservas
- Toma de asistencia

---

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- npm o yarn
- Git

### Instalación

```bash
# Clonar repo
git clone https://github.com/EduardoIICG1/gym-app-mvp.git
cd gym-app-mvp

# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Build para producción

```bash
npm run build
npm run start
```

---

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/
│   │   └── classes/route.ts          # GET /api/classes
│   ├── classes/
│   │   └── page.tsx                  # Página de clases
│   ├── layout.tsx                    # Layout raíz + Navbar
│   ├── page.tsx                      # Home page
│   └── globals.css
├── components/
│   ├── ClassCard.tsx                 # Tarjeta de clase
│   └── Navbar.tsx                    # Barra de navegación
└── lib/
    └── mock-data.ts                  # 10 clases de ejemplo
```

---

## 🎨 Características Actuales

### 1. Home Page (`/`)
- Hero section con call-to-action
- 3 feature cards (Booking, Coaches, Transform)
- Stats section

### 2. Classes Page (`/classes`)
- Grid responsivo de 10 clases
- Tarjetas con:
  - Nombre, coach, día, hora
  - Capacidad (barra de progreso)
  - Estado dinámico (Available / Almost Full / Full)
- Color-coding automático:
  - 🟢 Verde: < 70% ocupado
  - 🟠 Naranja: 70-99% ocupado
  - 🔴 Rojo: 100% ocupado

### 3. API (`/api/classes`)
```json
{
  "id": "1",
  "name": "Funcional 6am",
  "coach": "Juan Pérez",
  "dayOfWeek": 0,
  "startTime": "06:00",
  "endTime": "07:00",
  "capacity": 20,
  "reserved": 15,
  "serviceType": "group"
}
```

---

## 🛠 Stack Técnico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.3 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | React Hooks (useState, useEffect) |
| API | Route Handlers |
| Database | *(Próxima fase)* |
| Auth | *(Próxima fase)* |

---

## 📊 Datos Mock

10 clases de ejemplo con variedad de ocupación:

| Clase | Coach | Día | Hora | Capacidad | Estado |
|-------|-------|-----|------|-----------|--------|
| Funcional 6am | Juan Pérez | Mon | 06:00-07:00 | 15/20 | Almost Full |
| Yoga Flow | Carlos López | Tue | 18:00-19:00 | 25/25 | Full |
| Pilates 9am | Laura Martínez | Wed | 09:00-10:00 | 10/20 | Available |
| HIIT 5pm | Juan Pérez | Wed | 17:00-18:00 | 18/18 | Full |
| ... | ... | ... | ... | ... | ... |

*Ver `src/lib/mock-data.ts` para lista completa.*

---

## 🔜 Roadmap (Fases Siguientes)

### Fase 2: Autenticación & DB
- [ ] NextAuth.js con Google OAuth
- [ ] PostgreSQL + Prisma ORM
- [ ] Roles (admin, coach, alumno)
- [ ] Perfil de usuario

### Fase 3: Reservas
- [ ] Crear reserva (alumno)
- [ ] Cancelar reserva
- [ ] Validar cupos en tiempo real
- [ ] Historial de reservas

### Fase 4: Asistencia
- [ ] Check-in de clase (coach)
- [ ] Registro de ausencias
- [ ] Reportes de asistencia

### Fase 5+: Escala SaaS
- [ ] Multi-tenant
- [ ] Customización por gimnasio
- [ ] Módulos activables
- [ ] Analytics

---

## 📚 Documentación

- **[CONTEXTO_GYM.md](./CONTEXTO_GYM.md)** — Contexto completo del negocio, problemas y decisiones arquitectónicas
- **[API Routes](./docs/api.md)** *(próximamente)*
- **[Database Schema](./docs/schema.md)** *(próximamente)*

---

## 🧪 Testing

```bash
# Lint
npm run lint

# Build check
npm run build
```

*(Unit tests y E2E tests en próximas fases)*

---

## 📝 Commits Principales

```
f0a8345 docs: add complete project context and phase 1 implementation status
128707f chore: reorganize src structure and fix tsconfig paths
0a18df2 feat: add classes page and update layout with navbar
ee287c1 feat: add ClassCard and Navbar components
af03c0f feat: add GET /api/classes endpoint
efb0790 chore: add mock classes data
0a52b6d chore: create Next.js app with Tailwind
```

---

## 👤 Autor

Desarrollado como MVP para **Primary Performance** (Gimnasio)  
Implementación técnica: AI-assisted development

---

## 📄 Licencia

*(Por definir - contactar con team)*

---

## 🤝 Contribuir

Este es un repositorio privado en fase MVP. Para cambios:

1. Crear feature branch: `git checkout -b feature/nombre`
2. Commit cambios: `git commit -m "feat: descripción"`
3. Push: `git push origin feature/nombre`
4. Crear Pull Request

---

## 📧 Contacto

Para preguntas sobre el proyecto:
- Contactar al equipo de Primary Performance
- Review en: https://github.com/EduardoIICG1/gym-app-mvp

---

**Estado actual:** MVP Fase 1 ✅ Completado  
**Última actualización:** 2026-04-14
