# Estado actual - Primary Performance

Fase actual: Fase 6 (persistencia + auth)

Pendiente:
- Completar .env.local con:
  - DATABASE_URL
  - DIRECT_URL
  - AUTH_SECRET
  - AUTH_GOOGLE_ID
  - AUTH_GOOGLE_SECRET

Siguiente paso:
- prisma db push
- validar schema en Prisma Studio

Decisiones clave ya tomadas:
- Booking usa sessionId obligatorio
- Modelo: Program → Session → Booking
- MemberCoach reemplaza assignedCoachId

Modo ejecución:
- Subagent-driven con checkpoints

Reglas:
- No agregar features fuera de Fase 6
- No tocar UI innecesariamente
- No sobrediseñar
