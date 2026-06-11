# Roadmap de consenso — Agendamiento, reservas, invitaciones y asistencia

Fecha: 2026-06-11
Fuente: `primary_performance_consenso_agendamiento.docx` (v1.0 — Consenso funcional para MVP, 10 jun 2026)

> **Este documento es la fuente de verdad funcional** para cualquier cambio futuro en
> calendario, reservas, invitaciones, asistencia, kinesiología y permisos por rol.
> No reemplaza `docs/backlog-roadmap.md` (estado general del proyecto); lo complementa
> con las reglas de negocio acordadas para el motor de agenda/reservas.

---

## 1. Resumen ejecutivo del consenso

El consenso **no es crear tres sistemas separados**. Es usar **un solo motor de
calendario/reservas** (`Session` + `Booking` + `BookingInvitation` en el schema actual),
con **políticas distintas según `serviceType`**.

- La app opera como híbrido: gimnasio (clases grupales), agenda dirigida (entrenamiento
  personalizado) y flujo clínico controlado (kinesiología).
- **GROUP**: se publica en calendario y el `MEMBER` se auto-reserva según su membresía.
  No hay invitación/convocatoria manual para clases grupales regulares.
- El coach que aparece en una clase GROUP **imparte** la clase; no es un filtro de acceso.
- **PERSONAL_TRAINING**: por defecto, *coach propone horario → member acepta/rechaza →
  sesión confirmada*. No hay auto-agenda libre todavía.
- **KINESIOLOGY**: agenda dirigida por `KINESIOLOGIST`/`ADMIN`. El paciente confirma,
  pero no mueve libremente la agenda clínica en MVP.
- Una **invitación no es una entidad mental separada**: es una reserva en estado
  `PENDING_CONFIRMATION` que retiene un slot hasta que el member acepte, rechace o expire.
- La **asistencia la marca el profesional o admin**. El member no marca su propia
  asistencia en MVP.
- El **consumo de sesiones** se define por servicio: GROUP puede descontar al reservar/confirmar;
  PT y KINE deberían descontar al marcar `ATTENDED`.
- La **ficha clínica de kinesiología** es visible solo para `KINESIOLOGIST` y `ADMIN`.
  El `COACH` solo ve restricciones operativas autorizadas (resumen seguro).
- El MVP se enfoca en: reservas, confirmaciones, asistencia, no-show básico, consumo de
  sesiones y permisos. Lista de espera avanzada, Google Calendar real y penalizaciones
  automáticas quedan para después.

---

## 2. Principios funcionales cerrados

| Principio | Decisión cerrada | Implicancia práctica |
|---|---|---|
| No sobreingeniería | No crear módulos separados de reservas, invitaciones, asistencia y kinesiología. | Unificar todo sobre `Session`/`Booking`/`BookingInvitation` con reglas por `serviceType`. |
| Clases grupales simples | El member reserva una clase grupal publicada. | El coach imparte la clase, pero no invita a los alumnos. |
| Membresía manda | El acceso depende de la membresía y `serviceType`, no del coach. | Un member con `GROUP` activo puede reservar clases GROUP de distintos coaches. |
| PT dirigido pero flexible | Coach propone, member confirma. | Evita doble-booking y mantiene control operativo del coach. |
| Kine controlado | Kine/admin agenda, paciente confirma. | Protege criterio clínico, continuidad del tratamiento y datos sensibles. |
| Invitación con cupo retenido | Una propuesta bloquea el slot temporalmente. | Evita que dos personas ocupen el mismo horario. |
| Asistencia profesional | Coach/kine/admin marca asistencia y no-show. | El consumo de sesiones se basa en un hecho operativo, no solo en intención. |
| Backlog disciplinado | No meter features maduras antes de validar operación. | Google Calendar, app nativa, cobros no-show y waitlist avanzada no van primero. |

---

## 3. Vocabulario y modelo conceptual único

| Concepto | Definición funcional | Mapeo en schema actual |
|---|---|---|
| Session / CalendarEvent | Bloque en calendario: clase, PT, kine o bloqueo horario. | `Session` (vía `Program.serviceType`) |
| Booking / Reserva | Relación entre un member y una sesión. | `Booking` |
| Invitation / Invitación | Reserva pendiente de confirmación. No es otro módulo. | `BookingInvitation` (`InvitationStatus.PENDING` → al aceptar crea `Booking`) |
| Membership / Membresía | Derecho de acceso a uno o más tipos de servicio. | `Membership` (`serviceType`, `totalSessions`, `usedSessions`) |
| Attendance / Asistencia | Resultado operativo de una reserva confirmada. | `BookingStatus.ATTENDED` / `ABSENT` |
| ClinicalRecord / Ficha clínica | Diagnóstico, evolución, anamnesis kine. Visible solo KINE/ADMIN. | `HealthRecord`, `HealthSession` (`internalNotes`/`privateNotes`) |
| OperationalRestriction / Restricción operativa | Resumen seguro para entrenamiento. | `HealthRestriction` (`label` + `severity`) |

