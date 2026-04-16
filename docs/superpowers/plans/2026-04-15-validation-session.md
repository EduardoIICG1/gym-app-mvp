# Sesión de Validación — Primary Performance

> **Este plan no requiere código.** Es un plan operativo para conducir la sesión de validación con usuarios reales. Usá los checkboxes para seguir el progreso en tiempo real.

**Goal:** Validar el MVP con usuarios reales de Primary Performance (admin, coach, member) para decidir si avanzar a DB/auth o iterar UX primero.

**Formato:** Demo guiada (30 min) + Exploración libre (40 min) + Debrief (10 min) = ~90 min total.

**App:** http://localhost:3000 — rama `master`, datos mock realistas, dark mode por defecto.

---

## TAREA 1 — Checklist Pre-Sesión (10 minutos antes)

Hacé esto solo vos, antes de que lleguen los participantes.

### 1.1 — Levantar el servidor

- [ ] Abrir terminal en `c:/Users/Lalo/Documents/Gym App/gym-mvp`
- [ ] Ejecutar: `npm run dev`
- [ ] Confirmar que http://localhost:3000 carga sin errores en el browser

### 1.2 — Verificar flujo Admin

- [ ] Abrir http://localhost:3000 → confirmar que el Dashboard carga con posts del feed
- [ ] Abrir http://localhost:3000/admin/members → confirmar que aparece lista de miembros (Ana Rodríguez, Carlos Herrera, María López, Roberto Sánchez, Sofía Morales)
- [ ] Hacer click en "Editar" de cualquier miembro → confirmar que el modal abre y los campos nombre/email son editables
- [ ] Abrir http://localhost:3000/admin/memberships → confirmar que aparecen membresías con montos ($1.200, $3.200, etc.)
- [ ] Abrir http://localhost:3000/calendar → confirmar que aparecen clases en el calendario semanal
- [ ] Abrir http://localhost:3000/profile → confirmar que carga el perfil de Eduardo García con membresías y reservas

### 1.3 — Verificar flujo Coach (Shift+D → Coach)

- [ ] Presionar `Shift+D` para abrir DevPanel → seleccionar "Coach"
- [ ] Confirmar que el sidebar ya no muestra "Membresías" pero sí muestra "Clases" y "Miembros"
- [ ] Abrir http://localhost:3000/calendar → confirmar que el calendario carga normalmente
- [ ] Abrir http://localhost:3000/admin/members → click en "Editar" → confirmar que nombre/email aparecen como solo lectura (no editables)
- [ ] Abrir http://localhost:3000/profile → confirmar que carga perfil del usuario activo

### 1.4 — Verificar flujo Member (Shift+D → Member)

- [ ] Presionar `Shift+D` → seleccionar "Member"
- [ ] Confirmar que el sidebar muestra solo: Inicio, Calendario, Mi Perfil
- [ ] Abrir http://localhost:3000/profile → confirmar que aparece membresía activa con fecha de vencimiento y próximas reservas
- [ ] Abrir http://localhost:3000/calendar → confirmar que el calendario carga

### 1.5 — Verificar tema y DevPanel

- [ ] Presionar `Shift+D` → volver a "Admin" para la demo
- [ ] Hacer click en ☀ (Navbar, arriba a la derecha) → confirmar que cambia a light mode
- [ ] Hacer click en 🌙 → confirmar que vuelve a dark mode
- [ ] Dejar en **dark mode** para empezar la sesión
- [ ] Confirmar que no hay errores rojos en DevTools → Console

### 1.6 — Preparar entorno de moderación

- [ ] Tener este archivo abierto en otra pantalla/tab como referencia
- [ ] Tener la plantilla de notas (Tarea 3) lista para llenar — papel o doc digital
- [ ] Cerrar el DevPanel (Shift+D o click afuera)
- [ ] Dejar visible: http://localhost:3000 — rol Admin, dark mode

**✓ Si todos los puntos pasaron: el sistema está listo para la sesión.**

---

## TAREA 2 — Guion de Moderación

### 2.1 — Setup inicial (5 min)

**Decir textualmente al inicio:**

