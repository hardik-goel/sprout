// The finish-the-day bonus.
//
// A per-task reward pays the same whether a child does one thing or all five,
// so the last task of the day is always the least attractive one. The bonus
// exists to make finishing worth more than starting: clear the whole day and
// you get one extra task's worth of points on top.
//
// Deliberately not a per-task multiplier and not a leaderboard. It fires once
// per child per day, is worth about one task, and is announced in the same
// celebration the child was already getting — a bonus they have to go and look
// for is not a bonus.

import { ageFitTaskPoints } from './ageFit'
import type { AssignedTask } from './types'

/**
 * A single task is not a "day". Below this, finishing everything is just
 * finishing the one thing, and paying a bonus for it teaches the wrong sum.
 */
export const PERFECT_DAY_MIN_TASKS = 2

/** Worth about one average task, scaled to the child like everything else. */
export function perfectDayBonus(age: number): number {
  return ageFitTaskPoints(10, age)
}

/** The day's tasks for one child — everything assigned, whatever its state. */
export function isPerfectDay(tasksToday: AssignedTask[]): boolean {
  return (
    tasksToday.length >= PERFECT_DAY_MIN_TASKS &&
    tasksToday.every((task) => task.status === 'approved')
  )
}

/**
 * The ledger reference for a day's bonus. Making it deterministic is what
 * keeps the bonus idempotent: approving, undoing and re-approving the last
 * task of the day can never pay it twice, because the check is "is this
 * refId already in the ledger" and not a counter.
 */
export function perfectDayRefId(childId: string, date: string): string {
  return `perfect_${childId}_${date}`
}