---

## 4. Estados de una reserva/sesión (modelo conceptual vs. schema actual)

| Estado conceptual | Cuándo ocurre | Quién lo genera | Efecto | Estado actual en `BookingStatus`/`InvitationStatus` |
|---|---|---|---|---|
| `AVAILABLE` | La sesión tiene cupo/slot disponible. | Sistema/staff | Member puede reservar si cumple reglas. | Implícito (no hay `Booking`/`Invitation` aún) |
| `PENDING_CONFIRMATION` | Profesional propone horario a un member. | Coach/kine/admin | Slot retenido hasta aceptar/rechazar/expirar. | `InvitationStatus.PENDING` (ya existe, hoy usado para "convocatoria masiva" en GROUP) |
| `CONFIRMED` | Reserva aceptada o auto-reservada con éxito. | Member o sistema | Cupo ocupado. | `BookingStatus.CONFIRMED` |
| `WAITLISTED` | No hay cupo, se activa lista de espera. | Member | No ocupa cupo hasta promoción. **Backlog post-MVP.** | `BookingStatus.WAITLISTED` (existe en enum, sin lógica de promoción) |
| `CANCELLED_EARLY` | Cancelación dentro del plazo permitido. | Member/staff | Libera cupo; devuelve sesión si fue descontada. | `BookingStatus.CANCELLED` (sin distinción early/late hoy — la API ya calcula `isLate` pero no lo persiste como estado distinto) |
| `CANCELLED_LATE` | Cancelación fuera de plazo. | Member/staff | Libera cupo; puede consumir sesión según política. | Igual que arriba — solo se devuelve un flag `late` en la respuesta de `DELETE /api/reservations`, no se persiste |
| `ATTENDED` | El alumno asistió. | Coach/kine/admin | Cierra reserva, descuenta sesión si corresponde. | `BookingStatus.ATTENDED` |
| `NO_SHOW` | El alumno no asistió. | Coach/kine/admin | Registra ausencia; política decide consumo. | `BookingStatus.ABSENT` (nombre distinto, mismo concepto) |
| `REJECTED` | Member rechaza propuesta. | Member | Libera slot, no descuenta sesión. | `InvitationStatus.DECLINED` |
| `EXPIRED` | Member no responde dentro del timeout. | Sistema | Libera slot, no descuenta sesión. | `InvitationStatus.EXPIRED` (existe en enum, sin job/cron que lo dispare) |

**Nota clave**: el schema actual ya tiene casi todo el vocabulario necesario
(`BookingStatus`, `InvitationStatus`). El gap principal **no es de modelo de datos**,
es de **flujo**: hoy `BookingInvitation` se usa solo para "convocatoria" en GROUP/series
recurrentes, y **no existe un flujo de `PENDING_CONFIRMATION` para PT/KINE** — el member
puede auto-reservar PT y KINE igual que GROUP (`POST /api/reservations` crea
`Booking` en `CONFIRMED` directo para cualquier `serviceType`, sin distinguir).

---

## 5. Matriz por `serviceType`

