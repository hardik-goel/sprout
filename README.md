# 🌱 Sprout

Mobile-first web app (PWA) for Indian families with young kids (ages 2–8). Kids earn points for
real-world tasks, a parent approves with a photo, points grow a garden and fill a saving jar toward
kid-chosen rewards. **Points only — no real money anywhere.**

Two personas: **Parent** and **Kid**, each with its own world and navigation.

## Run it (no account, no keys needed)

```bash
npm install
npm run dev
```

Open the printed local URL on your laptop. To feel it on your phone, open the **Network** URL shown
(same Wi-Fi) — the dev server is exposed on the LAN.

The app loads with **seed data** — parent Aanya, Vir (3) saving for a zoo trip on a 5-day streak,
Ira (6) with three jars, Dadi and Mama in the family circle, plus a week of history — so every
screen looks alive on first run.

### Try the core loop
1. **Parent Home** → there's a task *waiting for approval* (or assign more from **Tasks**).
2. Tap the floating **Kid view** button → **My Day** → tap a task → take/pick a photo → **I did it!**
3. Switch back to **Parent view** → tap the task under *Needs your approval* → **Approve**.
4. Watch the **garden grow + jar fill** celebration. 🎉 (Then try **Undo** — it appends a reversing
   ledger event rather than editing history.)

### Other things to poke
- **More → Sunday family story** — auto-written weekly recap; **Save as image** exports a
  WhatsApp-sized PNG.
- **More → Growth album** — every approved photo, chronologically. Free, on purpose.
- **Plus** (More → Sprout Plus) flips `isPlus` locally and unlocks Insights, Digest, Family circle,
  Gift points, three jars, festival packs and multiple children.
- **Gift points** enforces a real 50 pts/week cap per family member per child — keep clicking until
  it refuses.
- Add a reward tagged *screen* or *sweet* → the gentle healthy nudge with alternatives (and
  "Add anyway" is still the primary button).

## Scripts
```bash
npm run dev        # local dev server (LAN-exposed)
npm run build      # typecheck (tsc) + production build
npm test           # 94 unit + screen tests
npm run test:watch # watch mode
npm run preview    # preview the production build
npm run typecheck  # types only
```

## Architecture (short)

```
src/domain/   pure rules — no React, no I/O, fully tested
src/lib/      the swappable seams (dataStore, photoStore, storyCard)
src/store.ts  Zustand: composes domain functions, appends events, persists
src/features/ screens, by persona
src/ui/       shared design-system components
src/i18n/     every user-facing string
```

**Points are event-sourced.** No balance is stored anywhere — every change is an append-only
`LedgerEvent` (`TASK_APPROVED`, `REWARD_REDEEMED`, `POINTS_GIFTED`, `ADJUSTMENT`) with a
client-generated UUID, and balances, jars, streaks, garden stage and the gift cap are all derived
from it. That gives a full audit trail, undo without mutation, caps that can't drift, and a
Phase 2 sync model that's just "merge by event id".

Swap seams for going real: **`src/lib/dataStore.ts`** (localStorage → Supabase) and
**`src/lib/photoStore.ts`** (local + client-side compression → Supabase Storage). Nothing in
`src/domain/`, `src/features/` or `src/ui/` should need to change.

See **PROGRESS.md** for what's stubbed and exactly how to swap mock → real, and **DECISIONS.md**
for why things are the way they are.

## Phase map
| Phase | Scope | Status |
|---|---|---|
| 1 | Full working prototype on local data | ✅ done — this repo |
| 2 | Supabase (DB, auth, storage), offline sync, Hindi | needs your logins |
| 3 | Web push, voice cheers, PWA polish | needs your logins |
| 4 | Razorpay Plus, deploy, analytics | needs your logins |
| 5 | Post-launch bets (documented, not built) | — |

## Stack
Vite · React · TypeScript · Tailwind · Zustand · React Router · lucide-react · vite-plugin-pwa ·
Vitest · Testing Library.

## Reset demo data
The app persists to `localStorage` under `sprout.appData.v2` (photos under `sprout.photo.*`).
**More → Reset demo data** reseeds the family; clearing site data does the same.
