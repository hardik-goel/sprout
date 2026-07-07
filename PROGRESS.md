# Sprout — Progress

## ✅ Done (working on mock/local data)

**Core loop, end to end:** assign task → kid marks done + photo → parent approves → points added → garden grows + jar fills → save/redeem. Runs with `npm run dev`, nothing else.

**Parent screens**
- Onboarding (3-step intro + name)
- Add child (name, age 2–8, avatar) with age-fit goal hint
- Parent Home (saving goal + streak hero, today's tasks, needs-approval, done-today, child switcher)
- Task library (free basic packs assignable; Plus India/festival packs shown but locked)
- Reward menu (add reward, set goal, healthy-reward nudge on screen/sweet tags)
- Approve-with-photo (shows photo, approve → garden-grow confirmation)
- Reward redeemed / fulfil ("mark as given")
- Habit insights [Plus] — streaks + per-habit 7-day grids
- Weekly digest [Plus]
- Family circle [Plus]
- Gift points [Plus] — **50 pts/week cap per member enforced in logic**
- Multiple children [Plus]
- Upgrade to Plus (flips `isPlus` locally for demo)

**Kid screens**
- My Day (tasks, streak flame, garden + jar peek, celebration banner)
- Do task (mark done + take/pick photo)
- Celebrate (signature moment: garden grows + jar fills + confetti)
- My Jar (saving %, spend-now vs keep-saving)
- Garden world (stages + flower milestones)
- Rewards shelf

**Engines (real, not faked):** points, streak (with break/best), garden growth, saving jar, gift cap, healthy nudge, free/Plus gating, age-fit.

**PWA:** installable, manifest + service worker generated on build.

**Build:** `npm run build` passes clean (tsc + vite).

## 🔌 Stubbed (left for the human — needs your logins)
- **Database + Auth** → Supabase free tier. Placeholders in `.env.example`.
- **Photo cloud storage** → Supabase Storage. Currently base64 in localStorage.
- **Push notifications** → web-push (VAPID) / FCM. Not wired.
- **Deployment** → Vercel/Netlify free tier.
- **Payments (Plus)** → Razorpay. Upgrade flips a local flag only.
- **Analytics** → PostHog/Plausible (optional).
- **Invite relative** button is a visible stub.

## 🔜 Left / nice-to-have
- Unit tests for `src/lib/game.ts` (pure, ready to test).
- Live-camera capture (current = file input, opens camera on mobile).
- Per-child gift history view; reward fulfilment history.
- Real weekly-digest delivery (currently an in-app screen).

## 🔁 How to swap mock → real
All data flows through **`src/lib/dataStore.ts`** (the seam). It exposes `load() / save() / reset() / savePhoto()`. Today it's a `LocalDataStore` (localStorage + seed). To go real:
1. Create a Supabase project; set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env`.
2. Write a `SupabaseDataStore` implementing the same `DataStore` interface (tables mirror `AppData` in `src/types.ts`).
3. Implement `savePhoto(dataUrl)` to upload to a Supabase Storage bucket and return the public URL.
4. Export it as `dataStore` instead of `LocalDataStore`. The UI and game logic should not need changes.
(For real multi-user, also add auth + move the zustand `data` to load per-account.)
