# Operational Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix occupancy SSoT, add blocked time entities, change Member.role to roles array, and drive coach dropdown from real user data.

**Architecture:** All changes are in mock-data layer and UI — no DB or auth. `reservedCount` becomes computed in GET /api/classes. `Member.roles: MemberRole[]` replaces `Member.role`. Blocked time is a first-class `eventType` on GymClass. Coach dropdown reads from filtered members API.

**Tech Stack:** Next.js 16 App Router, TypeScript, in-memory mock data, Framer Motion (motion/react), Lucide icons, Tailwind CSS v4 with CSS custom properties.

**Root dir:** `c:/Users/Lalo/Documents/Gym App/gym-mvp/`

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/lib/types.ts` | Modify | Add `eventType` to GymClass; change `Member.role` → `Member.roles`; add `hasMemberRole` helper; add `roles` to User |
| `src/lib/mock-data.ts` | Modify | Add `eventType` to all classes; add 2 blocked_time entries; update Member objects to `roles: []`; update Eduardo to `roles: ["admin","coach"]` |
| `src/lib/useCurrentUser.ts` | Modify | Return `roles: MemberRole[]` from member data; expose `hasRole(r)` |
| `src/app/api/classes/route.ts` | Modify | GET computes reservedCount from mockReservations; POST accepts `eventType` |
| `src/app/api/reservations/route.ts` | Modify | POST rejects if class `eventType === "blocked_time"` |
| `src/app/api/members/route.ts` | Modify | Add `?includesRole=` filter |
| `src/app/api/members/[id]/route.ts` | Modify | PUT whitelist includes `roles` (array), removes `role` (singular) |
| `src/components/Sidebar.tsx` | Modify | Update role filtering to use `user.roles.includes()` |
| `src/components/DevPanel.tsx` | Modify | Role switcher cycles primary role (unchanged behavior, updated types) |
| `src/components/Navbar.tsx` | Modify | Update role display to use `user.roles` |
| `src/app/calendar/page.tsx` | Modify | Filter blocked_time from member view; render blocked_time card; replace coach text input with dropdown |
| `src/app/admin/classes/page.tsx` | Modify | Skip occupancy/attendance for blocked_time; replace coach text input with dropdown |
| `src/app/admin/members/page.tsx` | Modify | Display/edit `roles[]` instead of single `role` |
| `00_CONTEXTO_GYM.md` | Modify | Add section 32 documenting all changes |

---

## Task 1: Types — eventType + roles array

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `eventType` to GymClass and update Member**

Replace the relevant sections in `src/lib/types.ts`:

```typescript
export type EventType = "class" | "blocked_time";
export type MemberRole = "admin" | "coach" | "member";

export interface GymClass {
  id: string;
  name: string;
  eventType: EventType;          // NEW — "class" (default) | "blocked_time"
  serviceType: ServiceType;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  coach: string;
  maxCapacity: number;
  reservedCount: number;
  status: ClassStatus;
  note?: string;
  hasBookingCutoff: boolean;
  bookingCutoffValue: number;
  bookingCutoffUnit: BookingCutoffUnit;
  bookingMode: BookingMode;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  roles: MemberRole[];           // CHANGED from role: MemberRole
  status: MemberStatus;
  assignedCoachId?: string;
  assignedCoachName?: string;
  contractedServices: ServiceType[];
  notes?: string;
  canBookMakeupClasses?: boolean;
  makeupCredits?: number;
}

// Helper — replaces direct member.role checks everywhere
export function hasMemberRole(member: Member, role: MemberRole): boolean {
  return member.roles.includes(role);
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "coach" | "member";  // primary/active role (session)
  roles: MemberRole[];                             // NEW — all roles this user holds
}
```

- [ ] **Step 2: Verify TypeScript compiles (will fail — expected, next tasks fix it)**

```bash
cd "/c/Users/Lalo/Documents/Gym App/gym-mvp" && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors about `member.role`, `Member.role` assignments — these are fixed in subsequent tasks.

---

## Task 2: Mock data — eventType on all classes + blocked_time entries + roles arrays

**Files:**
- Modify: `src/lib/mock-data.ts`

- [ ] **Step 1: Update currentUser to include roles**

