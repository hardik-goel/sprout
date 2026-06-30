# 🌱 Sprout

Mobile-first web app (PWA) for Indian families with young kids (ages 2–8). Kids earn points for real-world tasks, a parent approves with a photo, points grow a garden and fill a saving jar toward kid-chosen rewards. **Points only — no real money anywhere.**

Two personas: **Parent** and **Kid**, each with its own world and navigation.

## Run it (no account, no keys needed)

```bash
npm install
npm run dev
```

Open the printed local URL on your laptop. To feel it on your phone, open the **Network** URL shown (same Wi-Fi) — the dev server is exposed on the LAN.

The app loads with **seed data** (parent Aanya, child Vir saving for a zoo trip, a 5-day streak, history) so every screen looks alive on first run.

### Try the core loop
1. **Parent Home** → there's a task "waiting for approval" (or assign more from **Tasks**).
2. Tap the floating **Kid view** button → **My Day** → tap a task → take/pick a photo → **I did it!**
3. Switch back to **Parent view** → tap the task under *Needs your approval* → **Approve**.
4. Watch the **garden grow + jar fill** celebration. 🎉

### Other things to poke
- **Upgrade to Plus** (Parent → Plus tab) flips `isPlus` locally and unlocks Insights, Digest, Family Circle, Gift Points, festival packs, multiple children.
- **Gift points** enforces a real 50 pts/week cap per family member.
- Add a reward tagged *screen* or *sweet* → see the gentle healthy-reward nudge.

## Scripts
```bash
npm run dev        # local dev server (LAN-exposed)
npm run build      # typecheck (tsc) + production build
npm run preview    # preview the production build
npm run typecheck  # types only
```

## Architecture (short)
- `src/lib/dataStore.ts` — **the swap seam.** All persistence here (localStorage + seed today; Supabase later).
- `src/lib/game.ts` — pure game logic (points, streaks, garden, jar, gift cap, age-fit).
- `src/store.ts` — Zustand store wiring logic → actions → persistence.
- `src/types.ts` — domain types.
- `src/pages/parent/*`, `src/pages/kid/*` — screens.
- `src/components/*` — shared UI.

All data is local/mock. See **PROGRESS.md** for what's stubbed and **how to swap mock → real**, and **DECISIONS.md** for why things are the way they are.

## Stack
Vite · React · TypeScript · Tailwind · Zustand · React Router · lucide-react · vite-plugin-pwa.

## Reset demo data
The app persists to `localStorage` under `sprout.appData.v1`. To start fresh, clear site data in your browser, or call `dataStore.reset()` (wired to the store's `resetAll()`).
