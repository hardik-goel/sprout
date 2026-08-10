# Sprout — Progress

**Phase 1 status: complete.** Runs entirely locally (`npm install && npm run dev`), no accounts, no keys.

---

## ✅ Done — working on local data

### Architecture (the part that makes Phase 2 cheap)
- **`src/domain/`** — pure TypeScript, zero UI imports: ledger, events, garden, age-fit, rewards,
  insights, story, entitlements, dates. **94 tests, all passing** (`npm test`) — 68 over the domain rules, 26 rendering every screen.
- **Event-sourced points ledger** — no stored balances anywhere. Every points change is an
  append-only `LedgerEvent` (`TASK_APPROVED`, `REWARD_REDEEMED`, `POINTS_GIFTED`, `ADJUSTMENT`)
  with a client-generated UUID. Balances, jars, streaks, garden stage and the gift cap are all
  **derived** from it. Undo appends a compensating event; it never edits history.
- **`src/lib/dataStore.ts`** — the swap seam (localStorage today, Supabase in Phase 2). Writes are
  also mirrored to an **outbox** so Phase 2 sync is append-and-merge by event id.
- **`src/lib/photoStore.ts`** — separate photo seam. Photos are **compressed client-side**
  (canvas downscale to 720px + JPEG q0.72; a 4MB phone photo lands at ~100KB) and stored under
  their own keys; tasks hold only a `photoId`.
- **`src/i18n/`** — every user-facing string goes through `t('key')` against `en.ts`. Hindi in
  Phase 2 is a second dictionary, not a hunt through 30 components.
- **`src/domain/entitlements.ts`** — the single "can this account use X?" answer. Screens ask it,
  never `isPlus` directly, so Phase 4 swaps in real subscription state with no screen changes.
- Layers: `src/domain/` (rules) → `src/lib/` (seams) → `src/store.ts` (wiring) →
  `src/features/` (screens) + `src/ui/` (design system).

### Parent screens
Onboarding · Add child (age-fit hint) · Home (goal + streak hero, needs-approval, today, done) ·
Task library (age-filtered, daily-cap hint, Plus packs locked) · Reward menu (healthy nudge with
one-tap alternatives, age-fit goal ceiling) · Approve with photo (approve / ask-to-try-again / undo) ·
Reward fulfilment · **Growth album (A1)** · **Sunday family story (A2, exports a WhatsApp-sized PNG)** ·
Habit insights [Plus] · Weekly digest [Plus] · Family circle [Plus] · Gift points [Plus] ·
Save·Spend·Give jars [Plus] · Children · More · Upgrade.

### Kid screens
My Day · Do task (camera + photo) · **Celebrate** (the signature moment: garden stage-up, jar fill,
confetti, then one button back to the real world) · My Jar (incl. three jars where eligible) ·
Garden world · Rewards shelf.

### Feature registry coverage
| Ref | Feature | State |
|---|---|---|
| F1–F12 | Free core (tasks, my day, photo proof, rewards, jar, garden, streaks, library, healthy nudge, insights, onboarding, age-fit) | ✅ |
| P1–P7 | Plus (insights, digest, circle, gift cap, multi-child, three jars, India packs) | ✅ behind `isPlus` |
| A1 | Growth Album | ✅ (free — it's the hook) |
| A2 | Sunday Family Story | ✅ (free simple / Plus rich, PNG + share + copy) |
| A3 | Voice cheers | ⏭ Phase 3 (needs storage) |
| A4 | Hindi toggle | ⏭ Phase 2 (i18n layer already in place) |

### Rules that are real, not decorative
Gift cap of **50 pts/week per member per child** is enforced by summing ledger events, not by a UI
counter. Age-fit scales task points, goal ceilings, daily task caps, three-jar eligibility and which
templates are even offered. Jar splits use largest-remainder rounding so no point is ever lost.

---

## 🔌 Stubbed — needs your logins (Phase 2+)
| Thing | Provider | Where it plugs in |
|---|---|---|
| Database + Auth | Supabase free tier | implement `DataStore` in `src/lib/dataStore.ts` |
| Photo storage | Supabase Storage | implement `PhotoStore` in `src/lib/photoStore.ts` |
| Push notifications | web-push (VAPID) | not wired — Phase 3 |
| Voice cheers (A3) | Supabase Storage | not built — Phase 3 |
| Payments (Plus) | Razorpay | Upgrade screen flips a local flag only |
| Deployment | Vercel / Netlify | — |
| Analytics | Plausible / PostHog | — |
| "Invite a relative" | (needs auth) | visible, disabled stub |

Placeholders live in `.env.example`. No fake keys anywhere.

---

## 🔜 Not done / next
- The weekly digest is an in-app screen; real Sunday delivery needs Phase 3 push.
- Live camera preview (today: file input with `capture`, which opens the camera on mobile).
- Per-child gift history view; reward fulfilment history.
- Hindi dictionary (`src/i18n/hi.ts` is an empty stub that falls back to English key-by-key).
- No E2E tests in a real browser; screen tests run in jsdom.
- Nobody has visually reviewed the screens since the ledger rebuild (the Chrome extension here lacks
  host permission for screenshots) — worth ten minutes of clicking.

---

## 🔁 How to swap mock → real

Everything funnels through two files.

**1. `src/lib/dataStore.ts`** implements:
```ts
interface DataStore {
  load(): AppData
  save(data: AppData): void
  reset(): AppData
  queue(events: LedgerEvent[]): void   // outbox for offline sync
  outbox(): LedgerEvent[]
  clearOutbox(): void
}
```
Write a `SupabaseDataStore` against the same interface and export it instead. Tables mirror
`AppData` in `src/domain/types.ts`; the `ledger` table is the important one — it's append-only, and
`id` is a client UUID, so sync is `upsert ... on conflict (id) do nothing`.

**2. `src/lib/photoStore.ts`** implements `put(id, dataUrl) / url(id) / remove(id)`. Swap `put` for a
Storage upload and `url` for the public URL. Compression already happens before `put` is called.

Nothing in `src/features/`, `src/ui/` or `src/domain/` should need to change.

Auth: children have no logins by design — kid mode is a device toggle inside the family account
(the floating persona switch). RLS should scope everything to a `family_id`.