In `src/lib/mock-data.ts`, change `currentUser`:
```typescript
export const currentUser: User = {
  id: "user-123",
  name: "Eduardo García",
  email: "eduardo@primaryperformance.mx",
  role: "admin",
  roles: ["admin", "coach"],  // Eduardo is admin AND coach
};
```

- [ ] **Step 2: Add `eventType: "class"` to all existing mockClasses entries**

Every entry in `mockClasses` needs `eventType: "class"` added. Example (repeat for all 12):
```typescript
{
  id: "1",
  name: "Funcional 6am",
  eventType: "class",           // ADD THIS LINE
  serviceType: "group",
  // ... rest unchanged
}
```

- [ ] **Step 3: Add 2 blocked_time entries to mockClasses (append after class "12")**

```typescript
{
  id: "bt-1",
  name: "Mantenimiento de equipo",
  eventType: "blocked_time",
  serviceType: "blocked_time",
  dayOfWeek: 2 as DayOfWeek,      // Wednesday
  startTime: "12:00",
  endTime: "13:00",
  coach: "Eduardo García",
  maxCapacity: 0,
  reservedCount: 0,
  status: "active",
  note: "Revisión mensual de equipos — acceso restringido",
  hasBookingCutoff: false,
  bookingCutoffValue: 0,
  bookingCutoffUnit: "hours",
  bookingMode: "regular",
},
{
  id: "bt-2",
  name: "Ausencia — Juan Pérez",
  eventType: "blocked_time",
  serviceType: "blocked_time",
  dayOfWeek: 4 as DayOfWeek,      // Friday
  startTime: "06:00",
  endTime: "07:00",
  coach: "Juan Pérez",
  maxCapacity: 0,
  reservedCount: 0,
  status: "active",
  note: "Cita médica",
  hasBookingCutoff: false,
  bookingCutoffValue: 0,
  bookingCutoffUnit: "hours",
  bookingMode: "regular",
},
```

- [ ] **Step 4: Update all mockMembers to use `roles: []` instead of `role`**

```typescript
export let mockMembers: Member[] = [
  {
    id: "user-123",
    name: "Eduardo García",
    email: "eduardo@primaryperformance.mx",
    roles: ["admin", "coach"],    // multi-role
    status: "active",
    contractedServices: ["group", "kinesiology"],
  },
  {
    id: "user-001",
    name: "Ana Rodríguez",
    email: "ana@gmail.com",
    roles: ["member"],
    status: "active",
    assignedCoachId: "coach-001",
    assignedCoachName: "Juan Pérez",
    contractedServices: ["group"],
    canBookMakeupClasses: true,
    makeupCredits: 1,
  },
  {
    id: "user-002",
    name: "Carlos Herrera",
    email: "carlos@gmail.com",
    roles: ["member"],
    status: "inactive",
    contractedServices: ["group"],
  },
  {
    id: "user-003",
    name: "María López",
    email: "maria@gmail.com",
    roles: ["member"],
    status: "active",
    assignedCoachId: "coach-005",
    assignedCoachName: "Dr. Ramírez",
    contractedServices: ["group", "kinesiology"],
  },
  {
    id: "user-004",
    name: "Roberto Sánchez",
    email: "roberto@gmail.com",
    roles: ["member"],
    status: "active",
    contractedServices: ["group"],
  },
  {
    id: "user-005",
    name: "Sofía Morales",
    email: "sofia@gmail.com",
    roles: ["member"],
    status: "active",
    assignedCoachId: "coach-001",
    assignedCoachName: "Juan Pérez",
    contractedServices: ["group", "personal_training"],
    canBookMakeupClasses: true,
    makeupCredits: 2,
  },
  {
    id: "coach-001",
    name: "Juan Pérez",
    email: "juan@primaryperformance.mx",
    roles: ["coach"],
    status: "active",
    contractedServices: ["group", "personal_training"],
  },
  {
    id: "coach-002",
    name: "María García",
    email: "mgarcia@primaryperformance.mx",
    roles: ["coach"],
    status: "active",
    contractedServices: ["group"],
  },
  {
    id: "coach-003",
    name: "Carlos López",
    email: "clopez@primaryperformance.mx",
    roles: ["coach"],
    status: "active",
    contractedServices: ["group"],
  },
  {
    id: "coach-004",
    name: "Laura Martínez",
    email: "laura@primaryperformance.mx",
    roles: ["coach"],
    status: "active",
    contractedServices: ["group"],
  },
  {
    id: "coach-005",
    name: "Dr. Ramírez",
    email: "ramirez@primaryperformance.mx",
    roles: ["coach"],
    status: "active",
    contractedServices: ["kinesiology"],
  },
];
```

