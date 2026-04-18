import { GymClass } from "./types";

export type ClassBookingStatus =
  | "available"
  | "almost_full"
  | "full"
  | "booking_closed"
  | "makeup_only"
  | "open_for_booking";

function cutoffMs(cls: GymClass): number {
  return cls.bookingCutoffValue * (cls.bookingCutoffUnit === "hours" ? 3_600_000 : 60_000);
}

export function isBookingWindowClosed(cls: GymClass, dateStr: string): boolean {
  if (!cls.hasBookingCutoff) return false;
  const classStart = new Date(`${dateStr}T${cls.startTime}:00`);
  return Date.now() >= classStart.getTime() - cutoffMs(cls);
}

export function getClassBookingStatus(
  cls: GymClass,
  dateStr: string,
  isAdminOrCoach: boolean
): ClassBookingStatus {
  if (cls.bookingMode === "makeup_only") return "makeup_only";

  const isFull = cls.reservedCount >= cls.maxCapacity;
  const windowClosed = cls.hasBookingCutoff && isBookingWindowClosed(cls, dateStr);

  if (isAdminOrCoach) {
    if (isFull) return "full";
    if (windowClosed) return "booking_closed";
    return "open_for_booking";
  }

  if (windowClosed) return "booking_closed";
  if (isFull) return "full";
  if (cls.reservedCount / cls.maxCapacity >= 0.8) return "almost_full";
  return "available";
}

export function canMemberBookClass(
  cls: GymClass,
  dateStr: string,
  canBookMakeup: boolean
): boolean {
  if (cls.status !== "active") return false;
  if (cls.bookingMode === "makeup_only" && !canBookMakeup) return false;
  if (cls.reservedCount >= cls.maxCapacity) return false;
  return !isBookingWindowClosed(cls, dateStr);
}

// True when the class end time has already passed.
export function hasClassOccurred(dateStr: string, endTime: string): boolean {
  return Date.now() > new Date(`${dateStr}T${endTime}:00`).getTime();
}

export function bookingCutoffLabel(cls: GymClass): string {
  if (!cls.hasBookingCutoff) return "Sin cierre de reserva";
  const unit = cls.bookingCutoffUnit === "hours"
    ? cls.bookingCutoffValue === 1 ? "hora" : "horas"
    : cls.bookingCutoffValue === 1 ? "minuto" : "minutos";
  return `${cls.bookingCutoffValue} ${unit} antes del inicio`;
}
