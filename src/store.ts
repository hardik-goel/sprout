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
  Reward,
  RewardTag,
  TaskTemplate,
} from '@/domain/types'
import {
  adjustmentEvent,
  ageFitTaskPoints,
  appendEvent,
  approvedTaskCount,
  balance,
  defaultJarSplit,
  entitlements,
  gardenStage,
  GIFT_WEEKLY_CAP,
  jarBalances,
  lifetimeEarned,
  newId,
  normalizeSplit,
  payingJar,
  pointsGiftedEvent,
  remainingGiftAllowance,
  reverseEvents,
  rewardRedeemedEvent,
  streakInfo,
  taskApprovedEvents,
  todayKey,
  type Entitlements,
  type GardenStage,
} from '@/domain'
import { dataStore } from '@/lib/dataStore'
import { photoStore } from '@/lib/photoStore'

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
}

interface Store {
  data: AppData
  celebration: CelebrationPayload | null

  // selectors
  activeChild(): ChildView | undefined
  childById(id: string): ChildView | undefined
  childViews(): ChildView[]
  can: Entitlements

  // persistence
  persist(): void
  resetAll(): void

  // onboarding / profile
  completeOnboarding(parentName: string): void
  addChild(name: string, age: number, avatar: string): string
  setActiveChild(id: string): void
  setJarSplit(childId: string, split: JarSplit): void
  setPlus(v: boolean): void

  // tasks
  assignTask(childId: string, tpl: TaskTemplate): void
  markDone(taskId: string, photoDataUrl: string | null): Promise<void>
  approveTask(taskId: string): CelebrationPayload | null
  rejectTask(taskId: string): void
  undoApproval(taskId: string): void
  removeTask(taskId: string): void

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

  return {
    data: initial,
    celebration: null,
    can: entitlements(initial.isPlus),

    activeChild() {
      const { data } = get()
      const child = data.children.find((c) => c.id === data.activeChildId) ?? data.children[0]
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

    persist() {
      dataStore.save(get().data)
    },

    resetAll() {
      const fresh = dataStore.reset()
      set({ data: fresh, celebration: null, can: entitlements(fresh.isPlus) })
    },

    completeOnboarding(parentName) {
      set((s) => ({ data: { ...s.data, parentName, onboarded: true } }))
      get().persist()
    },

    addChild(name, age, avatar) {
      const id = newId('child')
      const child: Child = { id, name, age, avatar, goalId: null, jarSplit: defaultJarSplit(age) }
      set((s) => ({
        data: { ...s.data, children: [...s.data.children, child], activeChildId: id },
      }))
      get().persist()
      return id
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
      set((s) => ({ data: { ...s.data, isPlus: v }, can: entitlements(v) }))
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
        points: ageFitTaskPoints(tpl.basePoints, child.age),
        status: 'todo',
        date: todayKey(),
        photoId: null,
        completedAt: null,
        approvedAt: null,
      }
      set((s) => ({ data: { ...s.data, tasks: [...s.data.tasks, task] } }))
      get().persist()
    },

    async markDone(taskId, photoDataUrl) {
      let photoId: string | null = null
      if (photoDataUrl) {
        photoId = newId('photo')
        await photoStore.put(photoId, photoDataUrl)
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

      const after = get().data
      const payload: CelebrationPayload = {
        childId: child.id,
        pointsAdded: task.points,
        taskTitle: task.title,
        stagedUp: gardenStage(before) !== gardenStage(before + 1),
        newBalance: balance(after.ledger, child.id),
      }
      set({ celebration: payload })
      return payload
    },

    rejectTask(taskId) {
      // Sent back, not punished: the task returns to today's list to retry.
      set((s) => ({
        data: {
          ...s.data,
          tasks: s.data.tasks.map((t) =>
            t.id === taskId ? { ...t, status: 'todo' as const, completedAt: null } : t,
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
        tasks: d.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'pending' as const, approvedAt: null } : t,
        ),
      }))
    },

    removeTask(taskId) {
      const task = get().data.tasks.find((t) => t.id === taskId)
      if (task?.photoId) photoStore.remove(task.photoId)
      set((s) => ({ data: { ...s.data, tasks: s.data.tasks.filter((t) => t.id !== taskId) } }))
      get().persist()
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

    clearCelebration() {
      set({ celebration: null })
    },
  }
})

export { GIFT_WEEKLY_CAP, adjustmentEvent }