| `serviceType` | Quién crea | Quién ve | Quién reserva/confirma | ¿Usa invitación? | ¿Usa auto-reserva? | Quién marca asistencia | Cuándo consume sesión | Reglas de modificación | Visibilidad por rol |
|---|---|---|---|---|---|---|---|---|---|
| **GROUP** | ADMIN o COACH | MEMBER con membresía GROUP activa ve todas las clases GROUP publicadas (no depende del coach) | MEMBER se auto-reserva (`CONFIRMED` inmediato) | No (no hay invitación regular para GROUP) | Sí | COACH (dueño) o ADMIN | Recomendado al confirmar reserva (plan limitado); ilimitado = solo asistencia | Coach dueño/ADMIN edita; cambios con reservas notifican y permiten cancelar sin penalización; bajar cupo bloqueado si hay más inscritos que el nuevo cupo | ADMIN: todo · COACH: sus clases · KINE: no aplica · MEMBER: solo GROUP compatible con su membresía |
| **PERSONAL_TRAINING** | COACH o ADMIN propone para un member específico | MEMBER ve solo sus sesiones PT propuestas/confirmadas | Coach propone (`PENDING_CONFIRMATION`) → MEMBER acepta/rechaza | Sí — es el flujo principal | No (MVP: sin auto-agenda libre) | COACH (dueño) o ADMIN | Al marcar `ATTENDED` | Si coach cambia horario confirmado → vuelve a `PENDING_CONFIRMATION`; member no mueve directo, solo solicita | ADMIN: todo · COACH: sus PT · KINE: no aplica · MEMBER: solo sus PT propuestas/confirmadas |
| **KINESIOLOGY** | KINESIOLOGIST o ADMIN agenda | MEMBER (paciente) ve solo sus sesiones kine | Kine/admin agenda (`PENDING_CONFIRMATION` o `CONFIRMED` directo) → paciente confirma/rechaza | Sí | No (MVP: sin auto-reserva libre de kine) | KINESIOLOGIST (dueño) o ADMIN | Al marcar `ATTENDED`; `NO_SHOW` → kine/admin decide manualmente si consume | Kine asignado/ADMIN edita; cambio de confirmada → vuelve a `PENDING_CONFIRMATION`; paciente solo solicita reagendamiento | ADMIN: todo · KINESIOLOGIST: sus pacientes · COACH: solo restricciones operativas (sin ficha clínica) · MEMBER: solo sus sesiones + `patientNotes` |

---

## 6. Reglas cerradas por servicio

### 6.1 GROUP

- ADMIN/COACH crea la clase grupal (nombre, horario, duración, cupo, `serviceType=GROUP`).
- No existe invitación para clases grupales regulares — no se convoca manualmente.
- MEMBER puede auto-reservar cualquier clase GROUP publicada compatible con su membresía.
- El acceso **no depende del coach** asignado a la clase.
- La reserva queda `CONFIRMED` automáticamente si cumple reglas (membresía, cupo, ventana).
- Consumo recomendado: al confirmar reserva para planes limitados; ilimitado = solo registro de asistencia.
- Asistencia: COACH o ADMIN marca `ATTENDED`/`NO_SHOW` desde el roster.

### 6.2 PERSONAL_TRAINING

- COACH o ADMIN crea sesión PT para un member específico.
- Estado inicial: `PENDING_CONFIRMATION` cuando el horario requiere aceptación del member.
- Slot retenido hasta aceptar, rechazar o expirar.
- Aceptación → `CONFIRMED`. Rechazo → `REJECTED` (libera slot). Timeout → `EXPIRED` (libera slot).
- Member no mueve directo el horario; puede solicitar reagendamiento o cancelar según ventana.
- Si estaba confirmada y el coach cambia horario → vuelve a `PENDING_CONFIRMATION`.
- Consumo: al marcar `ATTENDED`, no al crear ni proponer.
- Asistencia: COACH o ADMIN marca `ATTENDED`/`NO_SHOW`.

### 6.3 KINESIOLOGY

- KINESIOLOGIST o ADMIN crea evaluación inicial y sesiones de seguimiento.
- **No** se permite auto-reserva libre de kine en MVP.
- Plan de sesiones soporta 10/15/20/u otra cantidad configurada (`Membership.totalSessions`).
- Estado inicial: `PENDING_CONFIRMATION` si requiere confirmación del paciente, o `CONFIRMED` si se agenda con acuerdo previo.
- Para MVP: agendar sesión a sesión (no series automáticas).
- Consumo: al marcar `ATTENDED`. `NO_SHOW` → kine/admin decide manualmente si consume.
- Reagendamiento: paciente solo solicita, no mueve la agenda directamente.
- Ficha clínica: visible/editable solo por KINESIOLOGIST y ADMIN.
- COACH ve solo restricciones operativas autorizadas, nunca diagnóstico/evolución completa.
- ADMIN puede corregir asistencia, sesiones consumidas y estado, con trazabilidad.

---

## 7. Comportamiento por rol