> "Gracias por tu tiempo. Vamos a mostrarte un prototipo — no es la versión final, es una primera versión que queremos mejorar con tu feedback.
>
> Algunas reglas importantes:
> - No hay respuestas correctas ni incorrectas. Si algo no tiene sentido, eso es exactamente lo que necesitamos saber.
> - Cuando estés explorando solo, no te voy a ayudar aunque te trabe — eso es intencional, queremos ver qué pasa de forma natural.
> - Podés pensar en voz alta mientras navegás, si querés.
> - Cualquier comentario que hagas, positivo o negativo, es bienvenido."

**Antes de arrancar:**
- [ ] Confirmar el rol de la persona (admin / coach / member)
- [ ] Cambiar rol en DevPanel (`Shift+D`) si es necesario — hacerlo disimuladamente
- [ ] Cerrar DevPanel antes de que el participante mire la pantalla

---

### 2.2 — Demo Guiada (30 min)

**Objetivo:** Que el participante entienda qué existe y para qué sirve. Vos controlás el mouse.

#### Demo — Rol Admin

**Paso 1: Dashboard (3 min)**
- Abrís http://localhost:3000
- "Esto es el panel principal. Acá se ve el feed de la comunidad, las próximas clases de la semana y el resumen operativo."
- Señalás el feed, el panel derecho con clases, y las stats de ocupación.
- "Como admin podés publicar en el feed."

**Paso 2: Lista de Miembros (5 min)**
- Navegás a http://localhost:3000/admin/members
- "Acá están todos los miembros del gimnasio. Podés ver su estado, el coach asignado y los servicios contratados."
- Mostrás la búsqueda/filtro si existe.
- Hacés click en "Editar" de un miembro → mostrás el modal.
- "Como admin podés editar el nombre, email, rol y estado. También asignar un coach."
- Cerrás el modal sin guardar.

**Paso 3: Membresías (4 min)**
- Navegás a http://localhost:3000/admin/memberships
- "Acá se gestionan las membresías — podés ver el estado de pago, el plan y el vencimiento de cada miembro."
- Señalás los distintos estados (activa, vencida, pendiente).

**Paso 4: Calendario (4 min)**
- Navegás a http://localhost:3000/calendar
- "El calendario muestra todas las clases de la semana. Podés ver la ocupación de cada una."
- Señalás la vista semanal y los indicadores de capacidad.

**Paso 5: Perfil (4 min)**
- Navegás a http://localhost:3000/profile
- "El perfil muestra el resumen del usuario: sus membresías activas, servicios contratados y próximas reservas."

#### Demo — Rol Coach

- [ ] `Shift+D` → "Coach" → cerrar panel

**Paso 1: Dashboard (3 min)**
- Abrís http://localhost:3000
- "Como coach, el panel muestra tus clases asignadas para la semana."
- Señalás el panel derecho con "Mis clases".

**Paso 2: Calendario (4 min)**
- Navegás a http://localhost:3000/calendar
- "El calendario te muestra todas las clases — podés ver la asistencia y la capacidad."

**Paso 3: Miembros (4 min)**
- Navegás a http://localhost:3000/admin/members
- "Podés ver los perfiles de tus alumnos. Hacés click en editar para ver la info — como coach podés actualizar el rol y estado, pero no el nombre ni email."
- Mostrás el modal → confirmás los campos read-only.

**Paso 4: Perfil (3 min)**
- Navegás a http://localhost:3000/profile
- "Tu perfil muestra tus datos y membresías."

#### Demo — Rol Member

- [ ] `Shift+D` → "Member" → cerrar panel

**Paso 1: Dashboard (3 min)**
- Abrís http://localhost:3000
- "Como miembro, el panel muestra tus próximas reservas."
- Señalás el panel derecho con "Mis próximas reservas".

**Paso 2: Perfil (4 min)**
- Navegás a http://localhost:3000/profile
- "Tu perfil muestra el estado de tu membresía, cuándo vence, y tus próximas clases."
- Señalás la membresía activa y las reservas próximas.

