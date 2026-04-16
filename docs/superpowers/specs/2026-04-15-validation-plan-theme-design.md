# Spec: Validation Plan + Theme Toggle + DevPanel
**Date:** 2026-04-15
**Project:** Primary Performance — Gym MVP
**Branch:** feat/mvp-redesign-from-figma
**Scope:** Pre-validation prep, dark/light theme toggle, invisible DevPanel for session moderation

---

## Context

The MVP is ready for a first validation session with the Primary Performance team. No DB or auth yet — all data is in-memory mock. Goal of this spec: prepare the app for real-user validation without introducing new features or unnecessary complexity.

Three workstreams:
1. **DevPanel** — move dev tooling (role switcher) off the visible UI, accessible only via keyboard shortcut
2. **Theme toggle** — implement dark/light switching via Tailwind class strategy, contained inside DevPanel
3. **Validation assets** — session plan + feedback capture framework (documentation only, no code)

---

## 1. Validation Plan

### Session Structure (~90 min)

| Phase | Duration | Description |
|-------|----------|-------------|
| Setup | 10 min | Context framing: "this is a prototype, honest feedback only, no right answers" |
| Guided demo | 30 min | Moderator drives 3 role flows sequentially |
| Free exploration | 40 min | Each participant given their role + task card; moderator observes without intervening |
| Debrief | 10 min | Verbal rating 1–5 (clarity, ease) + one open question per role |

### Guided Demo Flows

- **Admin:** Dashboard → member list → open a member → verify active membership
- **Coach:** Calendar → find assigned classes this week → open a member profile
- **Member:** Own profile → check membership status and expiry → view upcoming reservations

### Task Cards (Free Exploration)

Printed or shown on screen at start of exploration phase. One card per role, 2–3 tasks max.

- **Admin:** "Find a specific member and confirm their active membership and assigned coach."
- **Coach:** "Identify which classes you have this week and check one student's profile."
- **Member:** "Check when your membership expires and how many upcoming classes you have."

### Observation Principle

During free exploration, the moderator does **not** explain, guide, or intervene. Role changes (to switch perspective between participants) are done invisibly via the DevPanel keyboard shortcut (Shift+D). The goal is to observe natural navigation behavior without external scaffolding.

---

## 2. Pre-Validation Adjustments (4 items only)

1. **Realistic mock data** — replace any test/placeholder names with realistic Spanish names, future-dated reservations, and plausible peso amounts. No "test123" visible during session.
2. **Smoke test all 3 role flows** — run through the guided demo flows once per role before the session. Confirm no broken pages.
3. **Verify title/favicon** — "Primary Performance" must be visible in the browser tab.
4. **Clear console errors** — no red errors visible if a participant opens DevTools accidentally.

**Explicitly out of scope:** new features, auth, DB, UI changes unrelated to above.

---

## 3. DevPanel

### Behavior

- Completely invisible during normal use — no button, no badge, no indicator on screen
- Only accessible via keyboard shortcut: `Shift + D`
- Opens a floating panel (fixed position, bottom-right, z-50) with:
  - Role switcher (Admin / Coach / Member)
  - Theme toggle (Dark / Light)
- Pressing `Shift + D` again closes the panel
- Clicking outside the panel closes it

### Rationale

The role switcher was previously a visible pill in the Navbar. For the validation session, any visible dev tooling risks being perceived as product functionality, contaminating user feedback. Moving it behind a keyboard shortcut makes it invisible to participants while keeping it fully accessible to the moderator.

### Files

| Action | File |
|--------|------|
| Create | `src/components/DevPanel.tsx` |
| Modify | `src/components/Navbar.tsx` — remove role switcher pill |
| Modify | `src/app/layout.tsx` — add `<DevPanel />` |

### DevPanel Component Spec

```
DevPanel
├── useCurrentUser() — for role switching
├── useTheme() — for theme toggle
├── keydown listener: Shift+D → toggles panel open/closed
├── click-outside listener → closes panel
└── Panel UI (only when open):
    ├── Role selector: 3 buttons (Admin / Coach / Member), highlights active
    └── Theme toggle: Dark | Light switch
```

**No visible trigger element of any kind.** The panel renders only when open. When closed, nothing is rendered in the DOM — no button, no badge, no indicator. The only way to open it is `Shift+D`.

