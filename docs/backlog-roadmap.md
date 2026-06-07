# Backlog / Roadmap — Gym App MVP

Fecha de actualización: 2026-06-05  
Proyecto: Primary Performance / Gym App MVP

Este documento resume, a nivel macro, qué existe hoy en la app, qué falta construir y cómo priorizar las siguientes iteraciones.

El objetivo es que cualquier continuación del proyecto tenga contexto suficiente para avanzar sin reabrir decisiones ya tomadas.

---

## 1. Lo que ya existe hoy

### Core operativo

- Login con Google.
- Roles:
  - `ADMIN`
  - `COACH`
  - `KINESIOLOGIST`
  - `MEMBER`
- Home con información general/anuncios.
- Calendario `/calendar`.
- Vista de clases para miembros `/classes`.
- Gestión de clases `/admin/classes`.
- Gestión de miembros `/admin/members`.
- Gestión de membresías `/admin/memberships`.
- Perfil miembro `/profile`.
- Perfil staff `/staff-profile`.
- Módulo Health/Kinesiología `/health`.

### Clases y calendario

- Crear clase individual.
- Crear clase recurrente semanal.
- Selector de hora 24h.
- Vista semanal en `/admin/classes`.
- Filtros:
  - Todas.
  - Activas.
  - Canceladas.
- Fecha exacta por sesión.
- Editar clase.
- Pausar/reactivar clase.
- Eliminar clase.

### Membresías

- Crear membresías.
- Editar membresías.
- Renovar membresías.
- Control de sesiones usadas/restantes.
- Estado de pago.
- Bloqueo/validación según membresía y tipo de servicio.

### Health / Kinesiología

- Acceso separado para Kinesiólogo/Admin.
- Ficha base de pacientes.
- Registro clínico inicial.
- Separación de permisos frente a Coach/Member.

---

## 2. Lo urgente antes de mostrar la app

Objetivo: demo estable y clara, sin agregar features nuevas.

- [ ] Revisar PR de demo readiness.
- [ ] Quitar emails reales o datos sensibles de documentación pública.
- [ ] Hacer smoke test en preview.
- [ ] Mergear solo si el preview está limpio.
- [ ] Probar Production/UAT:
  - Home.
  - Calendar.
  - Admin Classes.
  - Members.
  - Memberships.
  - Health.
  - Member Classes.
- [ ] Preparar preguntas para la admin.
- [ ] Anotar feedback real sin implementar en caliente.

---

## 3. Backlog obligatorio siguiente: Issue #4

Este bloque viene después de la demo.

### 3.1 Gestión de series recurrentes

Hoy se pueden crear clases recurrentes, pero todavía falta administrarlas bien como serie.

- [ ] Ver una serie agrupada.
- [ ] Identificar qué clases pertenecen a una serie.
- [ ] Editar una serie completa.
- [ ] Acortar una serie desde cierta fecha.
- [ ] Eliminar futuras sesiones.
- [ ] No eliminar clases con reservas/asistencia sin confirmación.

### 3.2 Editar ocurrencia vs serie

- [ ] Al editar una clase recurrente, preguntar:
  - Solo esta clase.
  - Esta y futuras.
  - Toda la serie.
- [ ] Mostrar impacto antes de aplicar cambios.
- [ ] No tocar sesiones pasadas sin confirmación.

### 3.3 Invitación masiva

- [ ] Seleccionar alumnos una vez al crear una serie.
- [ ] Crear invitaciones para todas las sesiones.
- [ ] Evitar duplicados.
- [ ] Mostrar resumen:
  - creadas,
  - omitidas,
  - conflictos.

### 3.4 Reemplazo de coach

- [ ] Cambiar coach de una sesión puntual.
- [ ] Permitir que el coach reemplazante vea la clase.
- [ ] Permitir tomar asistencia.
- [ ] Guardar trazabilidad del cambio.

### 3.5 Asistencia post-clase

- [ ] Permitir tomar asistencia después de terminada la clase.
- [ ] Definir ventana:
  - 24 horas, o
  - 48 horas.
- [ ] Evitar asistencia editable indefinidamente.

---

## 4. Orden recomendado de PRs después de la demo

### PR 7 — Editar ocurrencia vs serie

- Define la UX y reglas.
- No incluye invitación masiva.

### PR 8 — Reemplazo de coach por sesión

- Cambiar instructor en una clase puntual.
- Permisos para coach reemplazante.

### PR 9 — Asistencia post-clase

- Ventana configurable para tomar asistencia después.

### PR 10 — Invitación masiva

- Selección de alumnos al crear serie.
- Invitaciones automáticas.

### PR 11 — Gestión avanzada de serie

- Acortar/extender/eliminar futuras clases.
- Manejo de clases con reservas.

---

## 5. Backlog de experiencia miembro

Este bloque es relevante antes de profundizar en administración/pagos, porque afecta directamente la claridad para el cliente final.

- [ ] Mejorar claridad de sesiones disponibles.
- [ ] Mostrar próximas reservas.
- [ ] Mostrar historial de reservas.
- [ ] Mejorar mensajes cuando no puede reservar.
- [ ] Mostrar motivo claro:
  - sin membresía,
  - membresía vencida,
  - sin sesiones,
  - clase llena,
  - servicio no incluido en su plan.