**Paso 3: Calendario (3 min)**
- Navegás a http://localhost:3000/calendar
- "Podés ver el calendario semanal con todas las clases disponibles."

---

### 2.3 — Exploración Libre (40 min)

**Antes de ceder el control:**

> "Ahora es tu turno. Voy a darte una tarjeta con 2 tareas concretas. Intentá completarlas como lo harías normalmente — sin ayuda de mi parte. Si algo no funciona o no entendés algo, decilo en voz alta pero yo no voy a intervenir. ¿Listo?"

**Entregar task card según el rol:**

---

**TASK CARD — ADMIN**
```
1. Encontrá a Carlos Herrera en la lista de miembros
   y verificá en qué estado está su membresía.

2. Buscá qué clases hay el miércoles de esta semana
   y cuántos lugares quedan disponibles en cada una.
```

---

**TASK CARD — COACH**
```
1. Identificá cuántas clases tenés asignadas
   en lo que queda de esta semana.

2. Encontrá el perfil de Ana Rodríguez
   y verificá qué servicio tiene contratado.
```

---

**TASK CARD — MEMBER**
```
1. Verificá cuándo vence tu membresía actual
   y si tenés clases reservadas próximamente.

2. Mirá el calendario y encontrá
   una clase disponible para esta semana.
```

---

**Durante la exploración libre — qué observar:**

- [ ] ¿Va al lugar correcto en el primer intento o duda antes de navegar?
- [ ] ¿Expresa confusión con algún label o sección?
- [ ] ¿Se pierde en alguna pantalla sin saber cómo volver?
- [ ] ¿Lee los datos correctamente (membresía activa/vencida, fechas, ocupación)?
- [ ] ¿Dice algo como "esto me serviría" o "esto falta" de forma espontánea?

**Rol del moderador durante la exploración:**
- Silencio salvo para decir "continuá" si el participante pide pista
- Tomar notas en la plantilla (Tarea 3)
- Registrar frases textuales entre comillas

---

### 2.4 — Debrief (10 min)

Hacer estas preguntas según el rol. Escuchar, no defender.

**Preguntas para Admin:**

1. "¿Pudiste encontrar la información de un miembro sin dificultad?"
2. "¿El flujo de membresías te resultó claro o hay algo que no entendiste?"
3. "¿Qué es lo primero que cambiarías de lo que viste?"

**Preguntas para Coach:**

1. "¿Tu panel te da lo que necesitás para arrancar el día de trabajo?"
2. "¿Los perfiles de alumnos tienen suficiente información para vos?"
3. "¿Qué necesitaría tener para que lo usaras en tu trabajo real hoy?"

**Preguntas para Member:**

1. "¿Podés saber rápido en qué estado está tu membresía con solo mirarlo?"
2. "¿Encontraste tus próximas clases fácilmente?"
3. "¿Lo usarías desde el celular? ¿Por qué sí o por qué no?"

**Al cerrar con cada participante:**

> "Muchas gracias. Tu feedback es muy valioso para que esto mejore. En las próximas semanas vamos a seguir desarrollando la plataforma."

---

## TAREA 3 — Plantilla de Notas

Copiar y completar para cada participante durante la sesión.

---