---

## 4. Theme Toggle

### Approach: Tailwind `class` dark mode + CSS overrides

**Why this approach:** The existing codebase uses hardcoded Tailwind dark utilities (zinc-950, zinc-900, etc.) everywhere. Rather than adding `dark:` prefixes to every component (large refactor), we use CSS selector overrides in `globals.css` that apply when `html` does NOT have the `dark` class. Zero changes to existing components.

### Files

| Action | File | Change |
|--------|------|--------|
| Modify | `tailwind.config.ts` | Add `darkMode: 'class'` |
| Create | `src/lib/useTheme.ts` | New hook (~20 lines) |
| Modify | `src/app/globals.css` | Light mode CSS overrides (~20 lines) |
| Modify | `src/app/layout.tsx` | `suppressHydrationWarning` on `<html>` + inline flash-prevention script |

### `useTheme` Hook

The inline script in `layout.tsx` is the source of truth for initial theme — it runs before hydration and applies the correct class to `<html>`. The hook must **read from the DOM** on mount rather than defaulting to `"dark"`, to avoid overwriting what the script already resolved.

```typescript
// src/lib/useTheme.ts
"use client";
import { useState, useEffect } from "react";

export type Theme = "dark" | "light";
const STORAGE_KEY = "pp_theme";

export function useTheme() {
  // Initialize as "dark" only as SSR placeholder — overwritten on mount
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read the class the inline script already applied — no re-apply needed
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
    next === "dark" ? html.classList.add("dark") : html.classList.remove("dark");
  };

  return { theme, toggleTheme };
}
```

### Light Mode CSS Overrides (`globals.css`)

```css
/* Light mode — applied when html does NOT have class="dark" */
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

### Flash Prevention (inline script in `layout.tsx`)

```html
<html lang="es" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        var t = localStorage.getItem('pp_theme');
        if (t !== 'light') document.documentElement.classList.add('dark');
      })();
    `}} />
  </head>
```

This runs before React hydrates, preventing a white flash on dark-mode users.

---

## 5. Feedback Capture

### Per-Role Debrief Questions (verbal, after free exploration)

**Admin**
1. ¿Pudiste encontrar la información de un miembro sin ayuda?
2. ¿El flujo de membresías te resultó claro?
3. ¿Qué es lo primero que cambiarías?

**Coach**
1. ¿Tu calendario te da lo que necesitás para el día a día?
2. ¿Los perfiles de alumnos tienen suficiente información?
3. ¿Qué falta para que uses esto en tu trabajo real?

**Member**
1. ¿Sabés en qué estado está tu membresía con solo mirarlo?
2. ¿Encontraste tus próximas clases fácilmente?
3. ¿Lo usarías desde el celular?

### Observation Focus (during free exploration)

- **Navigation:** does the user go to the right place on first try?
- **Comprehension without help:** do labels, statuses, and flows make sense unaided?
- **Perceived value:** does the user express "this is useful" unprompted?

### Decision Framework (post-session)

| Signal | Action |
|--------|--------|
| ≥ 2/3 roles say "I would use this" | Validate → proceed to DB + auth phase |
| Same problem repeated by ≥ 2 participants | Fix before DB/auth, don't carry friction forward |
| Navigation confusion in ≥ 2 participants | Revisit sidebar/navbar structure before next phase |
| No strong signal either way | Schedule a second session with real data seeded |

---

## Implementation Order

1. `tailwind.config.ts` — add `darkMode: 'class'`
2. `src/lib/useTheme.ts` — create hook
3. `src/app/globals.css` — add light mode overrides
4. `src/app/layout.tsx` — add flash-prevention script + `suppressHydrationWarning`
5. `src/components/DevPanel.tsx` — create component (role switcher + theme toggle, Shift+D only)
6. `src/components/Navbar.tsx` — remove role switcher pill
7. `src/app/layout.tsx` — add `<DevPanel />`
8. Mock data audit — replace placeholder data with realistic values
9. Smoke test — 3 role flows end-to-end

---

## Out of Scope

- New features of any kind
- Real authentication
- Database integration
- Refactoring existing components
- Making light mode pixel-perfect (acceptable for validation; a full token-based theme is a post-validation task)