- [ ] Mejorar visualmente el estado de membresía activa/vencida.
- [ ] Evaluar notificaciones después:
  - email,
  - WhatsApp.

---

## 6. Backlog Health / Kinesiología

No necesariamente bloquea el lanzamiento, pero puede ser más relevante que pagos avanzados si el gimnasio quiere usar Kinesiología como parte del servicio.

- [ ] Reabrir sesión clínica cerrada con control.
- [ ] Adjuntar documentos:
  - PDF,
  - imágenes,
  - exámenes.
- [ ] Exportar ficha/bitácora.
- [ ] Reporte para Isapre/aseguradora.
- [ ] Historial clínico más completo.
- [ ] Separar Health como módulo activable por gimnasio/usuario.

---

## 7. Backlog de membresías y pagos

Este bloque queda como mejora operativa en marcha, no como requisito de lanzamiento.

Motivo: hoy puede seguir gestionándose como se hace actualmente si la administración no urge.

- [ ] Mejorar flujo de pago pendiente.
- [ ] Manejar pagos parciales si el gimnasio lo necesita.
- [ ] Mejor visibilidad de vencimientos próximos.
- [ ] Alertas de membresías por vencer.
- [ ] Exportar membresías a Excel/CSV.
- [ ] Historial de renovaciones.
- [ ] Historial de pagos.
- [ ] Dashboard simple:
  - activas,
  - vencidas,
  - pendientes,
  - renovaciones próximas.

---

## 8. Backlog técnico para producción

### Base de datos

- [ ] Confirmar Supabase productivo.
- [ ] Separar data demo de data real.
- [ ] Definir backups.
- [ ] Documentar recuperación ante pérdida de datos.

### Seguridad

- [ ] Revisar permisos en endpoints críticos.
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

## 9. Futuro: Multi-gimnasio / Super Admin

Este bloque reemplaza la idea de sitio público/CMS.

No se trata de administrar contenido de una web informativa, sino de que Eduardo, como dueño/desarrollador de la plataforma, pueda configurar cada gimnasio cuando se sumen nuevos clientes.

No implementar antes de estabilizar Primary Performance.

- [ ] Entidad `Gym` o tenant.
- [ ] Panel Super Admin.
- [ ] Crear/editar gimnasios.
- [ ] Asignar admin principal por gimnasio.
- [ ] Configurar identidad del gimnasio:
  - nombre,
  - logo,
  - color principal,
  - emoji/icono,
  - datos de contacto.
- [ ] Activar/desactivar módulos por gimnasio:
  - clases grupales,
  - personal training,
  - kinesiología,
  - Health,
  - membresías,
  - reservas.
- [ ] Master de personas/base de usuarios por gimnasio.
- [ ] Onboarding inicial del gimnasio.
- [ ] Primeros pasos guiados:
  - crear staff,
  - crear servicios,
  - crear membresías,
  - crear primeras clases.
- [ ] Configuración de permisos por gimnasio.
- [ ] Separación de datos entre gimnasios.
- [ ] Evitar que staff de un gimnasio vea datos de otro.
- [ ] Definir modelo comercial/precio por gimnasio.
- [ ] Activación/desactivación vía backend o panel interno.

---

## 10. Checklist para considerar MVP cerrado

El MVP estaría cerrado cuando:

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

## 11. Checklist para considerar producción real

Producción real requiere:

- [ ] Dominio final.
- [ ] Auth configurado en dominio final.
- [ ] Supabase productivo estable.
- [ ] Backups.
- [ ] Deploy controlado.
- [ ] Smoke test post-deploy.
- [ ] Permisos revisados por rol.
- [ ] Logs/errores visibles.
- [ ] Admin capacitada.
- [ ] Plan de soporte básico.

---

## 12. Qué NO hacer ahora

- No iniciar multi-gimnasio antes de validar Primary Performance.
- No construir Super Admin antes de cerrar operación base.
- No rediseñar toda la UI antes de la demo.
- No mezclar Issue #4 con producción/hosting.
- No introducir WhatsApp/notificaciones automáticas antes de cerrar operación base.
- No arreglar todos los lint errors dentro de PRs funcionales.
- No meter credenciales, emails reales o información sensible en documentación pública.

---

## 13. Prioridad macro recomendada

1. Demo readiness / PR actual.
2. Feedback admin.
3. Issue #4 — clases recurrentes avanzadas.
4. Experiencia miembro.
5. Health / Kinesiología fase 2.
6. Producción real: DB, backups, dominio, seguridad.
7. Membresías/pagos avanzado.
8. Multi-gimnasio / Super Admin.

---

## 14. Regla práctica para próximas iteraciones

Si la admin no puede operar el día a día sin ayuda, eso va antes que cualquier mejora técnica o visual.

Si el miembro no entiende por qué puede o no puede reservar, eso va antes que mejoras administrativas avanzadas.

Si algo es visión de plataforma, como Multi-gimnasio o Super Admin, debe quedar registrado pero no mezclarse con la estabilización del MVP de Primary Performance.
