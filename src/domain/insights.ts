// Insights: what actually happened this week, derived from tasks + ledger.
// Free tier gets the headline counts; Plus gets the per-habit grids below.

import type { AppData, AssignedTask, TaskCategory } from './types'
import { addDays, lastNDays, todayKey } from './dates'
import { approvedTaskCount, pointsEarnedBetween, streakInfo } from './ledger'

/** Categories that count as an *active* alternative to a screen. */
const SCREEN_FREE_CATEGORIES: TaskCategory[] = ['learning', 'health', 'kindness']

export interface WeekStats {
  from: string
  to: string
  tasksDone: number
  pointsEarned: number
  screenFreeWins: number
  streak: number
  bestStreak: number
  activeDays: number
}

export function weekStats(
  data: AppData,
  childId: string,
  today: string = todayKey(),
): WeekStats {
  const from = addDays(today, -6)
  const approved = data.tasks.filter(
    (t) =>
      t.childId === childId && t.status === 'approved' && t.date >= from && t.date <= today,
  )
  const categoryOf = (t: AssignedTask): TaskCategory | undefined =>
    data.templates.find((tpl) => tpl.id === t.templateId)?.category
  const streak = streakInfo(data.ledger, childId, today)

  return {
    from,
    to: today,
    tasksDone: approved.length,
    pointsEarned: pointsEarnedBetween(data.ledger, childId, from, today),
    screenFreeWins: approved.filter((t) => {
      const c = categoryOf(t)
      return c ? SCREEN_FREE_CATEGORIES.includes(c) : false
    }).length,
    streak: streak.current,
    bestStreak: streak.best,
    activeDays: new Set(approved.map((t) => t.date)).size,
  }
}

export interface HabitGrid {
  templateId: string
  title: string
  emoji: string
  /** Oldest first — one cell per day. */
  days: { date: string; done: boolean }[]
  doneCount: number
  streak: number
}

/** Per-habit 7-day grids, busiest habit first. */
export function habitGrids(
  data: AppData,
  childId: string,
  days = 7,
  today: string = todayKey(),
): HabitGrid[] {
  const window = lastNDays(days, today)
  const childTasks = data.tasks.filter((t) => t.childId === childId)
  const templateIds = [...new Set(childTasks.map((t) => t.templateId))]

  return templateIds
    .map((templateId) => {
      const sample = childTasks.find((t) => t.templateId === templateId)!
      const doneDates = new Set(
        childTasks
          .filter((t) => t.templateId === templateId && t.status === 'approved')
          .map((t) => t.date),
      )
      const grid = window.map((date) => ({ date, done: doneDates.has(date) }))
      let streak = 0
      for (let i = grid.length - 1; i >= 0; i--) {
        if (grid[i].done) streak++
        else if (i !== grid.length - 1) break // today not done yet ≠ broken
        else continue
      }
      return {
        templateId,
        title: sample.title,
        emoji: sample.emoji,
        days: grid,
        doneCount: grid.filter((d) => d.done).length,
        streak,
      }
    })
    .sort((a, b) => b.doneCount - a.doneCount)
}

/** The one habit worth a parent's attention: assigned often, landing least. */
export function habitToNudge(grids: HabitGrid[]): HabitGrid | null {
  const candidates = grids.filter((g) => g.days.length > 0 && g.doneCount < g.days.length)
  if (candidates.length === 0) return null
  return candidates.reduce((worst, g) => (g.doneCount < worst.doneCount ? g : worst))
}

export function totalApprovedForChild(data: AppData, childId: string): number {
  return approvedTaskCount(data.ledger, childId)
}

/** Recent ledger activity, newest first — the "why is my balance this?" view. */
export function recentActivity(data: AppData, childId: string, limit = 12) {
  return data.ledger
    .filter((e) => e.childId === childId)
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}
