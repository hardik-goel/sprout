# Sprout — Progress

**Phase 1 status: complete.** Runs entirely locally (`npm install && npm run dev`), no accounts, no keys.

---

## ✅ Done — working on local data

### Architecture (the part that makes Phase 2 cheap)
- **`src/domain/`** — pure TypeScript, zero UI imports: ledger, events, garden, age-fit, rewards,
  insights, story, entitlements, dates. **146 tests, all passing** (`npm test`) — over the domain
  rules, the dictionaries, and every screen rendered with real seeded data.
- **Event-sourced points ledger** — no stored balances anywhere. Every points change is an
  append-only `LedgerEvent` (`TASK_APPROVED`, `REWARD_REDEEMED`, `POINTS_GIFTED`, `ADJUSTMENT`)
  with a client-generated UUID. Balances, jars, streaks, garden stage and the gift cap are all
  **derived** from it. Undo appends a compensating event; it never edits history.
- **`src/lib/dataStore.ts`** — the swap seam (localStorage today, Supabase in Phase 2). Writes are
  also mirrored to an **outbox** so Phase 2 sync is append-and-merge by event id.
- **`src/lib/photoStore.ts`** — separate photo seam. Photos are **compressed client-side**
  (canvas downscale to 720px + JPEG q0.72; a 4MB phone photo lands at ~100KB) and stored under
  their own keys; tasks hold only a `photoId`.
- **`src/i18n/`** — every user-facing string goes through `t('key')`. **English and Hindi both
  ship**, including the task templates and pack names (those are our content, so they translate;
  reward titles the parent typed are shown exactly as typed). A var may itself be `{ key }`, which
  is how the pure domain layer names one of our habits without owning a word of any language.
  Tests fail if a Hindi key, a placeholder or a template name goes missing.
- **`src/domain/entitlements.ts`** — the single "can this account use X?" answer. Screens ask it,
  never `isPlus` directly, so Phase 4 swaps in real subscription state with no screen changes.
- Layers: `src/domain/` (rules) → `src/lib/` (seams) → `src/store.ts` (wiring) →
  `src/features/` (screens) + `src/ui/` (design system).

### Parent screens
Onboarding · Add child (age-fit hint) · Home (goal + streak hero, needs-approval, today, done) ·
Task library (age-filtered, daily-cap hint, Plus packs locked) · Reward menu (healthy nudge with
one-tap alternatives, age-fit goal ceiling) · Approve with photo (approve / ask-to-try-again / undo) ·
Reward fulfilment (reachable from the reward menu and from the **"Still to give" queue on Home**) ·
**Points history** (the ledger read back entry by entry, with the running balance) ·
**Growth album (A1)** · **Sunday family story (A2, exports a WhatsApp-sized PNG)** ·
Habit insights [Plus] · Weekly digest [Plus] · Family circle [Plus] · Gift points [Plus] ·
Save·Spend·Give jars [Plus] · Children · **Voice cheers (A3)** · **Language (A4)** · More · Upgrade.

### Kid screens
My Day · Do task (camera + photo) · **Celebrate** (the signature moment: garden stage-up, jar fill,
confetti, the recorded voice cheer, then one button back to the real world) · My Jar (incl. three jars where eligible) ·
Garden world · Rewards shelf.

### Feature registry coverage
| Ref | Feature | State |
|---|---|---|
| F1–F12 | Free core (tasks, my day, photo proof, rewards, jar, garden, streaks, library, healthy nudge, insights, onboarding, age-fit) | ✅ |
| P1–P7 | Plus (insights, digest, circle, gift cap, multi-child, three jars, India packs) | ✅ behind `isPlus` |
| A1 | Growth Album | ✅ (free — it's the hook) |
| A2 | Sunday Family Story | ✅ (free simple / Plus rich, PNG + share + copy) |
| A3 | Voice cheers | ✅ (free — record up to 6s, rotates, plays on approval) |
| A4 | Hindi toggle | ✅ (free — chrome, generated sentences, dates and task names all translate) |

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
| Voice cheer storage | Supabase Storage | implement `AudioStore` in `src/lib/audioStore.ts` |
| Payments (Plus) | Razorpay | Upgrade screen flips a local flag only |
| Deployment | Vercel / Netlify | — |
| Analytics | Plausible / PostHog | — |
| "Invite a relative" | (needs auth) | visible, disabled stub |

Placeholders live in `.env.example`. No fake keys anywhere.

---

## 🔜 Not done / next
- The weekly digest is an in-app screen; real Sunday delivery needs Phase 3 push.
- Live camera preview (today: file input with `capture`, which opens the camera on mobile).
- No automated E2E in a real browser; the screen tests run in jsdom. The flows *were* driven by
  hand in Chrome (see the handoff note), but nothing guards them on every commit.
- The story card's PNG export now has a layout test (a recording canvas context, asserting text
  stays on the card and the stat tiles never reach the closing line). It has still never been
  exported for real — worth one manual "Save image" on the Sunday story.
- Reward titles are shown exactly as the parent typed them, so a reward added in English stays
  English after switching to Hindi. That is deliberate (it is their text, not ours) but it is a
  judgement call worth revisiting.
- The daily task cap is advisory: over the cap the library shows a warning but still lets you
  assign. Deliberate — it is a nudge, not a rule — but say so out loud before a parent finds it.

---

## 🔁 How to swap mock → real

Everything funnels through three files.

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

**3. `src/lib/audioStore.ts`** is the same shape for voice cheers — deliberately separate from
photos, because the two have different retention and belong in different buckets.

Nothing in `src/features/`, `src/ui/` or `src/domain/` should need to change.

Auth: children have no logins by design — kid mode is a device toggle inside the family account
(the persona pill at the top of the screen). RLS should scope everything to a `family_id`.
