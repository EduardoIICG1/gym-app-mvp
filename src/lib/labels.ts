// Centralized user-facing label maps — neutral Latin American Spanish
// Import these instead of defining local label objects in each component

export const SERVICE_LABELS: Record<string, string> = {
  group:             "Grupal",
  personal_training: "Entrenamiento personal",
  kinesiology:       "Kinesiología",
  blocked_time:      "Bloqueo de horario",
};

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active:    "Activa",
  expired:   "Vencida",
  cancelled: "Cancelada",
  pending:   "Pendiente",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid:    "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
};

export const ROLE_LABELS: Record<string, string> = {
  admin:   "Administrador",
  coach:   "Coach",
  member:  "Miembro",
  owner:   "Propietario",
  student: "Miembro",
};

export const BOOKING_MODE_LABELS: Record<string, string> = {
  regular:     "Normal",
  makeup_only: "Solo recuperación",
};

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  attended:            "Asistió",
  absent:              "Ausente",
  pending_attendance:  "Pendiente",
  reserved:            "Reservado",
};

export const DAY_NAMES        = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DAY_NAMES_SHORT  = ["Lun",   "Mar",    "Mié",       "Jue",    "Vie",     "Sáb"];
export const MONTH_NAMES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
