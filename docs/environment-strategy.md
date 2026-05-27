# Environment Strategy — Gym App MVP

## 1. Propósito

La app opera en tres ambientes separados para reducir riesgos operativos:

- **LOCAL** — desarrollo activo en máquina del desarrollador
- **UAT / DEMO / Friends & Family** — validación con usuarios reales controlados antes de producción
- **PROD** — operación oficial del gimnasio con datos reales

Esta separación evita:
- mezclar datos de prueba con datos reales
- correr seed en una DB equivocada
- probar features nuevas directo en producción
- romper login/OAuth por variables mal configuradas
- perder datos reales por un reset accidental

---

## 2. Ambientes

### LOCAL

**Uso:**
- desarrollo en máquina local con Claude Code
- pruebas libres, debugging
- cambios de schema y seed
- datos desechables o controlados

**Infra:**
- Next.js local (`npm run dev`)
- `.env.local` (nunca commiteado)
- Supabase local/dev o DB de desarrollo dedicada
- `AUTH_URL=http://localhost:3000`

**Reglas:**
- Se puede correr seed.
- Se puede romper y reconstruir.
- No usar datos sensibles reales.
- No compartir `.env.local`.
- No usar esta DB como producción.

---

### UAT / DEMO / Friends & Family

**Uso:**
- validar la app desplegada antes de producción
- probar con usuarios reales controlados (friends & family)
- mostrar el estado actual al gimnasio
- validar nuevas features antes de pasarlas a PROD

**Infra:**
- Vercel UAT (proyecto Vercel separado o entorno de preview)
- Supabase UAT — DB separada de LOCAL y de PROD
- Variables de entorno propias del ambiente UAT
- `AUTH_URL` del dominio Vercel UAT
- Google OAuth con redirect URI de UAT configurado en Google Cloud Console

**Reglas:**
- Seed permitido solo manualmente y con confirmación explícita.
- No correr seed desde Vercel (nunca como Build Command).
- Datos reseteables, pero con aviso a todos los involucrados.
- No usar como producción real.
- Si se cambia una variable `NEXT_PUBLIC_*`, se requiere redeploy.

---

### PROD

**Uso:**
- clientes, coaches y miembros reales
- reservas, membresías y operación oficial del gimnasio

**Infra:**
- Vercel PROD
- Supabase PROD — DB independiente con backups
- Dominio real (no `.vercel.app`)
- Variables propias de PROD
- `AUTH_URL` del dominio productivo real
- Google OAuth con redirect URI de PROD
- Monitoreo manual o automático

**Reglas:**
- Nunca correr seed.
- Nunca probar features nuevas directamente.
- No usar datos demo.
- Cambios solo después de QA completo en UAT.
- Requiere backup y plan básico de rollback.
- Requiere responsable de monitoreo definido.

---

## 3. Flujo actual del MVP

```
LOCAL → master → Vercel UAT
```

Estado actual (checkpoint `demo-v0.1`):

- `master` representa el código estable aprobado para demo.
- Vercel UAT usará `master` para la prueba friends & family.
- No existe producción real todavía.
- La DB UAT será una instancia Supabase separada de la DB LOCAL.

---

## 4. Flujo futuro recomendado

### Con equipo o mayor volumen de cambios:

```
feature branch → PR → develop/staging → UAT → master → PROD
```

### Alternativa simple (sin equipo, un solo desarrollador):

```
feature branch → PR → master → Vercel UAT → promoción manual a PROD
```

En ambos casos:
- Las features se desarrollan en ramas separadas.
- Se validan localmente antes del PR.
- Se prueban en UAT después del merge.
- Solo después de QA en UAT pasan a PROD.

---

## 5. Variables por ambiente

Cada ambiente debe tener sus propias variables — nunca compartir entre ambientes.

### Obligatorias

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión runtime vía pooler (puerto 6543 en Supabase) |
| `DIRECT_URL` | Conexión directa para Prisma CLI (puerto 5432 en Supabase) |
| `AUTH_SECRET` | Secreto JWT — distinto por ambiente |
| `AUTH_GOOGLE_ID` | Client ID de Google OAuth |
| `AUTH_GOOGLE_SECRET` | Client Secret de Google OAuth |
| `AUTH_URL` | URL pública del ambiente — debe coincidir con el dominio real |

### Opcionales

| Variable | Efecto si no está definida |
|----------|---------------------------|
| `NEXT_PUBLIC_GYM_WHATSAPP_NUMBER` | CTA "Contactar para renovar" no aparece |
| `NEXT_PUBLIC_GYM_CONTACT_EMAIL` | Fallback del CTA tampoco aparece |

### Reglas críticas

- `AUTH_URL` debe ser exactamente el dominio del ambiente. En LOCAL: `http://localhost:3000`. En UAT: URL Vercel UAT. En PROD: dominio productivo.
- `AUTH_SECRET` debe generarse independientemente para cada ambiente (`openssl rand -base64 32`).
- `DATABASE_URL` y `DIRECT_URL` deben apuntar a la DB correcta del ambiente.
- Las variables `NEXT_PUBLIC_*` se incrustan en el build — un cambio requiere redeploy.
- No commitear `.env.local`. No subir secretos al repositorio.

---

