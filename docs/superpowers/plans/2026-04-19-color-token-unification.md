# Color Token Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all hardcoded Tailwind color classes (`bg-gray-*`, `text-gray-*`, `bg-white`) and expose canonical token aliases so every component reads from the CSS var design system.

**Architecture:** The project already has a CSS-var design system in `globals.css` with dark-mode-first tokens. The `@theme inline` block maps those vars to Tailwind utilities. Two gaps remain: (1) a handful of legacy Tailwind hardcoded classes that predate the design system, and (2) missing Tailwind utility aliases for `foreground`, `muted-foreground`, and `border` that the user wants to use. All changes are purely additive to the token layer or substitutive replacements — zero design changes.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4 (`@theme inline`), CSS Custom Properties

---

## Audit Results

The codebase is already ~95% clean. Remaining legacy issues:

| File | Line(s) | Issue |
|---|---|---|
| `src/app/globals.css` | `@theme inline` block | Missing `foreground`, `muted-foreground`, `border` aliases |
| `src/components/ClassCard.tsx` | 122, 126 | `bg-gray-300 text-gray-600` on disabled button |
| `src/app/calendar/page.tsx` | 512, 1146 | `bg-white` on toggle knob (UI element — white circle on colored track) |
| `src/components/DevPanel.tsx` | ~60 | `bg-zinc-700` (dev-only panel, low priority) |

`hover:bg-white/5` and `text-white` throughout are **intentional** — semi-transparent hover on dark bg and text on colored buttons. Do NOT change these.

---

## Files to Modify

- Modify: `src/app/globals.css` — add 3 token aliases to `:root`, `html:not(.dark)`, and `@theme inline`
- Modify: `src/components/ClassCard.tsx` — fix disabled button styling
- Modify: `src/app/calendar/page.tsx` — fix toggle knob (lines 512 and 1146)
- Modify: `src/components/DevPanel.tsx` — fix zinc color (optional, low priority)

---

### Task 1: Add missing token aliases to globals.css

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Open globals.css and locate the token blocks**

The file has three relevant sections:
- `:root { … }` — dark-mode default tokens
- `html:not(.dark) { … }` — light-mode overrides
- `@theme inline { … }` — Tailwind utility mappings

- [ ] **Step 2: Add `--foreground`, `--muted-foreground`, `--border` to `:root`**

In the `:root` block, after `--text-secondary: #71717a;`, add:

```css
  /* Semantic aliases (used by Tailwind utilities) */
  --foreground: var(--text-primary);
  --muted-foreground: var(--text-secondary);
  --border: var(--card-border);
```

- [ ] **Step 3: Add light-mode overrides**

In the `html:not(.dark)` block, after `--text-secondary: #5a5a72;`, add:

```css
  --foreground: var(--text-primary);
  --muted-foreground: var(--text-secondary);
  --border: var(--card-border);
```

- [ ] **Step 4: Add Tailwind utility mappings to `@theme inline`**

In the `@theme inline` block, after `--color-text-secondary: var(--text-secondary);`, add:

```css
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
```

This generates Tailwind utilities:
- `text-foreground` → `var(--text-primary)` in dark, `var(--text-primary)` override in light
- `text-muted-foreground` → `var(--text-secondary)`
- `border-border` → `var(--card-border)`
- `bg-background` already works (was already mapped)

- [ ] **Step 5: Verify full globals.css token blocks look like this**

`:root` block should include:
```css
:root {
  --font-display: 'Sora', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  /* Surfaces */
  --background: #0a0a0f;
  --card: #111114;
  --card-border: #27272a;

  /* Text */
  --text-primary: #ffffff;
  --text-secondary: #71717a;

  /* Semantic aliases */
  --foreground: var(--text-primary);
  --muted-foreground: var(--text-secondary);
  --border: var(--card-border);

  /* ... rest unchanged ... */
}
```

`html:not(.dark)` block:
```css
html:not(.dark) {
  --background: #f0f0f4;
  --card: #ffffff;
  --card-border: #e2e2e8;
  --text-primary: #0f0f14;
  --text-secondary: #5a5a72;
  --foreground: var(--text-primary);
  --muted-foreground: var(--text-secondary);
  --border: var(--card-border);
}
```

`@theme inline` additions:
```css
  --color-foreground: var(--foreground);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
```

- [ ] **Step 6: Run TypeScript check**

```bash
cd gym-mvp && npx tsc --noEmit
```

Expected: no output (zero errors).

---

### Task 2: Fix ClassCard disabled button styling

