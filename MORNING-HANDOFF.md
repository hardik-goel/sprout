# Sprout — Morning Handoff

(The original handoff lived in the kickoff prompt, not as a repo file, so this file holds Claude Code's note back to you. See README.md, PROGRESS.md, DECISIONS.md for the rest.)

## 7. Notes from Claude Code (build session)

Good morning ☕ — here's the honest rundown, human to human.

**What I built.** The whole front-end is here and the core loop actually works on mock data: assign a task → kid marks it done with a photo → you approve → points land → the garden grows a stage and the jar fills, with a confetti celebration. Both worlds (Parent warm/paper, Kid deep-green/glow) have their own bottom nav, and there's a floating button to hop between them for demoing. Every screen on your list exists, including the Plus ones gated behind a local flag. `npm run build` is green.

**What surprised me / what I changed.**
- The signature "garden grows + jar fills" moment logically belongs at *approval* (that's when points are real), not when the kid taps "done." So the celebration fires after you approve, and I added a banner on the Kid "My Day" so the kid sees it too. Worth a gut-check that this matches how you imagined it.
- I made the seed start **already onboarded** so the demo lands straight on a populated home. First-run onboarding still works if you reset localStorage — but you won't see it unless you clear data. (Reset = clear site data, or call `resetAll()`.)
- PWA icons are **SVG**, not PNG — I won't invent binary assets, and SVG installs fine. If you want crisp store-grade icons later, generate real PNGs.
- Two build-config papercuts ate a little time: ESM `vite.config.ts` can't use `__dirname` (switched to `fileURLToPath`), and `tsc -b` needed `@types/node`. Both fixed.

**Assumptions worth double-checking.**
- Garden thresholds (3/9/18/30 approved tasks) and flower milestones (3/7/14/30 day streaks) are my guess at "reachable for a 3-year-old." Tune to taste in `src/lib/game.ts`.
- Age-fit halves points for the youngest. Vir (age 3) therefore earns small numbers — intentional, but check it feels right.
- The 50/week gift cap is enforced both in pure logic and the store action. I'd keep both when you move to a real backend (client cap is UX; server must be the real guard).

**Time / commits.** Build session ran across the evening of 2026-06-29 into the morning of **2026-06-30**, finished **~07:09 IST, 2026-06-30**. Committed as a single clean checkpoint (you'd paused me before I committed, so it's one commit rather than the many-small I'd normally do — the history starts fresh from here).

**My honest top 3 next steps.**
1. **Show it to 2–3 parents before writing any backend.** It's demoable now; their reaction to the gift-points and streak bets should drive what you build next.
2. **Then wire Supabase** (auth + DB + Storage) by implementing the `DataStore` interface in `src/lib/dataStore.ts` — that's the one seam designed to change. Budget a day or two, not ten minutes.
3. **Add unit tests for `src/lib/game.ts`** — it's pure and the riskiest logic (streak breaks, gift cap, stage math). Cheap insurance before the logic grows.

— Claude Code

---

## 8. Notes from Claude Code (second build session, 2026-08-10)

Morning ☕ — you handed me the master prompt again in a repo that already had the first session's
work in it. Rather than rebuild from scratch, I read what was there, found the gaps against the
spec, and closed them. Honest rundown:

**What was already good.** All the screens, both worlds, the core loop, the design system, the PWA
setup. That held up.

**What was missing, and is now there.**
- **The event-sourced ledger** — the spec's "architectural wow" wasn't implemented; balances and
  streaks were plain fields on the child record. That's now rebuilt properly: an append-only event
  log with client UUIDs, everything else derived. Undo is a compensating event. This was the big one
  and it touched every screen.
- **`src/domain/`** as a real pure layer (was `src/lib/game.ts`), plus `src/features/` and `src/ui/`.
- **Tests** — there were none. Now 94: 68 over the domain rules, 26 rendering every screen and
  driving the core loop, the gift cap to its ceiling, and redemption through the actual components.
- **i18n**, **entitlements**, **photo compression + photoStore seam**, **A1 Growth Album**,
  **A2 Sunday Family Story** (with a real PNG export), **P6 three jars**, per-child rewards, and
  the second seeded child (Ira, 6) that the multi-child screens were describing but didn't have.

**Two real bugs I hit, worth knowing about.**
1. Deriving the child view from the ledger returns a fresh object each call, which made
   `useSyncExternalStore` re-render forever and froze the tab. Fixed with a `WeakMap` cache keyed on
   the data snapshot (`src/store.ts`). If you ever add another derived selector that builds an
   object, memoise it the same way or you'll hit this again.
2. The seeded Dadi gift was dated *yesterday*, which on a Monday falls in the previous ISO week — so
   the demo opened with the gift cap looking untouched. Now dated today. A test catches it.

**What I could NOT verify, and you should.** I could not get a visual click-through: the Chrome
extension refuses screenshots here with "Extension manifest must request permission to access the
respective host" (it fails on example.com too, so it's the extension, not the app). I verified
programmatically instead — every route renders with real seeded data and the loop works — but
**nobody has looked at these screens with their eyes since the changes**. Grant the extension
permission for localhost, run `npm run dev`, and spend ten minutes clicking. The new screens
(album, story, jars, more) are the ones I'd look at hardest.

**Assumptions worth a gut-check.**
- Three jars unlock at age 6 and only on Plus. Debatable both ways.
- "Screen-free wins" counts learning/health/kindness tasks, not chores. It's a marketing number, so
  it should mean what you'd defend out loud.
- The Growth Album is **free**, deliberately. It's the shareable, emotional part; I think gating it
  would cost more in word-of-mouth than it earns.
- Seeded photos are inline SVG placeholders, not real photos, so the album looks a bit synthetic
  until you approve something with a real camera photo.

**Time / commits.** Single session, 2026-08-10, roughly midday. Two commits: the rebuild, then
verification + docs.

**My honest top 3 next steps.**
1. **Look at it, then show it to 2–3 parents.** Nothing in this session changed my view that the
   next real information comes from parents, not from more code.
2. **Supabase (Phase 2).** The ledger table is the interesting one — append-only, client UUID as
   primary key, so sync is `on conflict do nothing`. Everything else is straightforward rows. The
   gift cap must be re-enforced server-side; the client cap is UX, not security.
3. **Decide the Plus line before you build billing.** Right now Plus holds insights, digest, circle,
   gifting, multi-child, three jars, India packs and the rich story. That's a lot of surface to
   defend at ₹99 — I'd test whether insights + family circle alone carry it.

— Claude Code
