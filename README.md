# 🌱 Sprout

**A points-and-garden habit app for Indian families with kids aged 2–8.** A child does a real-world
task, photographs it, a parent approves — and the points grow a garden and fill a saving jar toward
a reward the child chose themselves.

**Points only. No real money anywhere, ever.**

Two personas, two worlds: **Parent** (warm, paper-coloured, dense with information) and **Kid**
(deep green, glowing, three taps deep at most). Runs entirely on your machine with no account, no
keys and no backend.

---

## Table of contents

- [Why it exists](#why-it-exists)
- [Quick start](#quick-start)
- [How to use it](#how-to-use-it) — every screen, what it does, how to reach it
- [Feature map](#feature-map)
- [Free vs Plus](#free-vs-plus)
- [Architecture](#architecture)
- [The event-sourced ledger](#the-event-sourced-ledger)
- [The swap seams](#the-swap-seams)
- [Internationalisation](#internationalisation)
- [Data model](#data-model)
- [Testing](#testing)
- [Scripts](#scripts)
- [Project layout](#project-layout)
- [Local data and how to reset it](#local-data-and-how-to-reset-it)
- [Phase map — what is real and what is stubbed](#phase-map--what-is-real-and-what-is-stubbed)
- [Known limitations](#known-limitations)
- [Contributing conventions](#contributing-conventions)

---

## Why it exists

Sticker charts work and then stop working. They are lost, forgotten, or the parent quietly
renegotiates the deal. Sprout is the sticker chart that keeps its promises:

- **Every point is auditable.** A parent can open **Points history** and see exactly why the balance
  is what it is — who caused each change, when, and what the running balance was after it. Nothing
  is ever edited; a correction is a new entry.
- **The reward is the child's idea.** They pick the goal; the jar fills toward *that*.
- **The loop ends.** The celebration is one screen with one button back to the real world. Nothing
  in the app rewards staying in the app.
- **Grandparents are first-class.** Dadi can gift points (capped) and record a voice cheer that
  plays when a task is approved. That is the part a family forwards to their WhatsApp group, and it
  is the part no competitor can copy — it is her actual voice.

The commercial bet is a ₹99/month **Plus** tier. The emotional hooks (growth album, family story,
voice cheers, Hindi) are deliberately **free**, because they are what gets talked about.

---

## Quick start

**Requirements:** Node 18+ and npm.

```bash
git clone <this repo>
cd sprout
npm install
npm run dev
```

Open the printed **Local** URL. To feel it properly, open the **Network** URL on your phone on the
same Wi-Fi — the dev server is LAN-exposed on purpose, and this is a mobile-first app.

The app loads with **seed data** so no screen is ever empty on first run:

| | |
|---|---|
| Parent | Aanya |
| Kids | **Vir** (3) — 90 pts, 5-day streak, saving for a 150-pt zoo trip · **Ira** (6) — three jars |
| Family | Dadi and Mama, with Dadi partway through her weekly gift cap |
| History | A week of approved tasks with photos, one task waiting for approval, one reward redeemed but not yet handed over |

---

## How to use it

### The core loop (60 seconds)

1. **Parent Home** (`/parent`) — a task sits under *Needs your approval*.
2. Tap **Kid view** (the pill at the top centre) → **My Day** → tap a task → take or pick a photo →
   **I did it!**
3. Tap **Parent view** → the task now appears under *Needs your approval* → tap it → **Approve**.
4. The garden grows, the jar fills, confetti fires, and any recorded voice cheer plays. 🎉
5. Tap **Undo this approval** to see the ledger reverse itself — by *appending* a compensating
   event, never by editing history. Check **More → Points history** to see both entries.

### Parent world

Bottom nav: **Home · Tasks · Rewards · Insights · More**.

| Screen | Route | What it does |
|---|---|---|
| **Home** | `/parent` | Child switcher, goal + streak hero, *Needs your approval*, **Still to give** (rewards paid for but not handed over), today's tasks, done today |
| **Task library** | `/parent/tasks` | Assign tasks, filtered to the child's age. Shows a daily-cap hint. Plus packs are visible but locked |
| **Reward menu** | `/parent/rewards` | Add rewards, set the child's goal. Tagging one *screen* or *sweet* triggers a gentle healthy nudge with one-tap alternatives — **"Add anyway" is still the primary button** |
| **Approve** | `/parent/approve/:taskId` | The photo, the points, and three choices: approve, ask to try again, not yet |
| **Reward fulfilment** | `/parent/reward/:rewardId` | Mark a redeemed reward as actually given |
| **Points history** | `/parent/history` | The ledger, read back entry by entry with the running balance |
| **Growth album** | `/parent/album` | Every approved photo, newest first, grouped by month. **Free** |
| **Sunday family story** | `/parent/story` | An auto-written weekly recap. **Save as image** exports a WhatsApp-sized PNG |
| **Voice cheers** | `/parent/cheers` | Record up to 6s in your own voice; it plays on approval. **Free** |
| **Language** | `/parent/language` | English ⇄ हिंदी, applied instantly across both worlds |
| **Habit insights** | `/parent/insights` | Per-habit 7-day grids and the one habit worth nudging. *Plus* |
| **Weekly digest** | `/parent/digest` | The week in four tiles. *Plus* |
| **Family circle** | `/parent/circle` | Who's in the family and what they've gifted. *Plus* |
| **Gift points** | `/parent/gift` | Relatives gift points, capped at 50/week each. *Plus* |
| **Save · Spend · Give** | `/parent/jars` | Three-jar split for kids old enough. *Plus* |
| **Children** | `/parent/children` | Switch or add a child |
| **More / Upgrade** | `/parent/more`, `/parent/upgrade` | Everything else; Plus flips a local flag |

### Kid world

Bottom nav: **My Day · Garden · My Jar · Rewards**.

| Screen | Route | What it does |
|---|---|---|
| **My Day** | `/kid` | Today's tasks, the garden and jar at a glance, and a banner when a grown-up has just approved something |
| **Do task** | `/kid/task/:taskId` | Take the photo, tap **I did it!** |
| **Celebrate** | `/kid/celebrate` | The signature moment: garden stage-up, jar fill, confetti, voice cheer — then one button out |
| **My Jar** | `/kid/jar` | Progress to the goal, three jars where eligible, spend vs save |
| **Garden** | `/kid/garden` | The garden and the flowers unlocked by streaks |
| **Rewards shelf** | `/kid/rewards` | What they can get now, and what to keep saving for |

### Things worth poking

- **Gift points** enforces a real cap. Keep clicking — it will refuse at 50.
- **Add a reward** tagged *screen* or *sweet* → the healthy nudge appears with alternatives.
- **Language → हिंदी** → then open Task library. Task names, pack names, generated story sentences
  and dates are all Hindi; a reward *you* typed stays exactly as you typed it.
- **Plus** (More → Sprout Plus) flips `isPlus` locally and unlocks the gated screens instantly.
- **Undo** an approval, then read **Points history**. The original entry is still there.

---

## Feature map

| Ref | Feature | State |
|---|---|---|
| F1–F12 | Tasks, My Day, photo proof, rewards, jar, garden, streaks, task library, healthy nudge, onboarding, age-fit | ✅ |
| P1–P7 | Insights, digest, family circle, gift cap, multi-child, three jars, India packs | ✅ behind `isPlus` |
| A1 | Growth Album | ✅ free |
| A2 | Sunday Family Story | ✅ free (simple) / Plus (rich), PNG export + share + copy |
| A3 | Voice cheers | ✅ free |
| A4 | Hindi | ✅ free |

**Age-fit is real, not decorative.** A child's age scales task points, the goal ceiling, the daily
task cap, three-jar eligibility, and which templates are even offered. A 2-year-old is never shown
"finish homework".

---

## Free vs Plus

**Free:** the whole core loop, the growth album, the family story, voice cheers, Hindi, one child.

**Plus (₹99/mo, stubbed):** habit insights, weekly digest, family circle, gifting, multiple
children, three jars, India/festival task packs, the richer story.

The line is deliberate: **everything emotional and shareable is free**, because that is the
distribution. Plus sells the analytical and multi-person surface. Whether that carries ₹99 is the
open commercial question — see `PROGRESS.md`.

---

## Architecture

```
src/domain/    pure rules — no React, no I/O, no strings. Fully tested.
src/lib/       the swappable seams: dataStore, photoStore, audioStore, storyCard
src/store.ts   Zustand — composes domain functions, appends events, persists
src/features/  screens, grouped by persona (parent / kid)
src/ui/        shared design-system components
src/i18n/      every user-facing string, en + hi
```

The dependency rule runs one way and only one way:

```
features / ui  →  store  →  lib (seams)  →  domain
                                              ↑
                                    depends on nothing
```

`src/domain/` imports no framework, touches no storage, and contains **no user-facing text**. That
is what makes it testable as *product rules* rather than as code: `streakInfo`, `splitPoints`,
`remainingGiftAllowance` and `buildFamilyStory` are functions you can reason about on paper.

**Three principles worth knowing before you change anything:**

1. **Never store a derived value.** Balances, streaks, jar totals, garden stage and gift caps are
   computed from the ledger on read. If you find yourself adding a `points` column, stop.
2. **Never edit history.** Undo and corrections *append* a compensating event.
3. **The domain doesn't speak English.** It returns i18n keys, and the UI resolves them.

---

## The event-sourced ledger

This is the load-bearing idea. Every points change is an append-only record:

```ts
interface LedgerEvent {
  id: ID                 // client-generated UUID — replays are idempotent
  type: 'TASK_APPROVED' | 'REWARD_REDEEMED' | 'POINTS_GIFTED' | 'ADJUSTMENT'
  childId: ID
  actorId: ID            // who caused it
  actorRole: 'parent' | 'relative' | 'system'
  delta: number          // signed: +earned, −spent
  at: string             // ISO timestamp
  date: string           // YYYY-MM-DD local day — drives streaks
  reason: string         // what it was called at the time
  refId: ID | null       // task id / reward id
  weekKey: string        // ISO week — the bucket the gift cap sums over
  jar?: 'save' | 'spend' | 'give'
}
```

Everything else is derived (`src/domain/ledger.ts`):

| Question | Answer |
|---|---|
| Balance? | Sum of every `delta` |
| This jar's total? | Sum of deltas tagged with that jar |
| Current streak? | Consecutive days with ≥1 `TASK_APPROVED` |
| Garden stage? | Count of **distinct `refId`s** among approvals |
| Has Dadi hit her cap? | Sum of `POINTS_GIFTED` where `actorId` + `childId` + `weekKey` match |

**Why it earns its keep:**

- **Trust.** "Why does Vir have 90 points?" has a screen, not an explanation.
- **Undo without lying.** Reversal is a compensating `ADJUSTMENT`, so the record stays true.
- **Caps that cannot drift.** The gift cap is a query, not a counter someone must remember to reset.
- **Cheap sync.** Phase 2 is `upsert … on conflict (id) do nothing` — client UUIDs make replay a
  no-op, so offline queues and multi-device merges can never double-count.

**Two traps, both already hit and fixed — don't re-introduce them:**

- A three-jar approval writes **one event per jar** sharing a `refId`. Count distinct `refId`s, or a
  three-jar child's garden grows three times per task.
- Derived child views build a fresh object each call. They are memoised in a `WeakMap` keyed on the
  `AppData` object (`src/store.ts`); without it `useSyncExternalStore` re-renders forever and the
  tab freezes. Any new object-returning selector needs the same treatment.

---

## The swap seams

Going from prototype to real means implementing three interfaces. **Nothing in `src/domain/`,
`src/features/` or `src/ui/` should need to change.**

**`src/lib/dataStore.ts`** — localStorage today, Supabase tomorrow.

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

Tables mirror `AppData` in `src/domain/types.ts`. The `ledger` table is the interesting one:
append-only, `id` is the client UUID, so sync is a conflict-free upsert. RLS should scope everything
to a `family_id`.

**`src/lib/photoStore.ts`** — `put / url / remove / clear`. Photos are already compressed
client-side (canvas downscale to 720px + JPEG q0.72; a 4MB phone photo lands around 100KB) before
`put` is called, so swapping in a Storage upload is a one-function change. Tasks hold a `photoId`,
never bytes.

**`src/lib/audioStore.ts`** — same shape, for voice cheers. Kept separate from photos on purpose:
different retention, different bucket, different lifetime.

> **Security note for Phase 2:** the 50 pts/week gift cap and the Plus entitlement checks are
> enforced in the client *and* in the store actions. That is UX, not security. The server must
> re-enforce both.

**Auth model:** children have no logins by design. Kid mode is a device toggle inside the family
account — the persona pill at the top of the screen.

---

## Internationalisation

Every user-facing string goes through `t('key')` against `src/i18n/en.ts` and `src/i18n/hi.ts`. A
missing Hindi key falls back to English key-by-key, so a partial translation degrades instead of
showing blanks.

Three things make this more than a veneer:

- **Our content translates; the family's does not.** Task templates and pack names are ours, so
  `task.title.tpl_teeth` and `pack.basics` are dictionary keys. A reward title the parent typed is
  shown exactly as typed, in any language.
- **The domain stays language-free.** A `t()` variable may itself be `{ key: '…' }`, so
  `buildFamilyStory` can say "the habit of the week was *this task*" without owning a word of any
  language.
- **Dates are language, not domain.** The domain deals only in `YYYY-MM-DD`; naming happens in
  `src/i18n/format.ts` against the active dictionary. There are deliberately **no** English-only
  date helpers in `src/domain/dates.ts` — they were removed because they were exactly the thing
  someone reaches for and quietly half-breaks Hindi with.

Tests fail loudly if a Hindi key, a placeholder, or a task-template name goes missing.

---

## Data model

`AppData` (`src/domain/types.ts`) is the whole persisted state:

| Field | Notes |
|---|---|
| `version` | Bumping `SEED_VERSION` re-seeds; demo data is not migrated |
| `locale` | `'en' \| 'hi'` |
| `parentName`, `onboarded`, `isPlus`, `activeChildId` | Account-level |
| `children` | `Child` — age, avatar, chosen `goalId`, `jarSplit` |
| `members` | Parent + relatives (the family circle) |
| `templates` | `TaskTemplate` — our content, with `packKey` for i18n |
| `tasks` | `AssignedTask` — `todo → pending → approved`, holds a `photoId` |
| `rewards` | `Reward` — cost, tags, `redeemed`, `fulfilled` |
| `cheers` | `VoiceCheer` — holds an `audioId` |
| `ledger` | **The source of truth for all points** |

---

## Testing

```bash
npm test          # 139 tests
npm run test:watch
```

Four layers, each testing something different:

| Suite | What it proves |
|---|---|
| `src/domain/__tests__/` | The product rules: ledger maths, streak breaks, jar rounding, gift cap, age-fit, garden stages, story generation, cheer rotation |
| `src/domain/__tests__/seed.test.ts` | The demo itself adds up — including that the running balance never goes negative |
| `src/i18n/__tests__/` | No missing key, no lost placeholder, no untranslated task template |
| `src/features/__tests__/` | Every route mounts with real seeded data, and the core loop runs through the actual components |
| `src/lib/__tests__/storyCard.test.ts` | The exported PNG's layout — text on the card, tiles not colliding with the closing line |

Domain tests run in plain Node; screen tests run in jsdom (see `vite.config.ts`
`environmentMatchGlobs`).

---

## Scripts

```bash
npm run dev        # dev server, exposed on the LAN so your phone can reach it
npm run build      # typecheck (tsc -b) + production build
npm run preview    # serve the production build
npm run typecheck  # types only
npm test           # unit + screen tests
npm run test:watch # watch mode
```

---

## Project layout

```
src/
  domain/          pure rules, no framework
    ledger.ts        balances, jars, streaks, gift cap — all derived
    events.ts        factories that turn an intent into ledger events
    garden.ts        stages and flower milestones
    ageFit.ts        how age scales points, goals, caps, jars
    rewards.ts       healthy nudge, jar progress, fulfilment queue
    insights.ts      week stats and per-habit grids
    story.ts         the Sunday story, as i18n keys
    cheers.ts        which voice cheer plays, and when
    entitlements.ts  the single "can this account use X?" answer
    dates.ts         YYYY-MM-DD maths, ISO weeks — no month names
  lib/             the seams
    dataStore.ts     persistence + offline outbox
    photoStore.ts    photo bytes + client-side compression
    audioStore.ts    voice-cheer bytes
    storyCard.ts     canvas → shareable PNG
    seed.ts          the demo family
  store.ts         Zustand wiring; owns no rules
  features/
    parent/          20 screens
    kid/             6 screens
  ui/              design system + layouts + persona switch
  i18n/            en.ts, hi.ts, format.ts
```

---

## Local data and how to reset it

Everything lives in `localStorage`:

| Key | Contents |
|---|---|
| `sprout.appData.v2` | The whole `AppData` blob |
| `sprout.photo.*` | Compressed task photos, one key each |
| `sprout.cheer.*` | Voice cheers, one key each |
| `sprout.outbox.v1` | Ledger events not yet synced (nothing drains this in Phase 1) |

**More → Reset demo data** reseeds the family and clears the photos and cheers with it. Clearing
site data does the same. Bumping `SEED_VERSION` in `src/lib/seed.ts` forces a reseed on next load.

---

## Phase map — what is real and what is stubbed

| Phase | Scope | Status |
|---|---|---|
| 1 | Full working prototype on local data | ✅ **this repo** |
| 2 | Supabase (DB, auth, storage), offline sync | needs your logins |
| 3 | Web push, PWA polish | needs your logins |
| 4 | Razorpay Plus, deploy, analytics | needs your logins |
| 5 | Post-launch bets | documented, not built |

| Stub | Provider | Where it plugs in |
|---|---|---|
| Database + Auth | Supabase | implement `DataStore` |
| Photo / audio storage | Supabase Storage | implement `PhotoStore` / `AudioStore` |
| Push notifications | web-push (VAPID) | not wired |
| Payments | Razorpay | Upgrade flips a local flag only |
| Deployment | Vercel / Netlify | — |
| Analytics | Plausible / PostHog | — |
| Invite a relative | needs auth | visible, disabled |

Placeholders live in `.env.example`. **No fake keys anywhere.**

---

## Known limitations

- **No backend.** Everything is one device, one browser. Clearing site data is a factory reset.
- **The weekly digest is an in-app screen.** Real Sunday delivery needs Phase 3 push.
- **The camera is a file input** with `capture`, which opens the camera on mobile — there is no live
  preview.
- **Voice cheers need a microphone permission** and a browser with `MediaRecorder`. The screen says
  so when it can't record.
- **Reward titles don't translate.** Deliberate — they're the parent's words — but a reward typed in
  English stays English after switching to Hindi.
- **The daily task cap is advisory.** Over the cap you get a warning, not a block. Deliberate; a
  nudge, not a rule.
- **PWA icons are SVG,** not PNG. Installs fine; generate real PNGs before an app-store-grade launch.
- **No E2E tests in a real browser.** Screen tests run in jsdom.

---

## Contributing conventions

- **Rules go in `src/domain/`, with a test.** If a change encodes a product decision, it does not
  belong in a component.
- **No new stored derived state.** See the ledger section.
- **No new user-facing string outside `src/i18n/`,** and add the Hindi at the same time — the test
  suite will fail otherwise.
- **New object-returning store selectors must be memoised** against the `AppData` snapshot.
- **Comments explain *why*.** The code already says what.

See **PROGRESS.md** for the current state and the mock → real playbook, **DECISIONS.md** for why
things are the way they are, and **MORNING-HANDOFF.md** for the session-by-session log including
every bug found and fixed.
