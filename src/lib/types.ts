export type ServiceType = "group" | "personal_training" | "kinesiology" | "blocked_time";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5; // 0=Lun … 5=Sáb
export type ClassStatus = "active" | "cancelled";
export type BookingCutoffUnit = "minutes" | "hours";
export type BookingMode = "regular" | "makeup_only";
export type AttendanceStatus = "pending_attendance" | "attended" | "absent";
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
  hasBookingCutoff: boolean;        // false = no time restriction
  bookingCutoffValue: number;       // used only when hasBookingCutoff = true
  bookingCutoffUnit: BookingCutoffUnit;
  bookingMode: BookingMode;         // "regular" | "makeup_only"
}

export interface Reservation {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classDate: string; // YYYY-MM-DD
  status: ReservationStatus;
  // Attendance layer (explicit; overrides status-derived inference)
  attendanceStatus?: AttendanceStatus;
  eligibleForMakeup?: boolean;  // manually granted by admin/coach
  // Audit trail
  lastUpdatedAt?: string;       // ISO timestamp
  lastUpdatedBy?: string;       // display name of who updated
  updateNote?: string;
}

export interface CycleEntry {
  entryNumber: number;
  reservationId: string;
  classId: string;
  className: string;
  classDate: string;
  displayStatus: AttendanceStatus | "reserved";
  eligibleForMakeup: boolean;
}

export interface MembershipCycle {
  cycleId: string;
  memberId: string;
  membershipId: string;
  membershipName: string;
  serviceType: ServiceType;
  startDate: string;
  endDate: string;
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  absentCount: number;
  pendingCount: number;
  recoverableCount: number;
  status: "active" | "completed" | "expired";
  entries: CycleEntry[];
}

export interface Membership {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  serviceType: ServiceType;
  plan: MembershipPlan;
  paymentStatus: PaymentStatus;
  membershipStatus: MembershipStatus;
  amount: number;
  startDate: string;
  endDate: string;
  coachId?: string;
  coachName?: string;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "coach" | "member";
}

export type MemberRole = "admin" | "coach" | "member";
export type MemberStatus = "active" | "inactive";

export interface Member {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  assignedCoachId?: string;
  assignedCoachName?: string;
  contractedServices: ServiceType[];
  notes?: string;
  canBookMakeupClasses?: boolean;
  makeupCredits?: number;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "coach" | "member";
  content: string;
  createdAt: string; // ISO
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: "admin" | "coach" | "member";
  createdAt: string; // ISO
  content: string;
  mediaType?: "image" | "gif" | "video" | "link";
  mediaUrl?: string;
  likesCount: number;
  comments: PostComment[];
}

export interface QuickLink {
  label: string;
  href: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
}
