# Checklist Demo — Feedback Admin Gimnasio

Sesión de feedback operativo con la admin del gimnasio.
Objetivo: validar flujos reales y capturar fricciones antes de la siguiente iteración.

---

## Cuenta a usar en la demo

| Campo | Valor |
|-------|-------|
| Email | `lalopeluuza01@gmail.com` |
| Rol | ADMIN |
| Acceso | Todo — clases, miembros, membresías, health |

> Si la admin quiere probar como alumno: usar `performanceprimary.task@gmail.com` (GROUP MEMBER activo con reservas demo).

---

## Flujo recomendado (orden sugerido)

### 1. Home — `/`
- Mostrar el feed de anuncios.
- Si hay anuncio fijado, señalarlo ("este queda siempre arriba").
- Mostrar el resumen de próximas clases.

### 2. Calendario — `/calendar`
- Navegar entre días de la semana.
- Mostrar clases individuales y recurrentes (distinguibles por fecha en la vista admin).
- Demostrar el botón **+ Nueva clase** en el header.
  - Crear una clase individual (flujo rápido: nombre, instructor, hora).
  - Opcional: mostrar el selector de repetición semanal.
- Mostrar los estados: Activa, Sin cupos, Reservada (como alumno).

### 3. Gestión de clases — `/admin/classes`
- Mostrar navegación semanal (◀ ▶ semanas).
- Mostrar filtros Todas / Activas / Canceladas.
- Señalar que cada grupo muestra día + fecha exacta (`MARTES · 09-06-2026`).
- Demostrar editar una clase existente.
- Demostrar pausar/reactivar.
- Preguntar: ¿con qué frecuencia se crean clases nuevas? ¿individual o siempre recurrentes?

### 4. Miembros — `/admin/members`
- Mostrar lista con roles, estados activo/inactivo.
- Buscar por nombre.
- Entrar al perfil de un miembro → ver membresías activas.
- Preguntar: ¿qué información extra necesitarías ver aquí?

### 5. Membresías — `/admin/memberships`
- Mostrar lista con estados: PAID, PENDING, OVERDUE.
- Demostrar flujo de renovación.
- Señalar el cálculo de sesiones usadas / restantes.
- Preguntar: ¿el flujo de cobro y renovación refleja cómo lo hacen hoy?

### 6. Módulo salud — `/health`
- Mostrar lista de pacientes kinesiología.
- Entrar a ficha de un paciente: anamnesis, sesiones, restricciones.
- Preguntar: ¿el kinesiólogo necesita ver algo más en la ficha?

---

## Preguntas de feedback operativo

### Clases y calendario
- [ ] ¿Con qué frecuencia crean clases nuevas? ¿Siempre recurrentes o hay individuales?
- [ ] ¿Necesitan editar toda la serie o solo una fecha puntual?
- [ ] ¿Qué pasa cuando cancelan una clase de la serie? ¿Notifican a los inscritos?
- [ ] ¿El formato de hora (24h) es cómodo o prefieren AM/PM?

### Miembros y membresías
- [ ] ¿El flujo de renovación refleja cómo cobran hoy (WhatsApp, transferencia, efectivo)?
- [ ] ¿Necesitan exportar la lista de miembros o membresías a Excel/PDF?
- [ ] ¿Cómo manejan los miembros que pagan parcialmente?

### General
- [ ] ¿Qué pantalla usarían más en el día a día?
- [ ] ¿Qué les resulta confuso o necesitaría más explicación?
- [ ] ¿Falta algo que usan hoy en papel/planilla que no está en la app?

---

## Known limitations — Issue #4 (fase siguiente obligatoria)

Estas funciones **no están implementadas** aún. Si la admin las pide, anotar como feedback confirmado.

| Limitación | Estado |
|-----------|--------|
| Editar serie completa de clases recurrentes | Issue #4 — pendiente |
| Editar solo una ocurrencia de la serie | Issue #4 — pendiente |
| Eliminar clases futuras de una serie desde una fecha | Issue #4 — pendiente |
| Cortar/acortar serie desde una fecha | Issue #4 — pendiente |
| Invitación masiva de alumnos al crear serie | Issue #4 — pendiente |
| Re-apertura de sesión clínica cerrada | Fase 2 health — pendiente |
| Upload de documentos clínicos (PDF, imágenes) | Fase 2 health — pendiente |
| Export PDF / Excel de membresías o asistencia | No planificado aún |
| Notificaciones automáticas (email/WhatsApp) | No planificado aún |

---

## Backlog de ítems detectados en QA pre-demo

Cosas encontradas durante revisión que no se implementaron en este PR por ser cambios grandes.
A priorizar después de recoger feedback de la admin.

| Ítem | Dónde | Prioridad estimada |
|------|-------|-------------------|
| Edición de serie recurrente (Issue #4) | `/admin/classes`, `/calendar` | Alta |
| Invitación masiva al crear serie | `CreateClassModal` | Alta |
| `↺ Dar recuperación` — UX del botón poco visible para coaches nuevos | `/calendar` — lista de asistencia | Media |
| `↻ Renovar` en membresías — ícono de flecha puede confundir | `/admin/memberships` | Baja |

---

## Notas post-demo

_(completar después de la reunión)_

- Feedback recibido:
- Funciones más valoradas:
- Fricciones mencionadas:
- Funciones solicitadas no implementadas:
- Decisiones tomadas:
