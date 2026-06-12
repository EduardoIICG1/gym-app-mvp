# Backlog / Roadmap — Gym App MVP

Fecha de actualización: 2026-06-09  
Proyecto: Primary Performance / Gym App MVP

Este documento resume, a nivel macro, qué existe hoy en la app, qué falta construir y cómo priorizar las siguientes iteraciones.

El objetivo es que cualquier continuación del proyecto tenga contexto suficiente para avanzar sin reabrir decisiones ya tomadas.

> **Nota:** Las estimaciones de progreso son aproximadas y se ajustarán con el feedback real de la admin tras la demo.

---

## Estado de progreso aproximado

| Hito | Progreso estimado |
|------|:-----------------:|
| Demo operativa para feedback admin | 75% |
| Uso interno asistido en Primary | 65–70% |
| Producto pulido mobile-first / producción | 50–55% |

### Avance por bloque funcional

| Bloque | Avance |
|--------|:------:|
| Core clases / calendario / reservas | 85% |
| Series recurrentes | 95% |
| Filtros / búsqueda | 100% MVP |
| Invitaciones masivas | 85% |
| Experiencia admin / coach | 70% |
| Experiencia miembro | 60% |
| Health / Kinesiología | 50% |
| Responsive / mobile-first | 20% |
| Rediseño visual Loganfield | 15% |
| Producción / backups / seguridad | 45% |
| Super Admin / multi-gimnasio | 10% |
| Pagos / membresías avanzado | 25% |

---

## 1. Lo que ya existe hoy

### Core operativo

- Login con Google.
- Roles:
  - `ADMIN`
  - `COACH`
  - `KINESIOLOGIST`
  - `MEMBER`
- Home con información general / anuncios.
- Calendario `/calendar`.
- Vista de clases para miembros `/classes`.
- Gestión de clases `/admin/classes`.
- Gestión de miembros `/admin/members`.
- Gestión de membresías `/admin/memberships`.
- Perfil miembro `/profile`.
- Perfil staff `/staff-profile`.
- Módulo Health / Kinesiología `/health`.

### Clases y calendario

- Crear clase individual.
- Crear clase recurrente semanal.
- Selector de hora 24h.
- Vista semanal en `/admin/classes` con navegación por semanas.
- Filtros en `/admin/classes`:
  - Todas / Activas / Canceladas.
  - Búsqueda por nombre.
  - Filtro por coach.
  - Filtro por tipo de servicio.
