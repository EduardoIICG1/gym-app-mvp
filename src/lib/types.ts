export type EventType = "class" | "blocked_time";
export type ServiceType = "group" | "personal_training" | "kinesiology" | "blocked_time";
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5; // 0=Lun … 5=Sáb
export type ClassStatus = "active" | "cancelled";
export type BookingCutoffUnit = "minutes" | "hours";
export type BookingMode = "regular" | "makeup_only";
export type AttendanceStatus = "pending_attendance" | "attended" | "absent";
export type ReservationStatus = "reserved" | "attended" | "absent" | "cancelled";
export type MembershipStatus = "active" | "expired" | "cancelled" | "pending";
export type PaymentStatus = "paid" | "pending" | "overdue" | "waived";
export type MembershipPlan = "mensual" | "trimestral" | "semestral" | "anual" | "evaluacion" | "plan_5" | "plan_10" | "plan_15" | "plan_20";
export type GrantType = "purchased" | "renewal" | "reactivation" | "gift" | "compensation" | "trial";

export interface GymClass {
  id: string;
  name: string;
  eventType: EventType;          // "class" (default) | "blocked_time"
  serviceType: ServiceType;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;
  coach: string;
  coachId?: string;
  maxCapacity: number;
  reservedCount: number;
  status: ClassStatus;
  note?: string;
  hasBookingCutoff: boolean;        // false = no time restriction
  bookingCutoffValue: number;       // used only when hasBookingCutoff = true
  bookingCutoffUnit: BookingCutoffUnit;
  bookingMode: BookingMode;         // "regular" | "makeup_only"
  sessionDate?: string;             // YYYY-MM-DD — exact session date returned by API
  programId?: string;               // Program this session belongs to
  seriesCount?: number;             // Non-cancelled sibling sessions count (>1 = recurring)
  pendingInvitationsCount?: number; // ADMIN/COACH: members with a PENDING invitation
}

export interface Reservation {
  id: string;
  classId: string;
  className: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
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
  totalSessions?: number | null;
  usedSessions?: number;
  coachId?: string;
  coachName?: string;
  notes?: string;
  grantType?: GrantType;
  grantedById?: string;
  grantReason?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "coach" | "member" | "kinesiologist"; // primary/active role (session)
  roles: MemberRole[];                           // all roles this user holds
}

export type MemberRole = "admin" | "coach" | "member" | "kinesiologist";
export type MemberStatus = "active" | "inactive";

export interface Member {
  id: string;
  name: string;
  email: string;
  roles: MemberRole[];           // supports multi-role e.g. ["admin","coach"]
  status: MemberStatus;
  assignedCoachId?: string;
  assignedCoachName?: string;
  contractedServices: ServiceType[];
  notes?: string;
  canBookMakeupClasses?: boolean;
  makeupCredits?: number;
}

// Helper — use instead of direct member.roles[0] checks
export function hasMemberRole(member: Member, role: MemberRole): boolean {
  return member.roles.includes(role);
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

export type AnnouncementType = "info" | "alert" | "event" | "maintenance";
export type AnnouncementStatus = "published" | "archived";

export interface Announcement {
  id: string;
  title?: string;
  content: string;
  type: AnnouncementType;
  authorId: string;
  authorName: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt?: string;
  linkUrl?: string;
  linkLabel?: string;
  coverImageKey?: string;
  status: AnnouncementStatus;
}