| Rol | Puede ver | Puede hacer | No debe hacer |
|---|---|---|---|
| **ADMIN** | Calendario completo, reservas, membresías, sesiones, asistencia, no-show, fichas kine si tiene permiso. | Crear, editar, cancelar, reagendar, corregir estados, override, administrar membresías. | Modificar sin trazabilidad en producción. |
| **COACH** | Sus clases GROUP, sus PT, roster de alumnos, restricciones operativas autorizadas. | Crear clases GROUP, proponer PT, marcar asistencia/no-show, modificar sesiones propias. | Ver/editar ficha clínica completa; modificar kine ajena; cambiar pagos sensibles sin permiso; ver clases KINE ajenas; modificar clases de otros coaches/kines; auto-reservarse. |
| **KINESIOLOGIST** | Agenda kine, ficha clínica, planes de sesiones, evolución, restricciones clínicas. | Crear sesiones kine, editar ficha clínica, marcar asistencia/no-show, definir restricciones operativas. | Modificar clases/PT ajenos; exponer diagnóstico completo al coach; auto-reservarse. |
| **MEMBER** | Clases GROUP disponibles según membresía; sus reservas; sus invitaciones/propuestas pendientes (PT/KINE); sesiones restantes; historial básico. | Reservar GROUP, aceptar/rechazar PT/kine, cancelar dentro de ventana, solicitar reagendamiento. | Mover horarios PT/kine directamente; editar asistencia; editar sesiones restantes; marcar su propia asistencia. |

---

## 8. Ciclos de interacción end-to-end (referencia)

### 8.1 Publicación + auto-reserva GROUP
1. ADMIN/COACH crea clase GROUP (fecha, hora, duración, cupo, ubicación, coach).
2. Clase queda `AVAILABLE` para members con membresía GROUP activa.
3. Sistema muestra cupos y bloquea reserva sin cupo/membresía/sesiones.
4. No se genera invitación individual; aparece directo en el calendario del member.
5. MEMBER entra a calendario/`/classes`, ve clases elegibles según membresía + `serviceType=GROUP`.
6. Selecciona clase publicada → sistema valida cupo, ventana, membresía, sesiones.
7. Si cumple → `Booking` en `CONFIRMED`. Si plan limitado → descuenta según política (recomendado al confirmar).
8. COACH ve al member en el roster.

### 8.2 PT — coach propone, member confirma
1. COACH selecciona alumno, crea sesión PT en fecha/hora.
2. Sistema crea `Booking`/`BookingInvitation` en `PENDING_CONFIRMATION`, retiene el slot.
3. MEMBER ve invitación pendiente: aceptar/rechazar.
4. Acepta → `CONFIRMED`. Rechaza → `REJECTED` (libera slot). No responde antes de timeout → `EXPIRED` (libera slot).
5. Tras la sesión, COACH marca `ATTENDED`/`NO_SHOW`.
6. Si `ATTENDED` → descuenta 1 sesión PT.

### 8.3 Kinesiología — agenda dirigida y seguimiento
1. ADMIN/KINESIOLOGIST crea evaluación inicial o sesión de seguimiento (asociada a plan kine si existe).
2. Paciente recibe propuesta o confirmación según cómo se agendó.
3. Paciente acepta/rechaza o solicita cambio; no mueve la agenda directamente.
4. Kine atiende, registra evolución clínica.
5. Kine marca `ATTENDED`/`NO_SHOW`.
6. `ATTENDED` → descuenta 1 sesión del plan kine. `NO_SHOW` → kine/admin decide consumo.

### 8.4 Asistencia y cierre

| Servicio | Quién marca asistencia | Cuándo consume sesión | Observación |
|---|---|---|---|
| GROUP | COACH o ADMIN | Al reservar/confirmar (recomendado para plan limitado) | Si staff cancela la clase, devolver sesión si fue descontada. |
| PERSONAL_TRAINING | COACH o ADMIN | Al marcar `ATTENDED` | `NO_SHOW` registrado; consumo manual/política posterior. |
| KINESIOLOGY | KINESIOLOGIST o ADMIN | Al marcar `ATTENDED` | `NO_SHOW` debe permitir decidir consumir/no consumir. |

---

## 9. Modificaciones por tipo de servicio

### 9.1 Clases grupales

| Caso | Quién puede | Comportamiento esperado |
|---|---|---|
| Editar nombre/descripción | ADMIN o COACH dueño | Se actualiza sin reconfirmar reservas. Notificación opcional. |
| Cambiar horario sin reservas | ADMIN o COACH dueño | Se cambia libremente. |
| Cambiar horario con reservas | ADMIN o COACH dueño | Reservas siguen `CONFIRMED`; se notifica y permite cancelación sin penalización. |
| Bajar cupo | ADMIN o COACH dueño | Bloquear si nuevo cupo < inscritos actuales. |
| Subir cupo | ADMIN o COACH dueño | Permitido; habilita más reservas. |
| Cancelar clase completa | ADMIN o COACH dueño | Reservas pasan a `CANCELLED_BY_STAFF`; devolver sesión si aplicaba. |
| Member cancela | MEMBER | `CANCELLED_EARLY` dentro de plazo; `CANCELLED_LATE` fuera de plazo. |
| Corregir asistencia | ADMIN o COACH dueño | Permitir corrección antes de cierre operativo; luego solo admin override. |