- Filtros en `/calendar` (Issue #10 — cerrado en alcance MVP).
- Fecha exacta por sesión.
- Editar clase individual.
- Pausar / reactivar clase.
- Eliminar clase.

### Series recurrentes (Issue #4 — cerrado en alcance funcional)

- [x] Ver panel de serie: metadatos + lista completa de sesiones.
- [x] Identificar qué clases pertenecen a una serie.
- [x] Editar solo esta clase (ocurrencia puntual).
- [x] Editar esta y futuras (desde la sesión seleccionada en adelante).
- [x] Editar toda la serie (nombre, tipo, capacidad, nota).
- [x] Acortar serie desde una fecha elegida (cancela sesiones futuras sin reservas).
- [x] Acciones desde el panel de serie: Editar · Futuras · Acortar.
- [x] Badge de reservas e invitaciones pendientes por sesión.
- [x] Invitación masiva — dry-run con vista previa de creaciones y omisiones.
- [x] Invitación masiva — confirmación real en transacción atómica.
- [x] Detalle de invitados por sesión desde el panel de serie (expandible, con estado por invitado).
- [x] Badge "N inv." visible en `/admin/classes` y `/calendar` (admin/coach).

### Membresías

- Crear membresías.
- Editar membresías.
- Renovar membresías.
- Control de sesiones usadas / restantes.
- Estado de pago.
- Bloqueo / validación según membresía y tipo de servicio.

### Health / Kinesiología

- Acceso separado para Kinesiólogo / Admin.
- Ficha base de pacientes.
- Registro clínico inicial (SOAP).
- Separación de permisos frente a Coach / Member.

---

## 2. Estado actual y próximo paso

El núcleo funcional de clases, series recurrentes y filtros está prácticamente cerrado para el alcance del MVP.

**Antes de la demo:**

- [ ] Smoke test en preview con los flujos principales:
  - Home.
  - Calendar.
  - Admin Classes + panel de serie.
  - Members.
  - Memberships.
  - Health.
  - Member Classes (`/classes`).
- [ ] Quitar datos sensibles o emails reales de documentación pública.
- [ ] Preparar preguntas concretas para la admin.
- [ ] Anotar feedback real sin implementar en caliente.

---

## 3. Backlog abierto: Issues y funcionalidad pendiente

### 3.1 Reemplazo de coach

- [ ] Cambiar coach de una sesión puntual.
- [ ] Permitir que el coach reemplazante vea la clase y tome asistencia.
- [ ] Guardar trazabilidad del cambio.

### 3.2 Asistencia post-clase

- [ ] Permitir tomar asistencia después de terminada la clase.
- [ ] Definir ventana: 24 o 48 horas.
- [ ] Evitar asistencia editable indefinidamente.

### 3.3 Invitaciones — funcionalidad restante (15%)

- [ ] Ver y gestionar invitaciones individuales pendientes desde detalle de clase.
- [ ] Cancelar invitación puntual desde panel admin.
- [ ] Expiración automática de invitaciones (job o trigger).

---

## 4. Experiencia miembro (60% completada)

Relevante antes de profundizar en administración avanzada, porque afecta directamente la claridad para el cliente final.

- [ ] Mejorar claridad de sesiones disponibles.
- [ ] Mostrar próximas reservas en `/profile`.
- [ ] Mostrar historial de reservas.
- [ ] Mejorar mensajes cuando no puede reservar:
  - sin membresía,
  - membresía vencida,
  - sin sesiones restantes,
  - clase llena,
  - servicio no incluido en su plan.
- [ ] Mejorar visualización del estado de membresía activa / vencida.
- [ ] Evaluar notificaciones (email, WhatsApp) como mejora posterior.

---

## 5. Backlog Health / Kinesiología (Fase 2)

No bloquea el lanzamiento. Su prioridad depende del feedback de la admin sobre qué tan central es Kinesiología en el día a día.

- [ ] Reabrir sesión clínica cerrada con control (solo Admin, con razón).
- [ ] Adjuntar documentos: PDF, imágenes, exámenes.
- [ ] Exportar ficha / bitácora.
- [ ] Reporte para Isapre / aseguradora.
- [ ] Historial clínico más completo.
- [ ] Separar Health como módulo activable por gimnasio / usuario.

---

## 6. Rediseño visual Loganfield

La app funciona pero la identidad visual es genérica. Este bloque aplica el diseño de referencia Loganfield / Claude Design para unificar la apariencia y darle consistencia entre roles.

**Alcance:**

- Aplicar tokens de diseño desde el archivo `.zip` de Claude Design:
  - paleta de colores principal y secundaria,
  - tipografía,
  - espaciado y radios de borde.
- Unificar componentes:
  - botones (primario, secundario, destructivo, ghost),
  - labels y etiquetas,
  - cards (clases, miembros, membresías, pacientes),
  - badges de estado y servicio,
  - modales y drawers,
  - formularios (inputs, selects, checkboxes, date pickers),
  - tablas y listas,
  - navegación (sidebar, header, bottom nav mobile).
- Consistencia visual entre roles (admin, coach, kinesiologista, miembro).
- Revisión de contraste y accesibilidad básica.

**Orden recomendado dentro del bloque:**

1. Tokens globales y componentes base (buttons, inputs, badges).
2. Navegación (sidebar desktop + bottom nav mobile).
3. Módulo clases / calendario.
4. Módulo admin (members, memberships).
5. Módulo Health.
6. Perfil y vistas de miembro.

---

## 7. Responsive / Mobile-first

> **80% del uso esperado de la app será desde dispositivos móviles** (Android e iPhone). Hoy la app es funcional pero está optimizada para desktop.

Este bloque adapta la experiencia para que sea fluida y cómoda en cualquier tamaño de pantalla, sin sacrificar funcionalidad en desktop.

**Objetivos:**

- Diseño mobile-first: la pantalla chica es la pantalla de diseño base.
- Compatible con: Android, iPhone, tablet y desktop.
- Evitar saturación visual en mobile: priorizar la información más relevante.
- Todos los botones tocables (mínimo 44 × 44 px de área táctil).
- Sin patrones hover-only: cualquier acción que hoy requiera hover debe tener alternativa en tap.

**Prioridades de vista (en orden):**

1. `/admin/classes` — lista semanal, acciones de clase, panel de serie.
2. `/calendar` — vista semanal, chips de sesión, modal de inscripción.
3. Panel de serie — sesiones densas con múltiples acciones por fila.
4. Detalle de clase `/classes/[id]` — lista de inscritos, asistencia.
5. `/classes` (member-facing) — explorar y reservar clases.
6. Módulo Health — ficha clínica y registro de sesión (SOAP).
7. `/profile` — estado de membresía, reservas, historial.

**Patrones de adaptación:**

- Filas densas con muchas columnas → cards apiladas en mobile.
- Tablas de más de 4 columnas → formato card o scroll horizontal controlado.
- Modales largos → bottom sheets en mobile.
- Sidebar desktop → bottom nav en mobile (ya existe parcialmente, revisar cobertura).
- Formularios de varios campos → una columna en mobile.
- Acciones secundarias de fila (Editar · Futuras · Acortar) → menú contextual o bottom sheet en mobile.

---

## 8. Backlog de membresías y pagos (25%)

Este bloque queda como mejora operativa progresiva. No es requisito de lanzamiento si la administración puede gestionarlo manualmente.

- [ ] Mejorar flujo de pago pendiente / vencido.
- [ ] Manejar pagos parciales si el gimnasio lo necesita.
- [ ] Mejor visibilidad de vencimientos próximos.
- [ ] Alertas de membresías por vencer.
- [ ] Exportar membresías a Excel / CSV.
- [ ] Historial de renovaciones.
- [ ] Historial de pagos.
- [ ] Dashboard simple: activas, vencidas, pendientes, renovaciones próximas.

### 8.1 Lógica de consumo de sesiones — regla de negocio objetivo (post-demo)

QA detectó (PR #38) que `POST /api/reservations` elige qué `Membership` consumir
ordenando por `createdAt DESC` y tomando la primera que cumpla
`status === ACTIVE` + ventana de fechas + sesiones disponibles — **sin considerar
`paymentStatus` en ningún momento**. Esto puede llevar a consumir sesiones de una
membresía `PENDING`/`OVERDUE` antes que una `PAID` vigente, si la `PENDING` fue
creada más recientemente y tiene fechas vigentes.

Regla objetivo acordada (NO implementar en PR #38 — requiere PR dedicado):

- [ ] Solo membresías `ACTIVE` + `paymentStatus = PAID` pueden consumir sesiones.
- [ ] Membresías `PENDING`, `OVERDUE` (u otros estados de pago no liquidados) no
      participan en el consumo aunque estén `ACTIVE` y vigentes por fecha.
- [ ] Entre varias membresías `ACTIVE`+`PAID` elegibles, priorizar la que vence antes
      (`endDate` ascendente) para agotar primero los packs próximos a vencer.
- [ ] Revisar por separado el problema de membresías vencidas que permanecen con
      `status = ACTIVE` pese a tener `endDate` pasado, y definir una estrategia de
      transición automática a `EXPIRED` (job/cron o chequeo on-read).

---

## 9. Backlog técnico para producción (45%)

### Base de datos

- [ ] Confirmar Supabase productivo.
- [ ] Separar data demo de data real.
- [ ] Definir backups automáticos.
- [ ] Documentar recuperación ante pérdida de datos.

### Seguridad

- [ ] Revisar permisos en endpoints críticos por rol.
- [ ] Rate limit en endpoints sensibles.
- [ ] Audit log básico.
- [ ] Evitar datos reales en repo público.
- [ ] Revisar exposición de información personal.

### Calidad

- [ ] Resolver lint errors preexistentes en PR separado.
- [ ] Crear smoke tests mínimos.
- [ ] Checklist QA por rol.
- [ ] Confirmar build automático por PR.
- [ ] Confirmar preview deploy por PR.
- [ ] Confirmar deploy production desde `master`.

### Observabilidad

- [ ] Logging de errores.
- [ ] Monitoreo básico.
- [ ] Alertas si algo crítico falla.

---

## 10. Futuro: Multi-gimnasio / Super Admin (10%)

No implementar antes de estabilizar Primary Performance.

- [ ] Entidad `Gym` / tenant.
- [ ] Panel Super Admin.
- [ ] Crear / editar gimnasios.
- [ ] Asignar admin principal por gimnasio.
- [ ] Configurar identidad: nombre, logo, color, datos de contacto.
- [ ] Activar / desactivar módulos por gimnasio.
- [ ] Separación de datos entre gimnasios.
- [ ] Onboarding inicial guiado.
- [ ] Definir modelo comercial / precio por gimnasio.

---

## 11. Orden recomendado post-demo

El orden asume que la demo se realiza con el estado actual y que el feedback de la admin determina qué ajustes son críticos.

1. **Cerrar PRs abiertos y estabilizar** — ningún PR sin mergear pendiente de QA.
2. **Demo con admin** — flujos principales, anotar feedback sin implementar en caliente.
3. **Incorporar feedback crítico** — solo lo que bloquea la operación diaria.
4. **Mobile-first de flujos principales** — `/admin/classes`, calendario, panel de serie, `/classes` member-facing.
5. **Rediseño visual Loganfield por módulos** — empezar por tokens y componentes base, luego por vista.
6. **Health fase 2** — reabrir sesión, adjuntar documentos, exportar ficha.
7. **Producción / hardening** — DB, backups, seguridad, dominio, deploy controlado.
8. **Super Admin / multi-gimnasio** — solo cuando Primary Performance esté estable en producción.
9. **Pagos / membresías avanzado** — paralelizable con #8 si hay demanda real.

---

## 12. Checklist para considerar MVP cerrado

- [ ] Admin puede crear y gestionar clases sin ayuda técnica.
- [ ] Admin puede crear clases individuales y recurrentes.
- [ ] Admin puede corregir errores básicos de calendario.
- [ ] Coach puede ver sus clases y tomar asistencia.
- [ ] Miembro puede reservar según su membresía.
- [ ] Miembro entiende claramente su estado, sesiones y reservas.
- [ ] Kinesiología funciona sin romper el flujo principal.
- [ ] La app está desplegada estable.
- [ ] Hay respaldo básico de datos.
- [ ] No hay datos sensibles en repo público.
- [ ] Existe documentación mínima de operación.
- [ ] Se hizo demo con admin y se incorporó feedback prioritario.

---

## 13. Checklist para considerar producción real

- [ ] Dominio final configurado.
- [ ] Auth configurado en dominio final.
- [ ] Supabase productivo estable.
- [ ] Backups automáticos activos.
- [ ] Deploy controlado con rollback.
- [ ] Smoke test post-deploy.
- [ ] Permisos revisados por rol.
- [ ] Logs / errores visibles.
- [ ] Admin capacitada.
- [ ] Plan de soporte básico.

---

## 14. Qué NO hacer ahora

- No iniciar multi-gimnasio antes de validar Primary Performance.
- No construir Super Admin antes de cerrar operación base.
- No rediseñar toda la UI antes de la demo.
- No introducir WhatsApp / notificaciones automáticas antes de cerrar operación base.
- No arreglar todos los lint errors dentro de PRs funcionales.
- No meter credenciales, emails reales o información sensible en documentación pública.
- No abrir Issues de diseño / mobile antes de tener feedback de la demo.
- No prometer fechas exactas: el orden se ajustará con el feedback real de la admin.

---

## 15. Regla práctica para próximas iteraciones

Si la admin no puede operar el día a día sin ayuda, eso va antes que cualquier mejora técnica o visual.

Si el miembro no entiende por qué puede o no puede reservar, eso va antes que mejoras administrativas avanzadas.

Si algo es visión de plataforma (Multi-gimnasio, Super Admin), debe quedar registrado pero no mezclarse con la estabilización del MVP de Primary Performance.

Si el feedback de la admin tras la demo cambia las prioridades, este roadmap se actualiza — no se fuerza el orden original.
