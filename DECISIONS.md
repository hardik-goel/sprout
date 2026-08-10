# Sprout — Decisions Log

Every non-trivial choice + one-line why. Newest at top.

## Architecture (the rebuild)
- **Points are event-sourced; balances are never stored.** Every change is an append-only
  `LedgerEvent`; balance, jars, streaks, garden stage and gift caps are derived on read. Cost: a
  little compute per render (memoised). Benefit: a parent can always see *why* a balance is what it
  is, undo is a compensating event instead of a mutation, the gift cap can't drift out of sync with
  a counter, and Phase 2 sync becomes append-and-merge by event id.
- **Client-generated UUID on every event.** Replaying a queued/offline event is a no-op, so retries
  and multi-device merges can never double-count.
- **A split approval writes one event per jar, sharing `refId`.** So `approvedTaskCount` counts
  distinct `refId`s — otherwise a three-jar kid's garden would grow three times per task.
- **Derived child views are memoised in a `WeakMap` keyed on the `AppData` object.** Without this,
  `useStore(s => s.activeChild())` hands `useSyncExternalStore` a new object every render and the
  app spins. `data` is replaced immutably on write, so the cache invalidates itself.
- **`src/domain/` is pure and framework-free**, `src/lib/` holds the swappable seams, `src/store.ts`
  only wires them, `src/features/` + `src/ui/` render. The domain layer is the only part with tests
  that assert product rules, because it's the only part that *has* product rules.
- **`photoStore` split out of `dataStore`.** Different backends (Postgres row vs object storage),
  different failure modes, and it keeps the main app blob small: tasks store a `photoId`, never bytes.
- **Photos are compressed before storage** (canvas, longest edge 720px, JPEG q0.72). A 4MB phone
  photo becomes ~100KB — the difference between localStorage working and not, and later between an
  upload finishing on Indian mobile data and not.
- **`dataStore` keeps an outbox** of events not yet pushed. Nothing drains it in Phase 1; it exists
  so offline-first in Phase 2 is a drain-and-merge, not a rewrite.
- **All strings go through `t()` from day one.** English only ships, but Hindi in Phase 2 is a
  second dictionary file rather than an archaeology dig through 30 components.
- **A single `entitlements` module answers "can this account use X?"** Screens never read `isPlus`.
  Phase 4 swaps the input for subscription state and every gate keeps working.
- **A prototype-grade migration:** old `v1` localStorage data is discarded and reseeded rather than
  migrated. It's demo data; pretending otherwise would be more code and less honesty.

## Product logic
- **Garden stages** on cumulative approved tasks: seed(0) → sprout(3) → leaf(9) → plant(18) →
  tree(30). Finite, slow, and driven by real-world action — no infinite levels.
- **Flowers** unlock at best-streak milestones 3/7/14/30.
- **Streak** = consecutive days with ≥1 approved task, derived from ledger dates. A streak whose
  last day is older than yesterday reads as 0; "last active yesterday" reads as at-risk, which is
  what drives the one gentle evening nudge in Phase 3.
- **Gift cap 50/week per member per child**, enforced by summing `POINTS_GIFTED` events in the ISO
  week — in the domain, not the form. The UI also clamps the amount, but the domain is the authority.
- **Age-fit** scales five things, not one: task points (×0.5 / ×0.75 / ×1), goal ceilings
  (150/250/400), daily task cap (3/4/6), three-jar eligibility (6+), and which templates are even
  shown (`minAge`/`maxAge`). A 3-year-old's "big" goal must be days away, not weeks.
- **Three jars only from age 6**, and only on Plus. Splitting money three ways is a real cognitive
  step; offering it at three would just be confusing.
- **Jar splits use largest-remainder rounding** so the parts always sum to the whole — no point is
  ever quietly lost to `Math.floor`.
- **Redemption pays from the spend jar only if it covers the whole cost**, else from savings.
- **Healthy nudge suggests, never blocks.** Tagging a reward screen/sweet shows alternatives and the
  primary button becomes "Add anyway" — still the primary button.
- **Rewards are per-child**, with `childId: null` meaning shared. Multi-child families otherwise see
  a sibling's cricket bat in a 3-year-old's shelf.
- **"Screen-free wins"** counts approved tasks in learning/health/kindness — active alternatives to
  a screen, not simply every chore, so the number means something.
- **Reject is "ask to try again"**, which returns the task to today's list. No points are deducted;
  nothing in the app punishes a child.
- **Seed tops Vir up to exactly 90 with a visible ADJUSTMENT** ("carried over from the sticker
  chart") rather than fudging a balance, so even the demo data obeys the ledger.
- **The seeded gift is dated today, not yesterday.** Dated yesterday it lands in last week's bucket
  every Monday, and the cap looks untouched in the demo.

## UX
- **Two visual worlds**: parent = warm paper/ink/sprout; kid = deep green + glow, oversized taps,
  near-zero text. Separate bottom navs.
- **Persona switch** is a floating demo affordance — there are no child logins by design; kid mode
  is a device toggle inside the family account.
- **The animation budget goes to one moment**: approval → garden stage-up + jar fill + confetti →
  one button back to the real world. Everything else stays quiet.
- **Growth Album is free.** It's the emotional hook and the thing parents show family; putting it
  behind Plus would trade word-of-mouth for a few rupees.
- **Family Story exports a real PNG via canvas** (no dependencies, works offline) plus
  `navigator.share`/clipboard, because the WhatsApp forward is the distribution.
- Reduced-motion respected; visible focus rings; mobile-first ≤430px frame centred on desktop.

## Stack & setup
- **Vite + React + TS + Tailwind + Zustand + React Router + lucide-react**, all free/OSS, runs with
  `npm run dev` and no accounts.
- **Vitest** for tests; `environmentMatchGlobs` keeps domain tests in fast node and only screen
  tests in jsdom.
- **vite-plugin-pwa** (autoUpdate); SVG icon avoids shipping binaries.
- **`@` alias → `src/`** via `fileURLToPath(new URL(...))` (ESM-safe).
