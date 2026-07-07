# Sprout — Decisions Log

Every non-trivial choice + one-line why. Newest at top.

## Stack & setup
- **Vite + React + TS** — fast local dev, no account needed, per kickoff spec.
- **Tailwind CSS** (v3.4) — design system tokens map cleanly to `tailwind.config.js`.
- **Zustand** for state — single store, no boilerplate, easy persistence hook.
- **React Router v6** — nested layouts give Parent/Kid worlds their own bottom nav.
- **vite-plugin-pwa** (autoUpdate) — installable on phone; SVG icon avoids shipping binary PNGs.
- **`@` alias → `src/`** via `fileURLToPath(new URL(...))` (ESM-safe; `__dirname` unavailable in ESM config).
- **`@types/node`** added so `vite.config.ts` typechecks under `tsc -b`.

## Architecture
- **`src/lib/dataStore.ts` is the single swap seam.** All persistence goes through it. Today: localStorage + seed. To go real: implement same interface against Supabase. Nothing else should need to change much.
- **Photos = base64 data URLs** stored inline in localStorage. No cloud storage. `dataStore.savePhoto()` is the seam (currently returns the data URL unchanged).
- **Pure game logic in `src/lib/game.ts`** (points, streaks, garden stages, jar, gift cap, age-fit) — deterministic, framework-free, trivially testable later.
- **Zustand store (`src/store.ts`)** wires logic → actions → persistence. Every mutating action calls `persist()`.

## Product logic
- **Garden stages** keyed on cumulative *approved task count*: seed(0) → sprout(3) → leaf(9) → plant(18) → tree(30). Round numbers, reachable for young kids.
- **Flowers** unlock at *best-streak* milestones: 3, 7, 14, 30 days.
- **Streak** increments when ≥1 task approved on a new day; resets to 1 after a gap; `effectiveStreak()` shows 0 if last approval was before yesterday (stale).
- **Age-fit**: younger → fewer points per task (×0.5 for ≤3, ×0.75 for ≤5) and smaller goal ceilings (150/250/400). Keeps the jar feeling reachable.
- **Gift cap**: 50 pts/week per member→child, enforced in `game.ts` (`remainingGiftAllowance`) AND in the store action. ISO-week key.
- **Healthy nudge**: rewards tagged `screen`/`sweet` trigger a gentle, non-blocking nudge in the reward form.
- **Free vs Plus**: single local `isPlus` flag (default false). `PlusGate` wraps Plus screens; Upgrade screen flips the flag for demo. No payment.
- **First child free; additional children are Plus.** Multiple-children switching lives on Parent Home + Children screen.

## UX
- **Two visual worlds**: Parent = warm paper/ink/sprout; Kid = deep green gradient + glow. Separate bottom navs.
- **Persona switch**: floating button (demo affordance) to hop Parent↔Kid without auth.
- **Signature moment**: `Celebrate` screen animates garden grow + jar fill + confetti on approval. Reachable from parent Approve flow and a Kid "My Day" banner.
- **Seed starts onboarded** so the demo lands on a live, populated home immediately.
- Reduced-motion respected (global CSS); visible focus rings; mobile-first ≤430px frame centered on desktop.