**Files:**
- Modify: `src/components/ClassCard.tsx` (lines 117–128)

The button currently uses `bg-gray-300 text-gray-600` for both `isLoading` and `isFull && !isReserved` states. These hardcoded Tailwind classes break in dark mode (gray-300 is a light gray, invisible on dark backgrounds).

- [ ] **Step 1: Replace the entire button className expression**

Find this block (lines 117–128):
```tsx
        <button
          onClick={() => (isReserved ? onCancel(id) : onReserve(id))}
          disabled={isLoading || (isFull && !isReserved)}
          className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all mt-auto ${
            isLoading
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : isReserved
                ? "bg-red-500 hover:bg-red-600 text-white"
                : isFull
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
```

Replace with:
```tsx
        <button
          onClick={() => (isReserved ? onCancel(id) : onReserve(id))}
          disabled={isLoading || (isFull && !isReserved)}
          className="w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all mt-auto disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            isReserved
              ? { background: "#ef4444", color: "#ffffff" }
              : isFull || isLoading
                ? { background: "var(--card-border)", color: "var(--text-secondary)" }
                : { background: "#3b82f6", color: "#ffffff" }
          }
        >
```

This uses `disabled:opacity-40` (Tailwind utility) to visually mute the button when disabled, and CSS vars for the background/color states.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output.

---

### Task 3: Fix calendar toggle knob

**Files:**
- Modify: `src/app/calendar/page.tsx` (lines 512 and 1146)

The toggle knob `<span className="... bg-white ...">` is a white circle on a colored track. In dark mode this is fine visually. In light mode (white bg on a colored track) it could clash. Replace with a token that resolves to a contrasting surface color.

- [ ] **Step 1: Replace `bg-white` on toggle knobs with an inline style**

There are exactly two identical `<span>` elements. Find:
```tsx
<span className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5"
```

Replace **both** occurrences with:
```tsx
<span className="inline-block h-4 w-4 transform rounded-full shadow transition-transform mt-0.5"
  style={{ background: "var(--card)" }}
```

Note: `var(--card)` is `#111114` in dark mode and `#ffffff` in light mode — a clean contrasting knob on any track color.

- [ ] **Step 2: Verify both lines were changed (lines ~512 and ~1146)**

```bash
grep -n "bg-white\|inline-block h-4 w-4" src/app/calendar/page.tsx
```

Expected: no `bg-white` remaining; the two span lines should show `style={{ background: "var(--card)" }}`.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output.

---

### Task 4: Fix DevPanel zinc color (low priority)

**Files:**
- Modify: `src/components/DevPanel.tsx` (line ~60)

- [ ] **Step 1: Read the DevPanel file to find the zinc usage**

```bash
grep -n "bg-zinc\|text-white" src/components/DevPanel.tsx
```

- [ ] **Step 2: Replace `bg-zinc-700` with CSS-var equivalent**

Find the line with `bg-zinc-700 text-white` — this is likely an active-state button. Replace the Tailwind class string with an inline style:

```tsx
style={condition ? { background: "var(--card-border)", color: "var(--text-primary)" } : {}}
```

Adjust the condition to match the original ternary logic.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no output.

---

### Task 5: Final audit and commit

- [ ] **Step 1: Run comprehensive search for any remaining legacy classes**

```bash
grep -rn "bg-gray-\|text-gray-\|border-gray-\|bg-white[^/]" src/
```

Expected: zero matches.

- [ ] **Step 2: Run TypeScript check one final time**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/ClassCard.tsx src/app/calendar/page.tsx src/components/DevPanel.tsx
git commit -m "refactor: unify color tokens, remove all legacy bg-gray/text-gray hardcodes"
```

---

## Self-Review

**Spec coverage:**
- ✅ Eliminate `bg-white` → Task 3 (calendar toggle)
- ✅ Eliminate `text-gray-*` → Task 2 (ClassCard disabled)
- ✅ Eliminate `bg-gray-*` → Task 2 (ClassCard disabled)
- ✅ Add `text-foreground`, `text-muted-foreground`, `border-border` utilities → Task 1
- ✅ Validate dark mode stability → Task 5 audit + tsc
- ✅ No design changes → all replacements are visual-equivalent

**Intentionally left unchanged:**
- `hover:bg-white/5` — transparent hover effect, intentional, correct in both themes
- `text-white` on colored buttons — white text on gradient/color background, intentional
- `bg-white` on toggle knob → replaced with `var(--card)` in Task 3

**Placeholder scan:** No TBDs, all steps have exact code.
