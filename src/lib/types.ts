export type ServiceType = "group" | "personal_training" | "kinesiology" | "blocked_time";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5; // 0=Lun … 5=Sáb
export type ClassStatus = "active" | "cancelled";
export type ReservationStatus = "reserved" | "attended" | "absent" | "cancelled";
export type MembershipStatus = "active" | "expired" | "cancelled" | "pending";
export type PaymentStatus = "paid" | "pending" | "overdue";
export type MembershipPlan = "mensual" | "trimestral" | "semestral" | "anual";

export interface GymClass {
  id: string;
  name: string;
  serviceType: ServiceType;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;
  coach: string;
  maxCapacity: number;
  reservedCount: number;
  status: ClassStatus;
  note?: string;
}

export interface Reservation {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classDate: string; // YYYY-MM-DD
  status: ReservationStatus;
}

export interface Membership {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  plan: MembershipPlan;
  paymentStatus: PaymentStatus;
  membershipStatus: MembershipStatus;
  amount: number;
  startDate: string;
  endDate: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "coach" | "student";
}
