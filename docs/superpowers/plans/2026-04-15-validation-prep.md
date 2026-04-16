# Validation Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the Primary Performance MVP for a real-user validation session by implementing a class-based dark/light theme toggle and moving the dev role switcher to an invisible DevPanel accessible only via keyboard shortcut (Shift+D).

**Architecture:** Tailwind v4 `@custom-variant` enables class-based dark mode; CSS selector overrides in `globals.css` flip the zinc palette without touching any existing component. A new `useTheme` hook manages the `dark` class on `<html>` and persists to localStorage. A new `DevPanel` component renders only when open (Shift+D), containing both the role switcher and the theme toggle — zero visible elements on screen when closed.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript

> ⚠️ **AGENTS.md note:** Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for API changes. This project uses Next.js 16 which may differ from training data.

> ℹ️ **No test framework:** This project has no Jest/Vitest setup. Verification steps use browser checks instead of automated tests.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/app/globals.css` | Add Tailwind v4 dark variant + light mode CSS overrides |
| Create | `src/lib/useTheme.ts` | Manage `dark` class on `<html>`, persist to localStorage |
| Modify | `src/app/layout.tsx` | Flash-prevention inline script + `suppressHydrationWarning` + `<DevPanel />` |
| Create | `src/components/DevPanel.tsx` | Invisible dev panel: role switcher + theme toggle, Shift+D only |
| Modify | `src/components/Navbar.tsx` | Remove role switcher pill (cycleRole button + dead constants) |

---

### Task 1: Configure Tailwind v4 class-based dark mode + light overrides

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the Tailwind v4 dark variant declaration**

Open `src/app/globals.css`. After `@import "tailwindcss";` on line 1, insert the custom variant on line 2:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

This makes every `dark:` utility in the project apply when any ancestor has class `dark`. It replaces the Tailwind v3 `darkMode: 'class'` config key — in v4, this is done in CSS.

- [ ] **Step 2: Add light mode color overrides**

Append these overrides at the end of `src/app/globals.css`. They apply when `<html>` does NOT have class `dark`, so existing dark components keep working without any changes:

```css
/* ─── Light mode overrides ───────────────────────────────────────────────── */
/* Applied when html does NOT have class="dark". Uses !important to override  */
/* Tailwind's generated utilities. Zero component changes required.           */
html:not(.dark) body {
  background-color: #f4f4f5;
  color: #18181b;
}
html:not(.dark) .bg-zinc-950 { background-color: #f4f4f5 !important; }
html:not(.dark) .bg-zinc-900 { background-color: #ffffff !important; }
html:not(.dark) .bg-zinc-800 { background-color: #e4e4e7 !important; }
html:not(.dark) .bg-zinc-700 { background-color: #d4d4d8 !important; }
html:not(.dark) .border-zinc-800 { border-color: #d4d4d8 !important; }
html:not(.dark) .border-zinc-700 { border-color: #a1a1aa !important; }
html:not(.dark) .text-white   { color: #18181b !important; }
html:not(.dark) .text-zinc-400 { color: #52525b !important; }
html:not(.dark) .text-zinc-500 { color: #71717a !important; }
html:not(.dark) .text-zinc-600 { color: #52525b !important; }
```

- [ ] **Step 3: Verify dark variant is wired correctly**

Start the dev server if not already running:
```bash
cd "c:/Users/Lalo/Documents/Gym App/gym-mvp"
npm run dev
```

Open the browser. Open DevTools console and run:
```javascript
document.documentElement.classList.remove('dark')
```

Expected: page switches to light zinc palette (gray/white backgrounds, dark text).

Run:
```javascript
document.documentElement.classList.add('dark')
```

Expected: page returns to dark zinc palette.

If the toggle works, light mode overrides are functional. Ctrl+Z or refresh to reset.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add Tailwind v4 class-based dark mode + light theme overrides"
```

---

### Task 2: Create `useTheme` hook

**Files:**
- Create: `src/lib/useTheme.ts`

- [ ] **Step 1: Create the hook file**

Create `src/lib/useTheme.ts` with this exact content:

```typescript
"use client";

import { useState, useEffect } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "pp_theme";

export function useTheme() {
  // "dark" is the SSR placeholder — overwritten on mount by reading the DOM.
  // The inline script in layout.tsx is the real source of truth for initial state.
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read what the flash-prevention script already applied — don't re-apply.
    const current: Theme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
    const html = document.documentElement;
    if (next === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  };

  return { theme, toggleTheme };
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
cd "c:/Users/Lalo/Documents/Gym App/gym-mvp"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useTheme.ts
git commit -m "feat: add useTheme hook for class-based dark/light toggle"
```

---

### Task 3: Add flash-prevention script to layout

**Files:**
- Modify: `src/app/layout.tsx`

**Why this is needed:** Without this script, React hydrates before `useTheme`'s `useEffect` runs. On a light-mode user's next visit, the page flashes dark for ~100ms before switching. The inline script runs synchronously before any HTML renders, eliminating the flash.

- [ ] **Step 1: Read the current layout**

Current content of `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primary Performance",
  description: "Gestión de clases y reservas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-white min-h-screen antialiased overflow-x-hidden">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 min-w-0 overflow-x-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Add flash-prevention script and suppressHydrationWarning**

Replace the `<html lang="es">` line with the block below. The inline script reads localStorage and adds `dark` to `<html>` before React hydrates. `suppressHydrationWarning` prevents React from warning about the class mismatch between SSR (no class) and client (class added by script).

The full new file:

```tsx
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primary Performance",
  description: "Gestión de clases y reservas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Flash-prevention: runs before React hydrates so no dark→light flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pp_theme');if(t!=='light')document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen antialiased overflow-x-hidden">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 min-w-0 overflow-x-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify in browser**

Reload the page. Expected: no visible flash, page loads dark immediately.

Open DevTools → Application → Local Storage. Set `pp_theme` to `"light"`, reload. Expected: page loads with light palette immediately (no dark flash).

Remove the `pp_theme` key, reload. Expected: page loads dark (default).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add flash-prevention script for theme initialization"
```

---

### Task 4: Create DevPanel component

**Files:**
- Create: `src/components/DevPanel.tsx`

**Behavior recap:**
- No visible element when closed — `return null` when `open === false`
- `Shift+D` toggles open/closed
- Click outside the panel closes it
- Panel contains: role switcher (Admin/Coach/Member) + theme toggle (Oscuro/Claro)
- Used only by the session moderator; invisible to validation participants

- [ ] **Step 1: Create the component**

Create `src/components/DevPanel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useCurrentUser, type EditableRole } from "@/lib/useCurrentUser";
import { useTheme, type Theme } from "@/lib/useTheme";

const ROLES: EditableRole[] = ["admin", "coach", "member"];

const ROLE_LABELS: Record<EditableRole, string> = {
  admin: "Admin",
  coach: "Coach",
  member: "Member",
};

const THEME_LABELS: Record<Theme, string> = {
  dark: "Oscuro",
  light: "Claro",
};

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const user = useCurrentUser();
  const { theme, toggleTheme } = useTheme();

  // Shift+D toggles the panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "D") {
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside closes the panel
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Nothing rendered when closed — no visible element at all
  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 right-4 z-50 bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-2xl w-52"
    >
      <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-3">
        Dev Panel
      </p>

      {/* Role switcher */}
      <div className="mb-3">
        <p className="text-zinc-600 text-[10px] mb-1.5">Rol activo</p>
        <div className="flex gap-1">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => user.changeRole(r)}
              className={`flex-1 text-[10px] py-1 rounded font-medium transition-colors ${
                user.role === r
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Theme toggle */}
      <div>
        <p className="text-zinc-600 text-[10px] mb-1.5">Tema</p>
        <div className="flex gap-1">
          {(["dark", "light"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { if (theme !== t) toggleTheme(); }}
              className={`flex-1 text-[10px] py-1 rounded font-medium transition-colors ${
                theme === t
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {THEME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DevPanel.tsx
git commit -m "feat: add DevPanel component (Shift+D, invisible by default)"
```

---

### Task 5: Remove role switcher from Navbar

**Files:**
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Remove the role switcher and its dead code**

The current Navbar has: `ROLE_CYCLE`, `ROLE_COLORS`, `ROLE_LABELS` constants, `cycleRole` function, and the switcher `<button>`. All of these are moving to DevPanel. The `useCurrentUser` import stays — it's still needed for the profile avatar (`user.name`).

Replace the full content of `src/components/Navbar.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function Navbar() {
  const pathname = usePathname();
  const user = useCurrentUser();

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">PP</span>
          <span className="font-semibold text-white text-sm hidden lg:block">Primary Performance</span>
        </Link>

        {/* Profile avatar */}
        <Link
          href="/profile"
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors shrink-0 ${
            pathname.startsWith("/profile")
              ? "bg-zinc-800"
              : "hover:bg-zinc-800/60"
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs">
            {initials(user.name)}
          </div>
          <span className="text-zinc-400 text-xs font-medium hidden sm:block">
            {user.name.split(" ")[0]}
          </span>
        </Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify the app still builds**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Visual check in browser**

Reload the page. Expected: Navbar shows only the PP logo and profile avatar — no role pill visible anywhere.

- [ ] **Step 4: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "refactor: remove role switcher pill from Navbar (moved to DevPanel)"
```

---

### Task 6: Wire DevPanel into layout + end-to-end smoke test

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Import and render DevPanel in layout**

Edit `src/app/layout.tsx` — add the import and `<DevPanel />` inside `<body>` just before `</body>`:

```tsx
import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { DevPanel } from "@/components/DevPanel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primary Performance",
  description: "Gestión de clases y reservas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Flash-prevention: runs before React hydrates so no dark→light flicker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('pp_theme');if(t!=='light')document.documentElement.classList.add('dark');})()`,
          }}
        />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen antialiased overflow-x-hidden">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <div className="flex-1 min-w-0 overflow-x-hidden">
            {children}
          </div>
        </div>
        <DevPanel />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Full build check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test — DevPanel**

In the browser:

1. Confirm no visible element in the bottom-right corner of the screen.
2. Press `Shift+D` — DevPanel should appear with Admin/Coach/Member buttons and Oscuro/Claro buttons.
3. Click "Coach" — sidebar nav items should update (Membresías disappears, Clases/Miembros stay).
4. Click "Member" — sidebar shows only Inicio, Calendario, Perfil.
5. Click "Admin" to restore.
6. Click "Claro" — page switches to light palette.
7. Reload — page should load light (no flash).
8. Press `Shift+D`, click "Oscuro" — page switches dark.
9. Click anywhere outside the panel — panel closes.
10. Press `Shift+D` again — panel reopens. ✓
11. Press `Shift+D` again — panel closes. ✓

- [ ] **Step 4: Smoke test — Admin role flow**

Switch to Admin via DevPanel:
1. Dashboard (/) — loads without errors, shows stats and recent activity.
2. /admin/members — member list shows, click edit on a member, confirm name/email inputs are editable.
3. /admin/memberships — memberships list loads.
4. /calendar — calendar loads, classes visible.
5. /profile — own profile loads with memberships and upcoming reservations.

- [ ] **Step 5: Smoke test — Coach role flow**

Switch to Coach via DevPanel:
1. Dashboard (/) — loads.
2. /calendar — loads.
3. /admin/members — member list loads, click edit on a member, confirm name/email are read-only.
4. /profile — profile loads.
5. Confirm: Membresías link is NOT visible in the sidebar.

- [ ] **Step 6: Smoke test — Member role flow**

Switch to Member via DevPanel:
1. Dashboard (/) — loads.
2. /calendar — loads.
3. /profile — profile loads with memberships and upcoming reservations.
4. Confirm: Membresías and Miembros links are NOT visible in the sidebar.
5. Confirm: Clases link is NOT visible in the sidebar.

- [ ] **Step 7: Final commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: wire DevPanel into layout — validation prep complete"
```

---

## Done

After Task 6, the app is ready for the validation session:

- **Dark/light toggle:** `Shift+D` → "Claro" / "Oscuro". Persists across reloads. Zero flash.
- **Role switching:** `Shift+D` → Admin / Coach / Member. Invisible to participants.
- **Navbar:** clean — only logo + profile avatar.
- **Mock data:** already realistic (no placeholder values found in audit).
- **Session moderator workflow:** Open DevPanel with `Shift+D`, switch roles between participants, close with `Shift+D` or click outside.
