import { create } from 'zustand'
import type { AppData, AssignedTask, Child, Reward, TaskTemplate } from '@/types'
import { dataStore } from '@/lib/dataStore'
import { todayKey, weekKey } from '@/lib/dates'
import {
  ageFitTaskPoints,
  applyStreakOnApproval,
  GIFT_WEEKLY_CAP,
  remainingGiftAllowance,
} from '@/lib/game'

let idc = 1000
const newId = (p: string) => `${p}_${(idc++).toString(36)}_${Date.now().toString(36)}`

interface CelebrationPayload {
  childId: string
  pointsAdded: number
  taskTitle: string
}

interface Store {
  data: AppData
  // last celebration to play on the kid celebration screen
  celebration: CelebrationPayload | null

  // selectors
  activeChild(): Child | undefined
  childById(id: string): Child | undefined

  // persistence
  persist(): void
  resetAll(): void

  // onboarding / profile
  completeOnboarding(parentName: string): void
  addChild(name: string, age: number, avatar: string): string
  setActiveChild(id: string): void

  // plus gating
  setPlus(v: boolean): void

  // tasks
  assignTask(childId: string, tpl: TaskTemplate): void
  markDone(taskId: string, photo: string | null): void
  approveTask(taskId: string): CelebrationPayload | null
  removeTask(taskId: string): void

  // rewards
  addReward(r: Omit<Reward, 'id' | 'redeemed' | 'redeemedAt' | 'fulfilled'>): void
  setGoal(childId: string, rewardId: string): void
  redeemReward(childId: string, rewardId: string): boolean
  fulfillReward(rewardId: string): void

  // gifting (Plus) — enforces 50/week cap per member
  giftPoints(fromMemberId: string, childId: string, points: number): { ok: boolean; reason?: string }

  clearCelebration(): void
}

export const useStore = create<Store>((set, get) => ({
  data: dataStore.load(),
  celebration: null,

  activeChild() {
    const { data } = get()
    return data.children.find((c) => c.id === data.activeChildId) ?? data.children[0]
  },
  childById(id) {
    return get().data.children.find((c) => c.id === id)
  },

  persist() {
    dataStore.save(get().data)
  },

  resetAll() {
    const fresh = dataStore.reset()
    set({ data: fresh, celebration: null })
  },

  completeOnboarding(parentName) {
    set((s) => ({ data: { ...s.data, parentName, onboarded: true } }))
    get().persist()
  },

  addChild(name, age, avatar) {
    const id = newId('child')
    const child: Child = {
      id,
      name,
      age,
      avatar,
      points: 0,
      lifetimePoints: 0,
      streak: 0,
      bestStreak: 0,
      lastApprovedDate: null,
      goalId: null,
    }
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

  setPlus(v) {
    set((s) => ({ data: { ...s.data, isPlus: v } }))
    get().persist()
  },

  assignTask(childId, tpl) {
    const child = get().childById(childId)
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
      photo: null,
      completedAt: null,
      approvedAt: null,
    }
    set((s) => ({ data: { ...s.data, tasks: [...s.data.tasks, task] } }))
    get().persist()
  },

  markDone(taskId, photo) {
    set((s) => ({
      data: {
        ...s.data,
        tasks: s.data.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: 'pending', photo, completedAt: new Date().toISOString() }
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
    const child = state.childById(task.childId)
    if (!child) return null

    const onDate = todayKey()
    const streakUpd = applyStreakOnApproval(child, onDate)

    const updatedChild: Child = {
      ...child,
      ...streakUpd,
      points: child.points + task.points,
      lifetimePoints: child.lifetimePoints + task.points,
    }

    set((s) => ({
      data: {
        ...s.data,
        children: s.data.children.map((c) => (c.id === child.id ? updatedChild : c)),
        tasks: s.data.tasks.map((t) =>
          t.id === taskId ? { ...t, status: 'approved', approvedAt: new Date().toISOString() } : t,
        ),
      },
    }))

    const payload: CelebrationPayload = {
      childId: child.id,
      pointsAdded: task.points,
      taskTitle: task.title,
    }
    set({ celebration: payload })
    get().persist()
    return payload
  },

  removeTask(taskId) {
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
    const child = get().childById(childId)
    const reward = get().data.rewards.find((r) => r.id === rewardId)
    if (!child || !reward) return false
    if (child.points < reward.cost) return false
    set((s) => ({
      data: {
        ...s.data,
        children: s.data.children.map((c) =>
          c.id === childId ? { ...c, points: c.points - reward.cost } : c,
        ),
        rewards: s.data.rewards.map((r) =>
          r.id === rewardId ? { ...r, redeemed: true, redeemedAt: new Date().toISOString() } : r,
        ),
      },
    }))
    get().persist()
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

  giftPoints(fromMemberId, childId, points) {
    if (points <= 0) return { ok: false, reason: 'Enter points above zero.' }
    const { gifts } = get().data
    const allowance = remainingGiftAllowance(gifts, fromMemberId, childId)
    if (points > allowance) {
      return {
        ok: false,
        reason: `Weekly cap is ${GIFT_WEEKLY_CAP} pts per person. ${allowance} left this week.`,
      }
    }
    const child = get().childById(childId)
    if (!child) return { ok: false, reason: 'Child not found.' }
    set((s) => ({
      data: {
        ...s.data,
        children: s.data.children.map((c) =>
          c.id === childId
            ? { ...c, points: c.points + points, lifetimePoints: c.lifetimePoints + points }
            : c,
        ),
        gifts: [
          ...s.data.gifts,
          {
            id: newId('gift'),
            fromMemberId,
            childId,
            points,
            weekKey: weekKey(),
            date: todayKey(),
          },
        ],
      },
    }))
    get().persist()
    return { ok: true }
  },

  clearCelebration() {
    set({ celebration: null })
  },
}))