- [ ] **Step 5: Verify TypeScript compiles (still will have errors in UI files)**

```bash
cd "/c/Users/Lalo/Documents/Gym App/gym-mvp" && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors in UI pages that read `member.role`, `m.role` — fixed in later tasks.

---

## Task 3: useCurrentUser — expose roles array + hasRole helper

**Files:**
- Modify: `src/lib/useCurrentUser.ts`

- [ ] **Step 1: Update hook to derive roles from member data and expose hasRole**

Replace the entire file `src/lib/useCurrentUser.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { currentUser, mockMembers } from "./mock-data";
import type { User } from "./types";
import type { MemberRole } from "./types";

const STORAGE_KEY = "pp_dev_role";
export type EditableRole = "admin" | "coach" | "member";

export function useCurrentUser(): User & {
  roles: MemberRole[];
  hasRole: (r: MemberRole) => boolean;
  changeRole: (r: EditableRole) => void;
} {
  const [role, setRole] = useState<EditableRole>(currentUser.role as EditableRole);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as EditableRole | null;
    if (stored && ["admin", "coach", "member"].includes(stored)) {
      setRole(stored);
    }

    const handler = (e: Event) => {
      setRole((e as CustomEvent<EditableRole>).detail);
    };
    window.addEventListener("pp:roleChange", handler);
    return () => window.removeEventListener("pp:roleChange", handler);
  }, []);

  const changeRole = (r: EditableRole) => {
    localStorage.setItem(STORAGE_KEY, r);
    setRole(r);
    window.dispatchEvent(new CustomEvent<EditableRole>("pp:roleChange", { detail: r }));
  };

  // Derive roles from the member record for the current user
  const member = mockMembers.find(m => m.id === currentUser.id);
  const baseRoles: MemberRole[] = member ? member.roles : [currentUser.role as MemberRole];

  // When a role is switched via DevPanel, synthesize a roles array that
  // includes the switched role plus any extra roles the user actually has.
  // e.g. Eduardo (admin+coach) switching to "coach" → roles: ["admin","coach"]
  // A plain "member" switching to "coach" → roles: ["coach"] (simulated)
  const roles: MemberRole[] = baseRoles.includes(role)
    ? baseRoles                  // role is one of the user's real roles — show all
    : [role];                    // simulating a different persona — only the simulated role

  const hasRole = (r: MemberRole) => roles.includes(r);

  return { ...currentUser, role, roles, hasRole, changeRole };
}
```

---

## Task 4: API — GET /api/classes computes reservedCount; POST accepts eventType

**Files:**
- Modify: `src/app/api/classes/route.ts`

- [ ] **Step 1: Update GET to compute reservedCount from mockReservations**

Replace `src/app/api/classes/route.ts` GET handler:

```typescript
import { mockClasses, mockReservations } from "@/lib/mock-data";
import { GymClass } from "@/lib/types";