### 9.2 Entrenamiento personalizado

| Caso | Quién puede | Comportamiento esperado |
|---|---|---|
| Cambiar sesión pendiente | COACH dueño o ADMIN | Sigue `PENDING_CONFIRMATION`; notificar cambio al member. |
| Cambiar sesión confirmada | COACH dueño o ADMIN | Vuelve a `PENDING_CONFIRMATION`; member debe aceptar nuevo horario. |
| Member quiere reagendar | MEMBER | No mueve directo. Genera solicitud o cancela según ventana. |
| Member cancela temprano | MEMBER | `CANCELLED_EARLY`; no consume sesión. |
| Member cancela tarde | MEMBER | `CANCELLED_LATE`; política decide consumo. |
| Coach cancela | COACH o ADMIN | `CANCELLED_BY_STAFF`; no consume sesión. |
| Marcar `ATTENDED` | COACH o ADMIN | Consume 1 sesión PT. |
| Marcar `NO_SHOW` | COACH o ADMIN | Registra ausencia; MVP = decisión manual de consumo. |

### 9.3 Kinesiología

| Caso | Quién puede | Comportamiento esperado |
|---|---|---|
| Cambiar sesión pendiente | KINE asignado o ADMIN | Sigue `PENDING_CONFIRMATION`; notificar paciente. |
| Cambiar sesión confirmada | KINE asignado o ADMIN | Vuelve a `PENDING_CONFIRMATION` si requiere nueva aceptación. |
| Paciente pide reagendar | MEMBER | No mueve directo. Solicitud queda para kine/admin. |
| Paciente cancela temprano | MEMBER (según política) | `CANCELLED_EARLY`; no consume sesión. |
| Paciente cancela tarde | MEMBER (según política) | `CANCELLED_LATE`; kine/admin decide consumo. |
| Kine cancela | KINE o ADMIN | `CANCELLED_BY_STAFF`; no consume sesión. |
| Marcar `ATTENDED` | KINE o ADMIN | Consume 1 sesión kine; permite registrar evolución. |
| Marcar `NO_SHOW` | KINE o ADMIN | Sistema pregunta: ¿consumir sesión o solo registrar? |
| Editar ficha clínica | KINE o ADMIN | Permitido; nunca visible para coach completo. |
| Editar restricción operativa | KINE o ADMIN | Puede quedar visible para coach como resumen seguro. |

---

## 10. Reglas de membresía, consumo de sesiones y bloqueos

### 10.1 Gating por membresía

| Regla | Aplicación |
|---|---|
| Membresía activa | El member solo reserva/confirma si tiene membresía activa y compatible. |
| `serviceType` compatible | GROUP → clases grupales; PERSONAL_TRAINING → PT; KINESIOLOGY → kine. |
| Plan limitado | Debe existir saldo de sesiones > 0 para reservar/confirmar, según política del servicio. |
| Plan ilimitado | No descuenta sesión, pero registra asistencia para adherencia. |
| Pago pendiente/impago | Debe bloquear nuevas reservas si la política del gimnasio lo define. |
| Restricción clínica | Puede bloquear auto-reserva en ciertos servicios o exigir revisión de staff. |

### 10.2 Consumo de sesiones

| Servicio | Cuándo consumir | Cuándo devolver | Notas |
|---|---|---|---|
| GROUP limitado | Recomendado al confirmar reserva. | Si member cancela temprano o staff cancela clase. | Más simple para controlar cupo y compromiso. |
| GROUP ilimitado | No consume. | No aplica. | Solo asistencia/no-show para métricas. |
| PT | Al marcar `ATTENDED`. | Si se corrigió asistencia por error. | `NO_SHOW` queda manual en MVP. |
| KINE | Al marcar `ATTENDED`. | Si se corrigió asistencia por error. | `NO_SHOW` debe permitir consumir o no consumir. |

### 10.3 Bloqueos recomendados