```
═══════════════════════════════════════════════════════
SESIÓN DE VALIDACIÓN — PRIMARY PERFORMANCE
Fecha: _______________  Hora: _______________
Moderador: _______________
═══════════════════════════════════════════════════════

PARTICIPANTE
─────────────────────────────────────────────────────
Nombre: _______________
Rol en el gym: [ ] Admin  [ ] Coach  [ ] Member
¿Usa apps similares actualmente? [ ] Sí  [ ] No
Cuál: _______________

───────────────────────────────────────────────────────
DEMO GUIADA — Reacciones espontáneas
(anotar frases textuales entre comillas, con el contexto)
───────────────────────────────────────────────────────

Pantalla / sección: _______________
Reacción / comentario:



Pantalla / sección: _______________
Reacción / comentario:



Pantalla / sección: _______________
Reacción / comentario:



───────────────────────────────────────────────────────
EXPLORACIÓN LIBRE — Observaciones
(una fila por acción o momento notable)
───────────────────────────────────────────────────────

Tarea: _______________

 Acción / momento                 | ¿Éxito? | Nota
 ─────────────────────────────────┼─────────┼──────────────
                                  |  S / N  |
                                  |  S / N  |
                                  |  S / N  |
                                  |  S / N  |
                                  |  S / N  |

Tarea: _______________

 Acción / momento                 | ¿Éxito? | Nota
 ─────────────────────────────────┼─────────┼──────────────
                                  |  S / N  |
                                  |  S / N  |
                                  |  S / N  |
                                  |  S / N  |

Fricciones observadas (sin ayuda, se trabó o dudó):
1.
2.
3.

Frases textuales valiosas (citar exacto):
"
"
"

───────────────────────────────────────────────────────
DEBRIEF — Respuestas a preguntas
───────────────────────────────────────────────────────

P1:

P2:

P3:

───────────────────────────────────────────────────────
EVALUACIÓN DEL PARTICIPANTE (post-debrief, tu lectura)
───────────────────────────────────────────────────────

Claridad general (1-5):    ___
Facilidad de uso (1-5):    ___
Valor percibido (1-5):     ___

¿Expresó que lo usaría? [ ] Sí, explícitamente
                        [ ] Sí, implícitamente
                        [ ] No / indiferente
                        [ ] No, rechazo claro

Problema más crítico observado:


═══════════════════════════════════════════════════════
```

---

## TAREA 4 — Decisión Post-Sesión

Completar esto después de hablar con todos los participantes.

```
═══════════════════════════════════════════════════════
RESUMEN EJECUTIVO — SESIÓN DE VALIDACIÓN
Fecha: _______________
Participantes: ___ Admin  ___ Coach  ___ Member
═══════════════════════════════════════════════════════

SEÑALES POSITIVAS (repetidas en ≥ 2 participantes):
1.
2.
3.

FRICCIONES CRÍTICAS (repetidas en ≥ 2 participantes):
1.
2.
3.

FRASES DESTACADAS:
"
"
"

───────────────────────────────────────────────────────
MATRIZ DE DECISIÓN
───────────────────────────────────────────────────────

Roles que dijeron "lo usaría":  ___ / 3

[ ] ≥ 2/3 "lo usaría" sin fricciones críticas
    → DECISIÓN: Avanzar a Fase 9A — Persistencia (Prisma + PostgreSQL)

[ ] ≥ 2/3 "lo usaría" CON fricciones críticas repetidas
    → DECISIÓN: Corregir fricciones identificadas, luego Fase 9A
    Tiempo estimado antes de avanzar: _______________

[ ] < 2/3 "lo usaría" O confusión de navegación generalizada
    → DECISIÓN: Iterar UX — segunda sesión de validación antes de DB/auth
    Foco de iteración: _______________

───────────────────────────────────────────────────────
DECISIÓN FINAL
───────────────────────────────────────────────────────

[ ] Avanzar a DB/auth (Fase 9)
[ ] Iterar UX primero — scope: _______________
[ ] Segunda sesión necesaria — fecha tentativa: _______________

Próxima acción concreta:


Responsable: _______________  Fecha límite: _______________
═══════════════════════════════════════════════════════
```

---

## Notas para el moderador

**Antes de la sesión:**
- El rol se cambia con `Shift+D` — practicalo hasta que sea natural hacerlo sin que el participante lo note
- Si el sistema se cae: `npm run dev` en la terminal, recarga en 5 segundos
- No explicar qué hace cada sección antes de mostrársela — dejar que reaccionen primero

**Durante la exploración libre:**
- "Continuá" es la única respuesta permitida si piden ayuda
- Si se traban más de 2 minutos en la misma tarea: anotar el bloqueo y decir "pasemos a la siguiente tarea"
- Las frases de confusión son el dato más valioso — anotalas textualmente

**Señales de alerta a registrar:**
- "¿Esto dónde está?" (navegación no intuitiva)
- "¿Qué significa esto?" (labels confusos)
- "No entiendo para qué sirve" (propuesta de valor no clara)
- "Esto en mi celular no se ve bien" (mobile concern)