export async function GET() {
  // Compute reservedCount from live reservation data — single source of truth
  const result = mockClasses.map(cls => ({
    ...cls,
    reservedCount: mockReservations.filter(
      r => r.classId === cls.id && r.status !== "cancelled"
    ).length,
  }));
  return Response.json(result);
}
```

- [ ] **Step 2: Update POST to accept eventType**

Replace the POST body destructuring and GymClass construction:

```typescript
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, serviceType, dayOfWeek, startTime, endTime, coach, maxCapacity, note,
      hasBookingCutoff, bookingCutoffValue, bookingCutoffUnit, bookingMode,
      eventType,
    } = body;

    if (!name || !startTime || !endTime || !coach) {
      return Response.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const newClass: GymClass = {
      id: String(Date.now()),
      name,
      eventType: eventType === "blocked_time" ? "blocked_time" : "class",
      serviceType: serviceType || "group",
      dayOfWeek: Number(dayOfWeek) as import("@/lib/types").DayOfWeek,
      startTime,
      endTime,
      coach,
      maxCapacity: eventType === "blocked_time" ? 0 : (Number(maxCapacity) || 20),
      reservedCount: 0,
      status: "active",
      note: note || undefined,
      hasBookingCutoff: eventType === "blocked_time" ? false : (hasBookingCutoff !== false),
      bookingCutoffValue: Number(bookingCutoffValue) || 3,
      bookingCutoffUnit: bookingCutoffUnit || "hours",
      bookingMode: bookingMode || "regular",
    };

    mockClasses.push(newClass);
    return Response.json(newClass, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
```

---

## Task 5: API — POST /api/reservations rejects blocked_time

**Files:**
- Modify: `src/app/api/reservations/route.ts`

- [ ] **Step 1: Add eventType guard to POST**

After the existing class existence check, add one line:

```typescript
// In the POST handler, after `if (!cls) return 404`:
if (cls.eventType === "blocked_time") {
  return Response.json({ error: "Este horario está bloqueado" }, { status: 400 });
}
```

Full POST block for reference:
```typescript
export async function POST(request: Request) {
  try {
    const { classId, userId, classDate } = await request.json();

    const cls = mockClasses.find((c) => c.id === classId);
    if (!cls) return Response.json({ error: "Clase no encontrada" }, { status: 404 });
    if (cls.eventType === "blocked_time")
      return Response.json({ error: "Este horario está bloqueado" }, { status: 400 });
    if (cls.status === "cancelled") return Response.json({ error: "Clase cancelada" }, { status: 400 });
    if (cls.reservedCount >= cls.maxCapacity) return Response.json({ error: "Clase llena" }, { status: 400 });

    const duplicate = mockReservations.find(
      (r) => r.classId === classId && r.studentId === userId && r.classDate === classDate && r.status !== "cancelled"
    );
    if (duplicate) return Response.json({ error: "Ya tienes esta clase reservada" }, { status: 400 });

    const reservation: Reservation = {
      id: `res-${Date.now()}`,
      classId,
      studentId: userId,
      studentName: "Eduardo García",
      studentEmail: "eduardo@primaryperformance.mx",
      classDate,
      status: "reserved",
    };

    mockReservations.push(reservation);
    cls.reservedCount += 1;
    return Response.json(reservation, { status: 201 });
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
```

---

## Task 6: API — GET /api/members accepts includesRole filter; PUT accepts roles array

**Files:**
- Modify: `src/app/api/members/route.ts`
- Modify: `src/app/api/members/[id]/route.ts`

- [ ] **Step 1: Add `?includesRole=` filter to GET /api/members**

In `src/app/api/members/route.ts`, update the GET handler to support the new filter:

```typescript
import { mockMembers } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.toLowerCase();
  const status = searchParams.get("status");
  const includesRole = searchParams.get("includesRole");

  let result = [...mockMembers];
  if (search) result = result.filter(m =>
    m.name.toLowerCase().includes(search) || m.email.toLowerCase().includes(search)
  );
  if (status) result = result.filter(m => m.status === status);
  if (includesRole) result = result.filter(m => m.roles.includes(includesRole as import("@/lib/types").MemberRole));

  return Response.json(result);
}
```

- [ ] **Step 2: Update PUT /api/members/[id] to handle roles array**

In `src/app/api/members/[id]/route.ts`, update the whitelist to use `roles` (array) instead of `role` (string):

```typescript
// Replace the whitelist section:
const allowed = ["roles", "status", "contractedServices", "assignedCoachId", "assignedCoachName", "notes"];
if (callerRole === "admin") allowed.push("name", "email");

const patch: Partial<import("@/lib/types").Member> = {};
for (const key of allowed) {
  if (key in body) (patch as Record<string, unknown>)[key] = body[key];
}
```

Note: the full file must continue to handle `_callerRole` extraction from body. Keep that logic; only change `"role"` to `"roles"` in the whitelist array.

---

## Task 7: Sidebar — update role filtering to use roles array

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Update visibleItems filter and accentColor**

In `src/components/Sidebar.tsx`, find these two lines and replace:

```typescript
// BEFORE:
const accentColor = ROLE_COLOR[activeUser.role] ?? "#4fc3f7";
const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(activeUser.role));

// AFTER:
const accentColor = ROLE_COLOR[activeUser.role] ?? "#4fc3f7";
const visibleItems = NAV_ITEMS.filter(item =>
  item.roles.some(r => activeUser.roles.includes(r as import("@/lib/types").MemberRole))
);
```

The role switcher in the sidebar footer still calls `changeRole(r)` with a single role — no change needed there.

---

## Task 8: admin/members — display and edit roles array

**Files:**
- Modify: `src/app/admin/members/page.tsx`

- [ ] **Step 1: Find all `member.role` reads and update to `member.roles`**

Search the file for `.role` references:

```bash
grep -n "\.role" "/c/Users/Lalo/Documents/Gym App/gym-mvp/src/app/admin/members/page.tsx"
```

- Any `m.role` or `member.role` used for display should become `m.roles[0]` (primary role for display) or the full array.
- The `RoleBadge` component should show the primary role: `member.roles[0]`.
- For filtering by role in the dropdown, check `m.roles.includes(filterRole)`.
- The edit modal role selector should work on `member.roles[0]` for simplicity (primary role selector). To change multi-role in UI is out of scope — keep the modal editing the first role only, with a note.

Specific changes:

```typescript
// Filter by role dropdown — change from:
if (roleFilter) result = result.filter(m => m.role === roleFilter);
// To:
if (roleFilter) result = result.filter(m => m.roles.includes(roleFilter as MemberRole));

// RoleBadge display — change from:
<RoleBadge role={member.role} />
// To:
<RoleBadge role={member.roles[0]} />

// Edit modal — role is the first role (primary):
// Initialize editState: role: member.roles[0]
// On save: send roles: [editState.role] unless member has multi-roles that must be preserved
// Safer: send roles: member.roles.map(r => r === originalPrimaryRole ? editState.role : r)
// For MVP simplicity: send roles: [editState.role]  (acknowledged limitation)
```

- [ ] **Step 2: Update POST /api/members body to send `roles` not `role`**

In the "Nuevo miembro" modal save handler, the body sent to POST should be:
```typescript
body: JSON.stringify({
  name: form.name,
  email: form.email,
  roles: [form.role],    // wrap single selection in array
  status: form.status,
  assignedCoachId: form.assignedCoachId || undefined,
  assignedCoachName: form.assignedCoachName || undefined,
  contractedServices: form.contractedServices,
  notes: form.notes || undefined,
})
```

And in the "Editar miembro" modal, send `roles: [editState.role]` (same pattern).

Note: multi-role assignment via UI is not in scope — only single primary role selectable in modal. Eduardo's multi-role is set in mock-data only.

---

## Task 9: Calendar — filter blocked_time + render blocked_time card + coach dropdown

**Files:**
- Modify: `src/app/calendar/page.tsx`

- [ ] **Step 1: Filter blocked_time from member view**

In the calendar page, classes are fetched and stored in state. When rendering the calendar grid/columns, apply:

```typescript
// In the section that builds classesForDay (or wherever dayClasses is derived):
// Admin/coach see all; members see only eventType === "class"
const visibleClasses = isAdminOrCoach
  ? dayClasses
  : dayClasses.filter(cls => cls.eventType !== "blocked_time");
```

`isAdminOrCoach` is already derived from `useCurrentUser()` in the page.

- [ ] **Step 2: Add blocked_time card rendering in calendar**

When iterating over classes for a day column, add a conditional render for blocked_time:

```typescript
// Inside the map over classes per day:
if (cls.eventType === "blocked_time") {
  return (
    <div
      key={cls.id}
      className="rounded-xl p-3 border"
      style={{
        background: "repeating-linear-gradient(45deg, var(--card-border), var(--card-border) 2px, var(--card) 2px, var(--card) 10px)",
        borderColor: "var(--card-border)",
        opacity: 0.85,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#71717a30", color: "#71717a" }}>
          Bloqueado
        </span>
      </div>
      <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{cls.name}</p>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cls.startTime}–{cls.endTime}</p>
      {cls.note && <p className="text-xs mt-1 truncate" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>{cls.note}</p>}
    </div>
  );
}
```

This replaces the normal class card render for blocked_time entries. Normal class cards render as before.

- [ ] **Step 3: Add coaches state and fetch on mount**

Add to the page component state:
```typescript
const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);
```

In the `fetchData` callback (or a separate `fetchCoaches` useEffect):
```typescript
const coachRes = await fetch("/api/members?includesRole=coach");
const coachData: Member[] = await coachRes.json();
setCoaches(coachData.map(m => ({ id: m.id, name: m.name })));
```

- [ ] **Step 4: Replace coach text input with dropdown in CreateModal/edit view**

In the create class form (`defaultCreate` flow) and in `editState` form, find the coach input. In the `"edit"` view within ManageModal, the coach field is currently:

```typescript
// BEFORE (from the edit view, around line 451-458):
{(["name", "coach"] as const).map(key => (
  <div key={key}>
    <label>...</label>
    <input type="text" value={(editState as unknown as Record<string, string>)[key]}
      onChange={e => setEditState({ ...editState, [key]: e.target.value })}
      className={inputCls} style={inputStyle} />
  </div>
))}

// AFTER — split the map to handle coach separately:
<div>
  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
  <input type="text" value={editState.name}
    onChange={e => setEditState({ ...editState, name: e.target.value })}
    className={inputCls} style={inputStyle} />
</div>
<div>
  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Coach *</label>
  <select value={editState.coach}
    onChange={e => setEditState({ ...editState, coach: e.target.value })}
    className={inputCls} style={inputStyle}>
    <option value="">Seleccionar coach</option>
    {coaches.map(c => (
      <option key={c.id} value={c.name}>{c.name}</option>
    ))}
  </select>
</div>
```

And in the quick-create `defaultCreate` form (if visible in calendar), apply the same pattern to the coach field. The `CreateState.coach` stays as string (name) — the dropdown sets the name.

---

## Task 10: admin/classes — skip occupancy/attendance for blocked_time + coach dropdown

**Files:**
- Modify: `src/app/admin/classes/page.tsx`

- [ ] **Step 1: Skip occupancy bar and attendance for blocked_time in class rows**

In the class row render (around line 200+), wrap the occupancy bar in a condition:

```typescript
// BEFORE:
{/* Occupancy bar */}
<div className="hidden sm:flex flex-col items-end gap-1 w-32 shrink-0">
  ...occupancy...
</div>

// AFTER:
{cls.eventType !== "blocked_time" && (
  <div className="hidden sm:flex flex-col items-end gap-1 w-32 shrink-0">
    ...occupancy...
  </div>
)}
```

And hide the expand button (chevron) for blocked_time:
```typescript
{cls.eventType !== "blocked_time" && (
  <button onClick={() => setExpandedId(isExpanded ? null : cls.id)} ...>
    {isExpanded ? <ChevronUp ... /> : <ChevronDown ... />}
  </button>
)}
```

Add a "Bloqueado" badge for blocked_time in the status column:
```typescript
{cls.eventType === "blocked_time" ? (
  <span className="text-xs px-2 py-0.5 rounded font-semibold shrink-0"
    style={{ background: "#71717a20", color: "#71717a" }}>
    Bloqueado
  </span>
) : (
  <span ...>{cls.status === "active" ? "Activa" : "Cancelada"}</span>
)}
```

- [ ] **Step 2: Add coaches state and fetch in admin/classes**

Same as calendar — add `coaches` state, fetch `GET /api/members?includesRole=coach` in `fetchData`.

- [ ] **Step 3: Replace coach text input with dropdown in admin/classes modal**

In `EMPTY_FORM` and the form render, the coach field is a text input. Replace:

```typescript
// BEFORE:
<input type="text" ... onChange={e => setForm({ ...form, coach: e.target.value })} />

// AFTER:
<select value={form.coach}
  onChange={e => setForm({ ...form, coach: e.target.value })}
  className={inputCls} style={inputStyle}>
  <option value="">Seleccionar coach</option>
  {coaches.map(c => (
    <option key={c.id} value={c.name}>{c.name}</option>
  ))}
</select>
```

Also update the validation check — `!form.coach` is still correct (empty string = invalid).

---

## Task 11: POST /api/members — accept roles array

**Files:**
- Modify: `src/app/api/members/route.ts`

- [ ] **Step 1: Update POST handler to accept `roles` not `role`**

Find the POST handler in `src/app/api/members/route.ts`. Update body destructuring:

```typescript
// BEFORE: const { name, email, role, status, ... } = body;
// AFTER:
const { name, email, roles, status, assignedCoachId, assignedCoachName, contractedServices, notes } = body;

if (!name || !email) return Response.json({ error: "name y email son requeridos" }, { status: 400 });

const duplicate = mockMembers.find(m => m.email === email);
if (duplicate) return Response.json({ error: "Email ya registrado" }, { status: 409 });

const newMember: Member = {
  id: `user-${Date.now()}`,
  name,
  email,
  roles: Array.isArray(roles) ? roles : [roles || "member"],
  status: status || "active",
  assignedCoachId: assignedCoachId || undefined,
  assignedCoachName: assignedCoachName || undefined,
  contractedServices: contractedServices || [],
  notes: notes || undefined,
};
```

---

## Task 12: TypeScript compile check

- [ ] **Step 1: Run full TypeScript check**

```bash
cd "/c/Users/Lalo/Documents/Gym App/gym-mvp" && npx tsc --noEmit 2>&1
```

Expected: 0 errors. Fix any remaining `.role` → `.roles[0]` or similar issues found.

Common remaining issues to check:
- `src/app/profile/page.tsx` — may read `member.role` for display
- `src/app/page.tsx` (home) — may read `member.role` or `user.role`
- `src/components/Badge.tsx` — `RoleBadge` receives `role: MemberRole` (single) — keep as-is, pass `member.roles[0]` at call sites
- `src/components/DevPanel.tsx` — uses `currentUser.role` which is still a single string

Fix any compile errors found before proceeding.

---

## Task 13: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
cd "/c/Users/Lalo/Documents/Gym App/gym-mvp" && npm run dev
```

- [ ] **Step 2: Verify occupancy consistency**

1. Open `/admin/classes`
2. Expand a class that has reservations (e.g. "Funcional 6am" — has 5 in mockReservations for Mon)
3. Confirm: occupancy count in the bar matches the number of students in "Ver inscritos"
4. Open `/api/classes` directly — confirm `reservedCount` matches reservation count

- [ ] **Step 3: Verify blocked_time**

1. Open `/calendar` as admin (DevPanel Shift+D → Admin)
2. Confirm Wednesday shows "Mantenimiento de equipo" block with stripe background and no booking button
3. Switch role to Member — confirm blocked_time is NOT shown
4. Confirm Friday shows "Ausencia — Juan Pérez" block for admin/coach

- [ ] **Step 4: Verify multi-role**

1. Open `/admin/members` — confirm Eduardo García shows roles badge with "admin" (primary)
2. Open `/api/members?includesRole=coach` — confirm Eduardo appears in the list
3. Confirm sidebar items visible match role correctly when switching via DevPanel

- [ ] **Step 5: Verify coach dropdown**

1. Open `/admin/classes` → click "Nueva Clase"
2. Confirm the "Coach" field is a dropdown populated with all coaches including Eduardo García
3. Select a coach, create a class, confirm it saves with correct coach name
4. Open `/calendar` → click "+" to create a class → confirm same dropdown

---

## Task 14: Documentation update

**Files:**
- Modify: `00_CONTEXTO_GYM.md` at root of the workspace (`c:/Users/Lalo/Documents/Gym App/00_CONTEXTO_GYM.md`)

- [ ] **Step 1: Append section 32 to 00_CONTEXTO_GYM.md**

Add at the end of the file:

```markdown
---

## 32. ESTADO DE IMPLEMENTACIÓN (ITERACIÓN — CONSISTENCIA OPERATIVA PRE-DEMO)

**Fecha:** 2026-04-20
**Branch:** feat/mvp-redesign-from-figma

### 32.1 Objetivo

Cerrar inconsistencias operativas antes de la demo/focus group:
1. Fuente única de verdad para ocupación y reservas
2. Soporte de "Tiempo bloqueado" como entidad no reservable
3. Roles múltiples por miembro (Member.roles: MemberRole[])
4. Dropdown de coaches desde datos reales de usuarios

### 32.2 Cambios de Modelo

#### GymClass — nuevo campo `eventType`
```typescript
eventType: "class" | "blocked_time"  // default "class"
```
- Las clases regulares no cambian
- `blocked_time`: sin cupos, sin reservas, visible solo para admin/coach
- Se diferencia visualmente con fondo rayado en el calendario

#### Member — `role` → `roles: MemberRole[]`
```typescript
// Antes:
role: MemberRole  // "admin" | "coach" | "member"

// Ahora:
roles: MemberRole[]  // ["admin"] | ["coach"] | ["admin", "coach"] | etc.
```
- Eduardo García: `roles: ["admin", "coach"]`
- Coaches solo: `roles: ["coach"]`
- Miembros: `roles: ["member"]`
- Helper: `hasMemberRole(member, role): boolean`

#### User — campo adicional
```typescript
roles: MemberRole[]  // todos los roles del usuario (derivado de Member)
```
El campo `role` (singular) se mantiene para compatibilidad y como "rol activo en sesión".

### 32.3 Fuente Única de Verdad — Ocupación

**Antes:** `GymClass.reservedCount` era un contador manual incrementado/decrementado en las rutas POST/DELETE de reservas. Podía desincronizarse.

**Ahora:** `GET /api/classes` computa `reservedCount` dinámicamente:
```typescript
reservedCount: mockReservations.filter(
  r => r.classId === cls.id && r.status !== "cancelled"
).length
```
La barra de ocupación y el panel "Ver inscritos" comparten la misma fuente.

### 32.4 Tiempo Bloqueado

- Se crean con `eventType: "blocked_time"`
- Se muestran en el calendario de admin/coach con fondo rayado
- No aparecen en la vista de miembro
- No se puede reservar (`POST /api/reservations` retorna 400 si `eventType === "blocked_time"`)
- No muestran panel de asistencia ni barra de ocupación en `/admin/classes`
- Datos de ejemplo: "Mantenimiento de equipo" (Mié 12-13h) y "Ausencia Juan Pérez" (Vie 6-7h)

### 32.5 Coach Dropdown

- Las rutas `/admin/classes` y `/calendar` cargan coaches desde `GET /api/members?includesRole=coach`
- El campo "Coach" en modales de crear/editar clase es un `<select>` (antes era texto libre)
- Valor almacenado = nombre del coach (string) — sin cambio al modelo de GymClass
- Eduardo García aparece en la lista porque `roles: ["admin", "coach"]`

### 32.6 Limitaciones Conocidas

| Limitación | Razón |
|-----------|-------|
| Modal de edición de miembro edita solo el primer rol | UI simple — multi-rol real requeriría checkboxes en modal |
| `GymClass.coach` sigue siendo string (nombre, no ID) | Cambiar a ID rompería datos históricos |
| `reservedCount` en mockClasses sigue siendo actualizado manualmente en POST/DELETE | Redundante pero inofensivo — el GET siempre recomputa |
| Sidebar filtra por "alguno de los roles del usuario" → admin+coach ve todo admin | Comportamiento correcto: acceso más amplio cuando hay múltiples roles |

### 32.7 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `src/lib/types.ts` | + EventType; GymClass.eventType; Member.roles[]; User.roles[]; hasMemberRole() |
| `src/lib/mock-data.ts` | eventType en todas las clases; 2 blocked_time entries; Member.roles[]; currentUser.roles |
| `src/lib/useCurrentUser.ts` | Retorna roles[]; hasRole(r) helper |
| `src/app/api/classes/route.ts` | GET computa reservedCount; POST acepta eventType |
| `src/app/api/reservations/route.ts` | POST rechaza blocked_time |
| `src/app/api/members/route.ts` | GET acepta ?includesRole=; POST acepta roles[] |
| `src/app/api/members/[id]/route.ts` | PUT whitelist: "roles" no "role" |
| `src/components/Sidebar.tsx` | Filtro de items usa roles.includes() |
| `src/app/admin/members/page.tsx` | Display y edición de roles[] |
| `src/app/calendar/page.tsx` | Filtra blocked_time por rol; render bloqueado; coach dropdown |
| `src/app/admin/classes/page.tsx` | Oculta ocupación/asistencia en blocked_time; coach dropdown |
```

---

## Known Limitations (for reference during demo)

1. **Multi-role UI edit**: The member edit modal only lets you select ONE role (the primary). Eduardo's `["admin","coach"]` multi-role is only set in mock-data, not editable via UI.
2. **Coach stored as name string**: If a coach changes their name, existing classes would have stale coach names. Intentional for MVP simplicity.
3. **reservedCount in mock class objects**: Still manually updated in POST/DELETE routes. Harmless — GET always recomputes. Will be removed when moving to real DB with queries.
4. **Blocked time creation via UI**: Admin/coach can create blocked_time by setting `eventType` in the create form. If the UI form doesn't expose the eventType toggle yet, blocked_time entries only exist in mock_data.
