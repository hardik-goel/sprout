// The React-facing store. It owns no rules: it composes domain functions,
// appends ledger events, and persists through the dataStore seam.
//
// Note what is NOT here — no balance arithmetic, no streak counters. Those are
// derived from the ledger on read (see `childView`), so the UI can never drift
// out of sync with the history.

import { create } from 'zustand'
import type {
  AppData,
  AssignedTask,
  Child,
  JarKind,
  JarSplit,
  LedgerEvent,
  Locale,
  Reward,
  RewardTag,
  TaskCategory,
  TaskTemplate,
  VoiceCheer,
} from '@/domain/types'
import {
  adjustmentEvent,
  appendEvent,
  approvedTaskCount,
  canAddCheer,
  balance,
  clampCustomPoints,
  dayStreak,
  defaultJarSplit,
  entitlements,
  gardenStage,
  GIFT_WEEKLY_CAP,
  hashPin,
  hasPin,
  isPerfectDay,
  isValidPin,
  jarBalances,
  lifetimeEarned,
  MAX_CHEER_MS,
  newId,
  normalizeSplit,
  payingJar,
  perfectDayBonus,
  perfectDayRefId,
  pointsGiftedEvent,
  remainingGiftAllowance,
  reverseEvents,
  rewardRedeemedEvent,
  splitPoints,
  streakInfo,
  taskApprovedEvents,
  taskPointsFor,
  todayKey,
  verifyPin,
  type DayStreak,
  type KidTheme,
  type Entitlements,
  type GardenStage,
} from '@/domain'
import { applyBackupMedia, type BackupFile } from '@/lib/backup'
import { dataStore } from '@/lib/dataStore'
import { buildEmpty } from '@/lib/seed'
import { photoStore } from '@/lib/photoStore'
import { audioStore, MAX_CHEER_BYTES } from '@/lib/audioStore'
import { setMuted } from '@/lib/sfx'
import { setLocale as applyLocale, t } from '@/i18n'

/** A child plus everything derived from the ledger — what screens actually render. */
export interface ChildView extends Child {
  points: number
  lifetimePoints: number
  streak: number
  bestStreak: number
  streakAtRisk: boolean
  lastApprovedDate: string | null
  approvedCount: number
  stage: GardenStage
  jars: Record<JarKind, number>
}

export interface CelebrationPayload {
  childId: string
  pointsAdded: number
  taskTitle: string
  stagedUp: boolean
  newBalance: number
  /** Points from finishing the whole day. 0 when the day isn't finished. */
  bonusAdded: number
}

/**
 * Who is signed in right now. Deliberately NOT persisted: a lock that survives
 * a reload is a lock that is only ever asked for once, and the whole point is
 * that the phone gets handed between a parent and a child all day.
 */
export interface Session {
  parentUnlocked: boolean
  /** The child using the kid world. Null = nobody has signed in yet. */
  kidId: string | null
}

interface Store {
  data: AppData
  celebration: CelebrationPayload | null
  session: Session

  // selectors
  activeChild(): ChildView | undefined
  /** Whose kid world this is — the signed-in child, not the parent's pick. */
  kidChild(): ChildView | undefined
  childById(id: string): ChildView | undefined
  childViews(): ChildView[]
  /** Days the parent opened the app, as a streak. */
  parentStreak(): DayStreak
  can: Entitlements

  // sessions & locks (see domain/pin.ts for what a PIN is and isn't worth)
  unlockParent(pin: string): boolean
  lockParent(): void
  loginKid(childId: string, pin: string): boolean
  logoutKid(): void
  setParentPin(pin: string | null): boolean
  setChildPin(childId: string, pin: string | null): boolean
  setChildAccess(childId: string, patch: { username?: string; canSeeSiblings?: boolean }): void
  /** Called once per app open, so the parent has a streak of their own. */
  recordParentVisit(): void

  // persistence
  persist(): void
  resetAll(): void
  /** Wipe the demo family and start an empty one of your own. */
  startFresh(): void
  /** Replace everything with a previously exported backup file. */
  restoreBackup(backup: BackupFile): void