| Situación | Bloqueo recomendado | Excepción |
|---|---|---|
| Membresía vencida | No puede reservar ni confirmar. | ADMIN puede override. |
| Sin sesiones disponibles | No puede reservar/confirmar servicio limitado. | ADMIN puede ajustar membresía. |
| Clase sin cupo | No puede confirmar reserva. | Lista de espera en versión posterior. |
| Dentro de ventana late-cancel | Member no cancela libremente o queda late cancel. | Staff puede gestionar. |
| PT/kine confirmado | Member no cambia horario directamente. | Puede solicitar reagendamiento. |
| Restricción clínica activa | Bloquear auto-reserva de servicios riesgosos. | KINE/ADMIN puede autorizar. |
| Asistencia ya cerrada | Member no puede cancelar/reagendar. | ADMIN corrige si hubo error. |

---

## 11. Privacidad clínica y visibilidad para coaches

**Regla no negociable**: COACH no ve ficha clínica completa. Solo restricciones operativas autorizadas.

| Información | ADMIN | KINESIOLOGIST | COACH | MEMBER |
|---|---|---|---|---|
| Ficha clínica completa | Sí (si tiene permiso) | Sí | No | No / vista resumida si se decide |
| Diagnóstico | Sí | Sí | No | Según política clínica |
| Evolución clínica | Sí | Sí | No | Según política clínica |
| Restricción operativa | Sí | Sí | Sí, resumida | Sí, en lenguaje simple |
| Sesiones kine restantes | Sí | Sí | No necesario / resumen | Sí |
| Asistencia/no-show kine | Sí | Sí | No | Historial propio básico |

Ejemplo de restricción operativa visible para coach: *"Restricción activa: evitar
sentadilla pesada y salto pliométrico hasta nueva evaluación. Priorizar movilidad y
trabajo controlado."*

Ejemplo de información que **nunca** debe ver el coach: anamnesis completa,
diagnóstico clínico detallado, evolución, antecedentes médicos, documentos clínicos,
observaciones privadas del kinesiólogo (`HealthRecord.internalNotes`,
`HealthSession.privateNotes`).

---

## 12. Checklist de brechas contra la app actual

> Estado relevado sobre `master` (post PR #38, branch `fix/roles-permissions-pre-demo`
> aún sin mergear, pero sus cambios ya cubren parte de "Permisos y staff self-booking").

