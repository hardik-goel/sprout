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

---

## 9. Notes from Claude Code (third build session, 2026-08-11)

Picked this up from an interrupted session — the working tree had a half-finished Hindi
dictionary, a points-history screen and a language screen, and two failing tests. I finished
that work, then went bug-hunting across the whole app and drove it by hand in Chrome.

**The one you'd want to know about.** The seed's "Carried over from the sticker chart" entry was
computed as `90 - everythingElse`, which came out **negative** (−20) and was dated mid-history.
So the brand-new points-history screen opened with Vir's balance at **−20** and an entry claiming
a carry-over had *removed* points. Fixed by giving the seed a real opening carry-over dated before
any history, plus a real reward redemption (Vir bought the sticker pack) so the spend side of the
ledger isn't a blank. A test now walks the running balance forward and fails if it ever goes
underwater.

**Nine more, in rough order of how much they'd have hurt.**
1. **Points could be credited twice.** `markDone` accepted a task in *any* state. Going back to
   the kid's "I did it!" screen after approval and tapping again reset the task to pending — and
   the second approval credited the same points a second time. `markDone` now refuses to touch an
   approved task, and the approve screen shows the approved state instead of a dead button.
2. **The kid was dumped into the parent app.** Redeeming a reward navigated to `/parent/reward/…`
   after 1.4s — from the *kid* world. A three-year-old tapping "spend" landed in settings. The kid
   now stays put; the parent gets a **"Still to give"** queue on their home screen instead (which
   was also the missing half of the reward loop — the fulfilment screen previously had no entry
   point at all except that accidental redirect).
3. **The persona switch sat on top of the primary button.** The floating "Kid view" pill was
   pinned bottom-right and covered the celebration's "Yay! Keep going" and approve's "Not yet".
   Moved to the top centre, the one strip every screen leaves empty.
4. **Photos leaked.** "Start over" left every old photo in localStorage while the fresh seed wrote
   new ones — a few resets and you'd hit the quota. Rejecting a task orphaned its photo too. Both
   cleaned up now.
5. **The add-child route bypassed Plus.** The Children screen hid the button; the route didn't
   check. Guarded at the screen *and* at the store write.
6. **Hindi was only half a translation.** Every task name, pack name, gift-note preset and healthy
   alternative was hardcoded English, so Hindi mode read like a bilingual ransom note. Templates
   are our content, so they now translate (21 task names, 9 packs); reward titles the parent typed
   stay as typed. The domain stays language-free — it emits `{ key }` and the UI resolves it.
7. **Three English-only date formatters** were still exported from the domain, unused. They are the
   exact thing someone reaches for at 2am and quietly breaks Hindi with. Deleted.
8. **The story card could overlap itself** — long stories (Hindi wraps more) pushed the stat tiles
   onto the closing line. Clamped.
9. **Test isolation.** A failing Hindi test left the whole suite running in Hindi, which is why the
   points-history failure looked like a different bug than it was.

**What I verified with my own eyes.** Chrome, localhost, both worlds: approve → points → garden
stage → jar fill → confetti; the points history reading correctly entry by entry; the language
switch flipping the entire app including task names and dates; the growth album; the still-to-give
queue. Console is clean (I also opted into the React Router v7 flags so it stops printing two
upgrade warnings on every load). `npm run build` is green, 122 tests pass.

**What I did NOT verify.** The story card's **PNG export**. Canvas doesn't exist in jsdom and
exporting in the browser means downloading a file, which I didn't want to do unasked. It is the
one code path in the app with neither a test nor a click-through. Please tap "Save image" on the
Sunday story once, in both languages.

**One loose end for you.** `src/features/__tests__/dbg2.test.tsx` is a scratch debug test left over
from the interrupted session (I used it to isolate the seed bug). It passes and prints noise. I did
not delete it without asking — say the word.

**My honest top 3 next steps.** Unchanged from last time, and I mean it more now: (1) show it to
parents, (2) then Supabase, (3) decide the Plus line before building billing. The app is not what
is uncertain any more; the pricing and the parent reaction are.

— Claude Code

### Addendum — same session, after your "ok for both and more"

Deleted the scratch debug test, committed everything, then kept going:

- **Story card PNG export is no longer untested.** It is the one artefact that leaves the app, so it
  now has a suite that installs a *recording* canvas context and asserts geometry: every story line
  drawn, nothing past the card edge, stat tiles never reaching the closing line. I checked the test
  is real by reverting the clamp — it fails with "expected 1334 to be less than 1220". It still has
  never been exported for real; one manual "Save image" would close that.
- **A3 voice cheers built** — the last ⏭ in the feature registry, so the table is now all ✅.
  Parent (or Dadi) records up to 6 seconds; it plays on the kid's celebration and rotates by
  approval count so it stays a person rather than becoming a chime. New `audioStore` seam mirrors
  `photoStore`. Free, like the album. Autoplay refusal is handled — the cheer becomes a tap-to-hear
  button rather than being lost.
- `.gitignore`s `*.tsbuildinfo` (it was tracked and churning on every build).
- **README rewritten** — usage screen by screen, the architecture and the dependency rule, the
  ledger explained properly with the two traps we already hit, the seams, the i18n rules, the data
  model, testing layers, layout, reset instructions, and known limitations.

139 tests, tsc clean, build green.

**What I could not verify this time:** the voice-cheers screen in Chrome. The extension went
unresponsive partway through (it also stopped responding on routes that had worked ten minutes
earlier, and no Chrome renderer was pegged, so it was the tooling, not the app). The screen and the
celebration playback are covered by tests instead. Recording itself needs a real microphone tap,
which is yours to do regardless.

— Claude Code