  // onboarding / profile
  completeOnboarding(parentName: string): void
  updateProfile(p: { parentName?: string; parentEmail?: string; parentPhone?: string }): void
  addChild(name: string, age: number, avatar: string): string
  /** Remove a child and everything that was only ever about them. */
  removeChild(id: string): boolean
  updateChild(id: string, patch: { name?: string; age?: number; avatar?: string }): void
  setActiveChild(id: string): void
  /** The child's own colour palette — the one thing in here they decide. */
  setChildTheme(childId: string, theme: KidTheme): void
  setSoundOn(on: boolean): void
  setJarSplit(childId: string, split: JarSplit): void
  setPlus(v: boolean): void
  setLocale(locale: Locale): void

  // tasks
  assignTask(childId: string, tpl: TaskTemplate): void
  /** A task the parent wrote themselves. Saved to the library, not just today. */
  addCustomTask(input: {
    title: string
    emoji: string
    category: TaskCategory
    points: number
  }): TaskTemplate | null
  /** Delete a custom template. Our own packs are not removable. */
  removeCustomTask(templateId: string): boolean
  /** Turn a template into part of a child's daily routine, or off again. */
  setDailyRoutine(childId: string, templateId: string, on: boolean): void
  /** Materialise today's routine tasks. Idempotent; safe to call on every open. */
  ensureTodaysTasks(): void
  markDone(taskId: string, photoDataUrl: string | null): Promise<void>
  approveTask(taskId: string): CelebrationPayload | null
  rejectTask(taskId: string): void
  undoApproval(taskId: string): void
  /** False when the task is already approved — those are reversed, not deleted. */
  removeTask(taskId: string): boolean

  // rewards
  addReward(r: { title: string; emoji: string; cost: number; tags: RewardTag[]; childId: string | null }): void
  setGoal(childId: string, rewardId: string): void
  redeemReward(childId: string, rewardId: string): boolean
  fulfillReward(rewardId: string): void

  // gifting (Plus) — the 50/week cap lives in the domain, not the form
  giftPoints(
    fromMemberId: string,
    childId: string,
    points: number,
    note: string,
  ): { ok: boolean; reason?: string }
  giftAllowance(fromMemberId: string, childId: string): number

  // voice cheers (A3)
  addCheer(memberId: string, childId: string | null, dataUrl: string, durationMs: number): Promise<boolean>
  removeCheer(cheerId: string): void

  clearCelebration(): void
}

/**
 * Derived views are recomputed from the ledger, which means a fresh object
 * every call — and `useStore(s => s.activeChild())` would then hand
 * useSyncExternalStore a new snapshot on every render and spin forever.
 *
 * So views are memoised against the AppData object itself. `data` is replaced
 * immutably on every write, so a new snapshot invalidates the cache for free
 * and identity stays stable while nothing changes.
 */
const viewCache = new WeakMap<AppData, Map<string, ChildView>>()
const listCache = new WeakMap<AppData, ChildView[]>()
// Same trap, same fix: `dayStreak` builds a fresh object every call, and an
// uncached one handed to useSyncExternalStore re-renders forever.
const parentStreakCache = new WeakMap<AppData, DayStreak>()

function viewOf(data: AppData, child: Child): ChildView {
  let perChild = viewCache.get(data)
  if (!perChild) {
    perChild = new Map()
    viewCache.set(data, perChild)
  }
  const hit = perChild.get(child.id)
  if (hit) return hit
  const fresh = computeView(data, child)
  perChild.set(child.id, fresh)
  return fresh
}

function computeView(data: AppData, child: Child): ChildView {
  const s = streakInfo(data.ledger, child.id)
  const approvedCount = approvedTaskCount(data.ledger, child.id)
  return {
    ...child,
    points: balance(data.ledger, child.id),
    lifetimePoints: lifetimeEarned(data.ledger, child.id),
    streak: s.current,
    bestStreak: s.best,
    streakAtRisk: s.atRisk,
    lastApprovedDate: s.lastActiveDate,
    approvedCount,
    stage: gardenStage(approvedCount),
    jars: jarBalances(data.ledger, child.id),
  }
}