| # | Área | Estado actual | Consenso esperado | Brecha | Prioridad | PR sugerido |
|---|---|---|---|---|---|---|
| 1 | Staff no puede auto-reservarse | `POST /api/reservations` ya bloquea COACH/KINESIOLOGIST (PR #38, sin mergear). | Igual. | Ninguna una vez mergeado #38. | — | PR #38 |
| 2 | KINE se comporta como COACH para gestión de sus sesiones | PR #38 extiende ownership checks (`GET/PUT/DELETE /api/classes/[id]`, invitations, series, trim, `canManage`) a KINESIOLOGIST. | Igual. | Ninguna una vez mergeado #38. | — | PR #38 |
| 3 | COACH/KINE solo gestionan sus propias sesiones | Cubierto por #38 (ownership checks por `coachId === authSession.user.id`). | Igual. | Ninguna una vez mergeado #38. | — | PR #38 |
| 4 | MEMBER con GROUP solo ve GROUP disponibles | `/classes` y `/calendar` muestran **todas** las sesiones (`GET /api/classes`) sin filtrar por `serviceType` compatible con la membresía del member; solo se calcula `validServiceTypes` para habilitar/deshabilitar el botón de reserva. | MEMBER con `GROUP` activo ve clases GROUP publicadas; PT/KINE solo las propuestas/confirmadas para él. | El member ve PT/KINE de otros pacientes en el calendario (sin poder reservarlas, pero sí visibles), y puede intentar auto-reservar PT/KINE. | **Alta** | PR B |
| 5 | MEMBER con PT/KINE solo ve sus sesiones agendadas/propuestas | No existe distinción: `POST /api/reservations` permite a un MEMBER reservar (`CONFIRMED` directo) cualquier sesión `PERSONAL_TRAINING`/`KINESIOLOGY` con cupo, igual que GROUP. | MEMBER solo ve/confirma PT/KINE que un COACH/KINE le propuso. | Falta flujo de propuesta dirigida; el modelo actual trata PT/KINE igual que GROUP (auto-reserva). | **Alta** | PR D |
| 6 | GROUP no debe usar invitación como flujo regular | `BookingInvitation` se usa hoy para "convocatoria masiva" en GROUP/series recurrentes (feature ya construida y en uso, ver `docs/backlog-roadmap.md` "Invitación masiva — 85%"). | GROUP no usa invitación regular; invitación es para PT/KINE. | Conceptual: la convocatoria masiva GROUP existente no calza 100% con el consenso, pero **es funcionalidad ya construida y en uso** — no se debe romper antes de la demo. | Media (solo documentar, no tocar código aún) | PR G (revisión, no remoción) |
| 7 | PT/KINE deben usar `PENDING_CONFIRMATION` | No existe ese flujo para PT/KINE; `BookingStatus`/`InvitationStatus` ya tienen los valores necesarios (`PENDING`, `ACCEPTED`/`CONFIRMED`, `DECLINED`, `EXPIRED`) pero no se usan para PT/KINE. | Coach/kine propone → `PENDING_CONFIRMATION` → member acepta/rechaza/expira. | Falta UI + endpoints para que COACH/KINE "proponga" sesión PT/KINE a un member específico, y que el member la vea como pendiente. | **Alta** | PR D |
| 8 | Asistencia visible y editable por staff | Existe `BookingStatus.ATTENDED`/`ABSENT`, pero no hay UI de "roster" para que COACH/KINE marquen asistencia masivamente por sesión (hoy se gestiona reserva por reserva vía `/api/reservations/[id]`). | Staff ve roster de la sesión y marca `ATTENDED`/`NO_SHOW` por alumno. | Falta UI de roster con marcado rápido; backend (`canManage`) ya soporta el permiso post #38. | Media | PR E |
| 9 | Fechas legibles | Fechas se muestran en formatos mixtos (`toISOString().slice(...)`, `toLocaleTimeString("es-CL", ...)`) sin un helper único. | Formato consistente es-CL en toda la UI. | Inconsistencia menor, **fuera de alcance pre-demo** (excluido explícitamente por el usuario: "no date formatting global"). | Baja | Backlog (no PR cercano) |
| 10 | Coach-safe clinical summary | `HealthRestriction` (label + severity) ya existe y se usa para mostrar chips a COACH en calendario (módulo Health ya implementado, ~50% según backlog). `internalNotes`/`privateNotes` de `HealthRecord`/`HealthSession` no se exponen a COACH (verificado en rutas `/api/health/*`). | COACH ve restricciones operativas, no ficha clínica completa. | Ninguna brecha funcional detectada; mantener como regla de regresión obligatoria en cada PR que toque `/api/health/*` o calendario. | — | PR G (regresión continua) |
| 11 | Reagendamiento básico | `PUT /api/classes/[id]` permite a ADMIN/COACH-dueño/KINE-dueño cambiar horario de una sesión, pero no distingue "reservas confirmadas deben volver a `PENDING_CONFIRMATION`" para PT/KINE — simplemente mantiene los `Booking` existentes sin cambiar su estado. | Cambiar horario de GROUP con reservas → mantener + notificar; cambiar horario de PT/KINE confirmado → volver a `PENDING_CONFIRMATION`. | Falta lógica diferenciada por `serviceType` al editar horario de una sesión con reservas. | Media | PR F |
| 12 | Consumo de sesiones por `serviceType` | `POST /api/reservations` descuenta `usedSessions` al crear el `Booking` (=al "reservar/confirmar") para **todos** los `serviceType` con `totalSessions` no nulo, incluyendo PT/KINE. `DELETE` devuelve sesión si cancela dentro de ventana. | GROUP limitado: consumir al confirmar (✅ ya así). PT/KINE: consumir al marcar `ATTENDED`, no al reservar/proponer. | Para PT/KINE, el consumo ocurre demasiado pronto (al crear la reserva) en vez de al marcar asistencia. Esto está acoplado al gap #5/#7 (no existe aún el flujo `PENDING_CONFIRMATION` para PT/KINE). | **Alta** (depende de #5/#7) | PR D + PR E |

---

## 13. Roadmap de implementación en PRs pequeños

Orden sugerido — cada PR debe tener scope acotado, QA manual claro, y **no romper lo
ya estable antes de la demo**. No se toca DB/schema/migrations salvo que el PR lo
indique explícitamente y se consulte antes.

| PR | Objetivo | Incluye | No incluye |
|---|---|---|---|
| **PR A** — Permisos y staff self-booking | Continuar/alinear con **PR #38** (ya en curso). | COACH/KINE no se reservan a sí mismos; COACH/KINE solo gestionan lo propio; KINE gestiona sus sesiones igual que COACH; MEMBER bloqueado en `/admin/*`; error de login amigable. | Cambios de schema, nuevos estados de reserva. |
| **PR B** — Visibilidad member por `serviceType` | MEMBER ve calendario/`/classes` filtrado según su membresía y rol en cada sesión. | MEMBER con GROUP ve clases GROUP publicadas; MEMBER con PT/KINE ve solo sus sesiones propuestas/confirmadas (filtrar por `Booking.memberId` o `BookingInvitation.memberId`); KINE no aparece como auto-reserva pública para members sin sesión propuesta. Validar `/calendar` y `/classes`. | Cambios de schema. Nuevos endpoints de propuesta (eso es PR D). |
| **PR C** — Estados unificados de reserva (diagnóstico) | Documentar/normalizar el mapeo entre estados conceptuales (`AVAILABLE`, `PENDING_CONFIRMATION`, `CONFIRMED`, `REJECTED`, `EXPIRED`, `ATTENDED`, `NO_SHOW`, `CANCELLED_EARLY`, `CANCELLED_LATE`) y los enums actuales (`BookingStatus`, `InvitationStatus`). Proponer si se necesita migración mínima (ej. distinguir `CANCELLED_EARLY`/`CANCELLED_LATE`, o si basta con un campo `cancelledLate: Boolean` o `cancelledAt`). | Análisis + propuesta de migración mínima (sin ejecutarla). | Migración real, cambios grandes de UI. |
| **PR D** — PT/KINE como propuesta-confirmación | Flujo: coach/kine agenda → member acepta/rechaza, usando `BookingInvitation` (`PENDING` → `ACCEPTED`/`DECLINED`/`EXPIRED`) extendido a PT/KINE. | Endpoint para que COACH/KINE proponga sesión PT/KINE a un member específico; UI para que el member acepte/rechace; slot retenido mientras está `PENDING`; si coach/kine cambia horario de una confirmada, vuelve a `PENDING_CONFIRMATION`. | Series/recurrencia avanzada para PT/KINE (eso queda para una iteración posterior). |
| **PR E** — Asistencia básica | Roster por sesión + marcado de asistencia. | Staff (COACH/KINE/ADMIN dueño) marca `ATTENDED`/`NO_SHOW` desde un roster por sesión; consumo de sesión PT/KINE se mueve a "al marcar `ATTENDED`" (depende de PR D); GROUP mantiene su consumo actual al confirmar. | Penalizaciones automáticas por no-show. |
| **PR F** — Reagendamiento básico | Staff cambia horario de una sesión con reservas. | Si la sesión es PT/KINE y tiene `Booking`/`BookingInvitation` `CONFIRMED`/`ACCEPTED`, vuelve a `PENDING_CONFIRMATION` al cambiar horario; GROUP mantiene reservas y notifica; member solo puede "solicitar cambio" (sin mover directo). | Notificaciones reales (push/email/WhatsApp). |
| **PR G** — Privacidad clínica coach-safe (regresión + revisión convocatoria GROUP) | Auditoría de regresión + revisión de la convocatoria masiva GROUP existente frente al consenso. | Confirmar que COACH nunca recibe `internalNotes`/`privateNotes`/diagnóstico en ninguna ruta; documentar cómo encaja la convocatoria masiva GROUP actual (`BookingInvitation` en series) con el principio "GROUP no usa invitación regular" — decidir si se mantiene como excepción documentada o se deprecia a futuro. | Cambios de código en el módulo Health (excluido explícitamente). |

---

## 14. Cosas explícitamente fuera de alcance por ahora

- Google Calendar sync (real, bidireccional).
- Reemplazo/herencia avanzada de coach.
- Lista de espera avanzada (promoción automática de `WAITLISTED`).
- Cobro automático por no-show.
- App nativa.
- Multi-tenant avanzado / multi-gimnasio.
- Dashboard nuevo.
- Notificaciones reales (push/email/WhatsApp automatizado).
- Date formatting global (helper único de fechas en toda la UI).
- Cambios grandes al módulo Health/Kinesiología más allá de lo descrito en PR D/G.

---

## 15. Prompt corto para futuros PRs

> Antes de implementar cualquier cambio de agenda, validar contra
> `docs/scheduling-consensus-roadmap.md`. Si la implementación propuesta contradice
> alguno de estos principios:
> - GROUP = auto-reserva, sin invitación regular, acceso por membresía (no por coach).
> - PERSONAL_TRAINING = coach propone (`PENDING_CONFIRMATION`) → member acepta/rechaza.
> - KINESIOLOGY = kine/admin agenda dirigida, paciente confirma, sin auto-reserva libre.
> - Asistencia la marca staff/admin, nunca el member.
> - Ficha clínica completa (`internalNotes`/`privateNotes`/diagnóstico) nunca visible
>   para COACH; COACH solo ve restricciones operativas resumidas.
>
> **deténgase y pida confirmación al usuario antes de continuar.**