## 6. Base de datos por ambiente

### LOCAL DB

- Propósito: desarrollo activo.
- Puede tener datos de prueba o seed.
- Puede resetearse libremente.
- Seed permitido.

### UAT DB

- Propósito: demo y friends & family.
- Contiene usuarios de prueba reales (Google accounts verificadas).
- Seed manual permitido, nunca automático desde Vercel.
- Puede resetearse solo si todos los participantes están avisados.

### PROD DB

- Propósito: datos reales de operación del gimnasio.
- No reseteable.
- Seed prohibido.
- Requiere backup antes de cualquier operación de mantenimiento.
- Cambios de schema solo después de validación en UAT.

---

## 7. Seed policy

**Qué es el seed:** carga inicial de datos demo/prueba — usuarios, coaches, miembros, clases, membresías, reservas e invitaciones con estados reproducibles.

El seed es idempotente (re-ejecutarlo restaura estados demo), pero borra y recrea sesiones. Esto lo hace destructivo en datos reales.

| Ambiente | Seed permitido | Condición |
|----------|---------------|-----------|
| LOCAL | Sí | Libre |
| UAT | Sí | Solo manual, con confirmación explícita |
| PROD | No | Prohibido siempre |

**Reglas adicionales:**
- Nunca configurar seed como Build Command en Vercel.
- Nunca correr seed sin revisar a qué `DATABASE_URL` apunta.
- Antes de correr seed, confirmar ambiente y DB.

### Checklist antes de correr seed

- [ ] Confirmé que NO es PROD.
- [ ] Confirmé que `DATABASE_URL` apunta a LOCAL o UAT.
- [ ] Confirmé que puedo resetear esos datos.
- [ ] Confirmé que el equipo sabe que los datos pueden cambiar.

---

## 8. Google OAuth por ambiente

Cada ambiente necesita su redirect URI registrado en [Google Cloud Console](https://console.cloud.google.com/).

| Ambiente | Redirect URI |
|----------|-------------|
| LOCAL | `http://localhost:3000/api/auth/callback/google` |
| UAT | `https://{uat-domain}.vercel.app/api/auth/callback/google` |
| PROD | `https://{prod-domain}/api/auth/callback/google` |

**Errores comunes:**
- Si falta el redirect URI → login falla con `redirect_uri_mismatch`.
- Si `AUTH_URL` apunta a `localhost` en Vercel → login falla silenciosamente.
- Si se agrega un dominio nuevo → hay que actualizar Google Cloud Console antes del primer login.

---

## 9. Checklist antes de pasar algo a PROD

Antes de promover una nueva funcionalidad a producción:

**Código y build:**
- [ ] Build limpio (`npm run build` sin errores)
- [ ] TypeScript sin errores
- [ ] QA local realizado

**Validación en UAT:**
- [ ] QA en UAT realizado
- [ ] Login con Google validado
- [ ] Reservas validadas
- [ ] Invitaciones validadas
- [ ] Membresías y alertas validadas
- [ ] Permisos por rol validados (ADMIN / COACH / MEMBER)
- [ ] Sin exposición de datos privados (emails, IDs sensibles)

**Infraestructura PROD:**
- [ ] Variables PROD configuradas en Vercel
- [ ] DB PROD lista y sincronizada con schema actual
- [ ] Google OAuth PROD configurado con redirect URI correcto
- [ ] Seed NO programado ni en Build Command
- [ ] Plan básico de rollback definido
- [ ] Responsable de monitoreo definido

---

## 10. Qué NO hacer

- No probar features nuevas directo en PROD.
- No correr seed en PROD.
- No mezclar la DB de UAT con la DB de PROD.
- No usar la misma DB para LOCAL y producción.
- No commitear `.env.local`.
- No subir secretos al repositorio.
- No usar `AUTH_URL=http://localhost:3000` en Vercel.
- No agregar seed como Build Command.
- No usar datos sensibles reales en UAT si no es necesario.

---

## 11. Próximo paso técnico

Una vez aprobada esta documentación, el siguiente bloque será:

**Bloque 19 — Supabase UAT setup**

Requerirá:
1. Crear nuevo proyecto Supabase para UAT
2. Obtener `DATABASE_URL` (pooler, puerto 6543)
3. Obtener `DIRECT_URL` (directo, puerto 5432)
4. Crear `.env.demo.local` o equivalente local no commiteado
5. Ejecutar `prisma db push` apuntando a DB UAT
6. Ejecutar seed una sola vez contra DB UAT
7. Conectar Vercel UAT a esa DB

Nada de esto se ejecuta en este bloque.

---

## 12. Referencia rápida

| | LOCAL | UAT | PROD |
|---|---|---|---|
| **Next.js** | `npm run dev` | Vercel | Vercel |
| **DB** | Supabase local/dev | Supabase UAT | Supabase PROD |
| **AUTH_URL** | `http://localhost:3000` | URL Vercel UAT | Dominio real |
| **Seed** | Libre | Manual + confirmación | Prohibido |
| **Reset datos** | Libre | Con aviso | Prohibido |
| **Schema sync** | `prisma db push` libre | Antes de deploy | Con backup |
| **Variables** | `.env.local` | Vercel env (UAT) | Vercel env (PROD) |