export const useStore = create<Store>((set, get) => {
  const initial = dataStore.load()
  applyLocale(initial.locale)
  setMuted(initial.soundOn === false)

  /** Append events, persist, and queue them for a future server sync. */
  const commit = (events: LedgerEvent[], mutate?: (d: AppData) => AppData) => {
    set((s) => {
      let ledger = s.data.ledger
      for (const e of events) ledger = appendEvent(ledger, e)
      const next = { ...s.data, ledger }
      return { data: mutate ? mutate(next) : next }
    })
    dataStore.queue(events)
    dataStore.save(get().data)
  }

  const parentActor = (d: AppData) => ({
    actorId: d.members.find((m) => m.role === 'parent')?.id ?? 'parent',
    actorRole: 'parent' as const,
  })

  /**
   * Pay the finish-the-day bonus if the day is now complete and hasn't already
   * been paid. Returns what was paid, so the celebration can announce it.
   *
   * Split across the jars like earned points, because that is what it is: the
   * child earned it. Dated today rather than back-dated to the task's day —
   * the refId still carries the day, so it can never be paid twice.
   */
  const awardPerfectDayBonus = (childId: string, date: string): number => {
    const data = get().data
    const child = data.children.find((c) => c.id === childId)
    if (!child) return 0
    const todays = data.tasks.filter((task) => task.childId === childId && task.date === date)
    if (!isPerfectDay(todays)) return 0

    // Net, not "has one ever been written": a day that was finished, undone and
    // finished again has a paid bonus *and* its reversal, and deserves it back.
    const refId = perfectDayRefId(childId, date)
    const netPaid = data.ledger
      .filter((e) => e.refId === refId)
      .reduce((sum, e) => sum + e.delta, 0)
    if (netPaid > 0) return 0

    const bonus = perfectDayBonus(child.age)
    const perJar = splitPoints(bonus, child.jarSplit)
    const events = (Object.keys(perJar) as JarKind[])
      .filter((jar) => perJar[jar] > 0)
      .map((jar) =>
        adjustmentEvent(childId, perJar[jar], t('bonus.perfectDay.reason'), parentActor(data), {
          refId,
          jar,
        }),
      )
    commit(events)
    return bonus
  }

  /** Undoing the last approval of a finished day takes the bonus back with it. */
  const revokePerfectDayBonus = (childId: string, date: string) => {
    const data = get().data
    const todays = data.tasks.filter((task) => task.childId === childId && task.date === date)
    if (isPerfectDay(todays)) return
    const refId = perfectDayRefId(childId, date)
    const paid = data.ledger.filter((e) => e.refId === refId)
    if (paid.length === 0) return
    // Already reversed once? Then the sum is zero and there is nothing to undo.
    if (paid.reduce((sum, e) => sum + e.delta, 0) === 0) return
    commit(reverseEvents(paid, t('bonus.perfectDay.undone'), parentActor(data)))
  }

  return {
    data: initial,
    celebration: null,
    session: { parentUnlocked: !hasPin(initial.parentPinHash), kidId: null },
    can: entitlements(initial.isPlus),

    activeChild() {
      const { data } = get()
      const child = data.children.find((c) => c.id === data.activeChildId) ?? data.children[0]
      return child ? viewOf(data, child) : undefined
    },

    /**
     * The kid world always belongs to whoever signed in there. Falling back to
     * the parent's selection keeps a family that never set up PINs working
     * exactly as before — a lock nobody asked for should be invisible.
     */
    kidChild() {
      const { data, session } = get()
      const child = session.kidId
        ? data.children.find((c) => c.id === session.kidId)
        : (data.children.find((c) => c.id === data.activeChildId) ?? data.children[0])
      return child ? viewOf(data, child) : undefined
    },
    childById(id) {
      const { data } = get()
      const child = data.children.find((c) => c.id === id)
      return child ? viewOf(data, child) : undefined
    },
    childViews() {
      const { data } = get()
      const hit = listCache.get(data)
      if (hit) return hit
      const fresh = data.children.map((c) => viewOf(data, c))
      listCache.set(data, fresh)
      return fresh
    },

    parentStreak() {
      const { data } = get()
      const hit = parentStreakCache.get(data)
      if (hit) return hit
      const fresh = dayStreak(data.parentDays ?? [])
      parentStreakCache.set(data, fresh)
      return fresh
    },

    // --- sessions & locks ---------------------------------------------------

    unlockParent(pin) {
      const ok = verifyPin(pin, get().data.parentPinHash)
      if (ok) set((s) => ({ session: { ...s.session, parentUnlocked: true } }))
      return ok
    },

    lockParent() {
      // Called on the way *into* the kid world. Without this the parent world
      // stays open behind the child all afternoon, and the lock is theatre.
      const { data } = get()
      if (!hasPin(data.parentPinHash)) return
      set((s) => ({ session: { ...s.session, parentUnlocked: false } }))
    },

    loginKid(childId, pin) {
      const child = get().data.children.find((c) => c.id === childId)
      if (!child) return false
      if (!verifyPin(pin, child.pinHash)) return false
      set((s) => ({ session: { ...s.session, kidId: childId } }))
      return true
    },

    logoutKid() {
      set((s) => ({ session: { ...s.session, kidId: null } }))
    },

    setParentPin(pin) {
      if (pin !== null && !isValidPin(pin)) return false
      set((s) => ({
        data: { ...s.data, parentPinHash: pin === null ? null : hashPin(pin) },
        // Whoever just set it is obviously already inside.
        session: { ...s.session, parentUnlocked: true },
      }))
      get().persist()
      return true
    },

    setChildPin(childId, pin) {
      if (pin !== null && !isValidPin(pin)) return false
      set((s) => ({
        data: {
          ...s.data,
          children: s.data.children.map((c) =>
            c.id === childId ? { ...c, pinHash: pin === null ? null : hashPin(pin) } : c,
          ),
        },
      }))
      get().persist()
      return true
    },

    setChildAccess(childId, patch) {
      set((s) => ({
        data: {
          ...s.data,
          children: s.data.children.map((c) =>
            c.id === childId
              ? {
                  ...c,
                  username: patch.username === undefined ? c.username : patch.username.trim(),
                  canSeeSiblings: patch.canSeeSiblings ?? c.canSeeSiblings,
                }
              : c,
          ),
        },
      }))
      get().persist()
    },

    recordParentVisit() {
      const today = todayKey()
      const days = get().data.parentDays ?? []
      if (days[days.length - 1] === today || days.includes(today)) return
      // Keep a year. This is a streak, not an audit log — the ledger is where
      // history that has to be exact lives.
      const next = [...days, today].slice(-370)
      set((s) => ({ data: { ...s.data, parentDays: next } }))
      get().persist()
    },

    persist() {
      dataStore.save(get().data)
    },

    resetAll() {
      const fresh = dataStore.reset()
      applyLocale(fresh.locale)
      set({
        data: fresh,
        celebration: null,
        session: { parentUnlocked: true, kidId: null },
        can: entitlements(fresh.isPlus),
      })
    },

    startFresh() {
      photoStore.clear()
      audioStore.clear()
      const empty = buildEmpty()
      applyLocale(empty.locale)
      dataStore.save(empty)
      dataStore.clearOutbox()
      set({
        data: empty,
        celebration: null,
        session: { parentUnlocked: true, kidId: null },
        can: entitlements(empty.isPlus),
      })
    },

    restoreBackup(backup) {
      // Media is written first: if the quota bites, the app still comes back
      // with its history intact and some pictures missing, which is a far
      // better failure than data that references photos that never landed.
      const data = applyBackupMedia(backup)
      applyLocale(data.locale)
      dataStore.save(data)
      dataStore.clearOutbox() // the outbox belongs to the run that just ended
      set({
        data,
        celebration: null,
        session: { parentUnlocked: !hasPin(data.parentPinHash), kidId: null },
        can: entitlements(data.isPlus),
      })
    },

    completeOnboarding(parentName) {
      set((s) => ({
        data: {
          ...s.data,
          parentName,
          onboarded: true,
          createdAt: s.data.createdAt ?? new Date().toISOString(),
          // A fresh family starts with one unnamed parent member. Naming them
          // here is what keeps the family circle and gifting from showing a
          // blank row on day one.
          members: s.data.members.map((m) =>
            m.role === 'parent' && !m.name.trim() ? { ...m, name: parentName } : m,
          ),
        },
      }))
      get().persist()
    },

    updateProfile(p) {
      set((s) => ({
        data: {
          ...s.data,
          // A name is how the app greets them; blanking it would leave "Hi, ".
          parentName: p.parentName?.trim() ? p.parentName.trim() : s.data.parentName,
          // Contact details are optional, so an empty string means "remove it"
          // rather than "leave it alone".
          parentEmail: p.parentEmail === undefined ? s.data.parentEmail : p.parentEmail.trim(),
          parentPhone: p.parentPhone === undefined ? s.data.parentPhone : p.parentPhone.trim(),
        },
      }))
      get().persist()
    },

    addChild(name, age, avatar) {
      // Guard the write, not just the button — the add-child route is reachable
      // directly. (Phase 2: the server must re-check this too.)
      const { data, can } = get()
      if (!can.canAddChild(data.children.length)) return ''
      const id = newId('child')
      const child: Child = { id, name, age, avatar, goalId: null, jarSplit: defaultJarSplit(age) }
      set((s) => ({
        data: { ...s.data, children: [...s.data.children, child], activeChildId: id },
      }))
      get().persist()
      return id
    },

    /**
     * Removing a child is not an edit to history — it is removing the person
     * the history was about. Everything that only ever meant something in
     * relation to them goes with it: their tasks and photos, the rewards that
     * were theirs alone, cheers recorded for them, and their ledger. Shared
     * rewards (`childId === null`) and family members stay, because they
     * belong to the family and not to one child.
     *
     * This is the only delete in the app that touches the ledger, which is
     * why it is behind a confirmation that names what is about to go.
     */
    removeChild(childId) {
      const { data } = get()
      if (!data.children.some((c) => c.id === childId)) return false

      for (const task of data.tasks) {
        if (task.childId === childId && task.photoId) photoStore.remove(task.photoId)
      }
      for (const cheer of data.cheers) {
        if (cheer.childId === childId) audioStore.remove(cheer.audioId)
      }
      // Queued events for a deleted child must never reach a server later.
      dataStore.unqueue((e) => e.childId === childId)

      set((s) => {
        const children = s.data.children.filter((c) => c.id !== childId)
        return {
          data: {
            ...s.data,
            children,
            activeChildId:
              s.data.activeChildId === childId ? (children[0]?.id ?? null) : s.data.activeChildId,
            tasks: s.data.tasks.filter((t) => t.childId !== childId),
            rewards: s.data.rewards.filter((r) => r.childId !== childId),
            cheers: s.data.cheers.filter((c) => c.childId !== childId),
            ledger: s.data.ledger.filter((e) => e.childId !== childId),
          },
        }
      })
      get().persist()
      return true
    },

    updateChild(id, patch) {
      set((s) => ({
        data: {
          ...s.data,
          children: s.data.children.map((c) => {
            if (c.id !== id) return c
            const age = patch.age ?? c.age
            return {
              ...c,
              name: patch.name?.trim() ? patch.name.trim() : c.name,
              age,
              avatar: patch.avatar ?? c.avatar,
              // Growing past 6 unlocks three jars; growing under it must not
              // leave a split the age band no longer supports.
              jarSplit: age === c.age ? c.jarSplit : defaultJarSplit(age),
            }
          }),
        },
      }))
      get().persist()
    },

    setChildTheme(childId, theme) {
      set((s) => ({
        data: {
          ...s.data,
          children: s.data.children.map((c) => (c.id === childId ? { ...c, theme } : c)),
        },
      }))
      get().persist()
    },

    setSoundOn(on) {
      setMuted(!on)
      set((s) => ({ data: { ...s.data, soundOn: on } }))
      get().persist()
    },

    setActiveChild(id) {
      set((s) => ({ data: { ...s.data, activeChildId: id } }))
      get().persist()
    },

    setJarSplit(childId, split) {
      const normalized = normalizeSplit(split)
      set((s) => ({
        data: {
          ...s.data,
          children: s.data.children.map((c) =>
            c.id === childId ? { ...c, jarSplit: normalized } : c,
          ),
        },
      }))
      get().persist()
    },

    setPlus(v) {
      set((s) => ({
        data: {
          ...s.data,
          isPlus: v,
          // Kept so the account screen can say since when, and so a downgrade
          // is visible rather than silent.
          plusSince: v ? (s.data.plusSince ?? new Date().toISOString()) : null,
        },
        can: entitlements(v),
      }))
      get().persist()
    },

    setLocale(locale) {
      // Apply immediately as well as on the next render, so anything that calls
      // `t()` outside a component (share text, exported card) is never a beat
      // behind the state.
      applyLocale(locale)
      set((s) => ({ data: { ...s.data, locale } }))
      get().persist()
    },

    assignTask(childId, tpl) {
      const child = get().data.children.find((c) => c.id === childId)
      if (!child) return
      const task: AssignedTask = {
        id: newId('task'),
        childId,
        templateId: tpl.id,
        title: tpl.title,
        emoji: tpl.emoji,
        points: taskPointsFor(tpl, child.age),
        status: 'todo',
        date: todayKey(),
        photoId: null,
        completedAt: null,
        approvedAt: null,
      }
      set((s) => ({ data: { ...s.data, tasks: [...s.data.tasks, task] } }))
      get().persist()
    },

    addCustomTask(input) {
      const title = input.title.trim()
      if (!title) return null
      const tpl: TaskTemplate = {
        id: newId('tpl'),
        title,
        emoji: input.emoji,
        category: input.category,
        basePoints: clampCustomPoints(input.points),
        pack: 'custom',
        packName: 'Our own tasks',
        packKey: 'pack.custom',
        // Their task, their call on who it suits — a custom task is offered for
        // every child rather than filtered out of the library by our age rules.
        minAge: 2,
        maxAge: 8,
      }
      set((s) => ({ data: { ...s.data, templates: [...s.data.templates, tpl] } }))
      get().persist()
      return tpl
    },

    removeCustomTask(templateId) {
      const tpl = get().data.templates.find((x) => x.id === templateId)
      if (!tpl || tpl.pack !== 'custom') return false
      // Tasks already assigned from it keep their own copy of the title, emoji
      // and points, so removing the template never rewrites a day that already
      // happened — it only stops it being offered again.
      set((s) => ({
        data: { ...s.data, templates: s.data.templates.filter((x) => x.id !== templateId) },
      }))
      get().persist()
      return true
    },

    setDailyRoutine(childId, templateId, on) {
      set((s) => ({
        data: {
          ...s.data,
          children: s.data.children.map((c) => {
            if (c.id !== childId) return c
            const current = c.dailyTemplateIds ?? []
            return {
              ...c,
              dailyTemplateIds: on
                ? current.includes(templateId)
                  ? current
                  : [...current, templateId]
                : current.filter((id) => id !== templateId),
            }
          }),
        },
      }))
      get().persist()
      if (on) get().ensureTodaysTasks()
    },

    ensureTodaysTasks() {
      const { data } = get()
      const today = todayKey()
      const fresh: AssignedTask[] = []

      for (const child of data.children) {
        for (const templateId of child.dailyTemplateIds ?? []) {
          const tpl = data.templates.find((x) => x.id === templateId)
          if (!tpl) continue // a routine whose template was deleted just stops
          const already = data.tasks.some(
            (task) =>
              task.childId === child.id && task.date === today && task.templateId === templateId,
          )
          if (already) continue
          fresh.push({
            id: newId('task'),
            childId: child.id,
            templateId: tpl.id,
            title: tpl.title,
            emoji: tpl.emoji,
            points: taskPointsFor(tpl, child.age),
            status: 'todo',
            date: today,
            photoId: null,
            completedAt: null,
            approvedAt: null,
          })
        }
      }

      if (fresh.length === 0) return // no write, so no re-render
      set((s) => ({ data: { ...s.data, tasks: [...s.data.tasks, ...fresh] } }))
      get().persist()
    },

    async markDone(taskId, photoDataUrl) {
      const existing = get().data.tasks.find((t) => t.id === taskId)
      // An approved task must not fall back to "pending": its points are already
      // in the ledger, and approving a second time would credit them twice.
      // Reversing an approval is `undoApproval`, which appends a compensating
      // event — this path never rewrites history.
      if (!existing || existing.status === 'approved') return

      let photoId: string | null = existing.photoId
      if (photoDataUrl) {
        photoId = newId('photo')
        await photoStore.put(photoId, photoDataUrl)
        // Re-doing a task replaces its proof; drop the old bytes.
        if (existing.photoId && existing.photoId !== photoId) {
          photoStore.remove(existing.photoId)
        }
      }
      set((s) => ({
        data: {
          ...s.data,
          tasks: s.data.tasks.map((t) =>
            t.id === taskId
              ? { ...t, status: 'pending', photoId, completedAt: new Date().toISOString() }
              : t,
          ),
        },
      }))
      get().persist()
    },

    approveTask(taskId) {
      const state = get()
      const task = state.data.tasks.find((t) => t.id === taskId)
      if (!task || task.status === 'approved') return null
      const child = state.data.children.find((c) => c.id === task.childId)
      if (!child) return null

      const before = approvedTaskCount(state.data.ledger, child.id)
      const events = taskApprovedEvents(task, child.jarSplit, {
        actorId: state.data.members.find((m) => m.role === 'parent')?.id ?? 'parent',
        actorRole: 'parent',
      })

      commit(events, (d) => ({
        ...d,
        tasks: d.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: 'approved' as const, approvedAt: new Date().toISOString() }
            : t,
        ),
      }))

      // Finishing the whole day pays one extra task's worth, once.
      const bonusAdded = awardPerfectDayBonus(child.id, task.date)

      const after = get().data
      const payload: CelebrationPayload = {
        childId: child.id,
        pointsAdded: task.points,
        taskTitle: task.title,
        stagedUp: gardenStage(before) !== gardenStage(before + 1),
        newBalance: balance(after.ledger, child.id),
        bonusAdded,
      }
      set({ celebration: payload })
      return payload
    },

    rejectTask(taskId) {
      // Sent back, not punished: the task returns to today's list to retry.
      // The rejected photo goes with it — keeping it would leave bytes in
      // storage that nothing can ever show again.
      const task = get().data.tasks.find((t) => t.id === taskId)
      if (task?.photoId) photoStore.remove(task.photoId)
      set((s) => ({
        data: {
          ...s.data,
          tasks: s.data.tasks.map((t) =>
            t.id === taskId
              ? { ...t, status: 'todo' as const, completedAt: null, photoId: null }
              : t,
          ),
        },
      }))
      get().persist()
    },

    undoApproval(taskId) {
      const { data } = get()
      const task = data.tasks.find((t) => t.id === taskId)
      if (!task || task.status !== 'approved') return
      const original = data.ledger.filter((e) => e.type === 'TASK_APPROVED' && e.refId === taskId)
      const parentId = data.members.find((m) => m.role === 'parent')?.id ?? 'parent'
      const reversals = reverseEvents(original, `Undo: ${task.title}`, {
        actorId: parentId,
        actorRole: 'parent',
      })
      commit(reversals, (d) => ({
        ...d,
        tasks: d.tasks.map((x) =>
          x.id === taskId ? { ...x, status: 'pending' as const, approvedAt: null } : x,
        ),
      }))
      // The day is no longer finished, so the finish-the-day bonus goes back
      // too — by appending its reversal, like every other correction here.
      revokePerfectDayBonus(task.childId, task.date)
    },

    removeTask(taskId) {
      const task = get().data.tasks.find((t) => t.id === taskId)
      if (!task) return false
      // An approved task is referenced by its ledger events (`refId`) and by the
      // growth album. Deleting it would leave points whose reason no longer
      // exists and a hole in the album. Approvals are reversed with
      // `undoApproval`, which appends rather than deletes; only an unapproved
      // task is really just a plan that changed.
      if (task.status === 'approved') return false

      if (task.photoId) photoStore.remove(task.photoId)
      set((s) => ({ data: { ...s.data, tasks: s.data.tasks.filter((t) => t.id !== taskId) } }))
      get().persist()
      return true
    },

    addReward(r) {
      const reward: Reward = {
        ...r,
        id: newId('rw'),
        redeemed: false,
        redeemedAt: null,
        fulfilled: false,
      }
      set((s) => ({ data: { ...s.data, rewards: [...s.data.rewards, reward] } }))
      get().persist()
    },

    setGoal(childId, rewardId) {
      set((s) => ({
        data: {
          ...s.data,
          children: s.data.children.map((c) => (c.id === childId ? { ...c, goalId: rewardId } : c)),
        },
      }))
      get().persist()
    },

    redeemReward(childId, rewardId) {
      const { data } = get()
      const reward = data.rewards.find((r) => r.id === rewardId)
      if (!reward || reward.redeemed) return false
      if (balance(data.ledger, childId) < reward.cost) return false
      const jar = payingJar(data.ledger, childId, reward.cost)
      const event = rewardRedeemedEvent(reward, childId, jar, {
        actorId: data.members.find((m) => m.role === 'parent')?.id ?? 'parent',
        actorRole: 'parent',
      })
      commit([event], (d) => ({
        ...d,
        rewards: d.rewards.map((r) =>
          r.id === rewardId
            ? { ...r, redeemed: true, redeemedAt: new Date().toISOString() }
            : r,
        ),
        children: d.children.map((c) =>
          c.id === childId && c.goalId === rewardId ? { ...c, goalId: null } : c,
        ),
      }))
      return true
    },

    fulfillReward(rewardId) {
      set((s) => ({
        data: {
          ...s.data,
          rewards: s.data.rewards.map((r) => (r.id === rewardId ? { ...r, fulfilled: true } : r)),
        },
      }))
      get().persist()
    },

    giftPoints(fromMemberId, childId, points, note) {
      if (points <= 0) return { ok: false, reason: 'gift.error.zero' }
      const { data } = get()
      const allowance = remainingGiftAllowance(data.ledger, fromMemberId, childId)
      if (points > allowance) return { ok: false, reason: 'gift.error.cap' }
      const member = data.members.find((m) => m.id === fromMemberId)
      if (!member) return { ok: false, reason: 'gift.error.member' }
      const event = pointsGiftedEvent(childId, points, note, {
        actorId: fromMemberId,
        actorRole: member.role,
      })
      commit([event])
      return { ok: true }
    },

    giftAllowance(fromMemberId, childId) {
      return remainingGiftAllowance(get().data.ledger, fromMemberId, childId)
    },

    async addCheer(memberId, childId, dataUrl, durationMs) {
      const { data } = get()
      // Two guards, both about localStorage rather than product policy: a cap
      // on how many we keep, and a cap on how big one may be.
      if (!canAddCheer(data.cheers)) return false
      if (dataUrl.length > MAX_CHEER_BYTES) return false

      const audioId = newId('audio')
      await audioStore.put(audioId, dataUrl)
      const cheer: VoiceCheer = {
        id: newId('cheer'),
        audioId,
        memberId,
        childId,
        durationMs: Math.min(durationMs, MAX_CHEER_MS),
        createdAt: new Date().toISOString(),
      }
      set((s) => ({ data: { ...s.data, cheers: [...s.data.cheers, cheer] } }))
      get().persist()
      return true
    },

    removeCheer(cheerId) {
      const cheer = get().data.cheers.find((c) => c.id === cheerId)
      if (cheer) audioStore.remove(cheer.audioId)
      set((s) => ({ data: { ...s.data, cheers: s.data.cheers.filter((c) => c.id !== cheerId) } }))
      get().persist()
    },

    clearCelebration() {
      set({ celebration: null })
    },
  }
})

export { GIFT_WEEKLY_CAP, adjustmentEvent }
