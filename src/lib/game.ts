// Pure game logic: points, streaks, garden growth, jar, age-fit, gift cap.
// No I/O here — these are deterministic functions over domain data so they're
// trivial to reason about and unit-test later.

import type { AssignedTask, Child, GardenStage, GiftLog } from '@/types'
import { addDays, todayKey, weekKey } from './dates'

export const GIFT_WEEKLY_CAP = 50 // pts per family member per week

// Garden stage thresholds keyed on lifetime approved tasks.
const STAGE_THRESHOLDS: { stage: GardenStage; min: number }[] = [
  { stage: 'tree', min: 30 },
  { stage: 'plant', min: 18 },
  { stage: 'leaf', min: 9 },
  { stage: 'sprout', min: 3 },
  { stage: 'seed', min: 0 },
]

export function gardenStage(approvedCount: number): GardenStage {
  return STAGE_THRESHOLDS.find((t) => approvedCount >= t.min)!.stage
}

export const STAGE_ORDER: GardenStage[] = ['seed', 'sprout', 'leaf', 'plant', 'tree']
export const STAGE_EMOJI: Record<GardenStage, string> = {
  seed: '🌰',
  sprout: '🌱',
  leaf: '🍃',
  plant: '🪴',
  tree: '🌳',
}
export const STAGE_LABEL: Record<GardenStage, string> = {
  seed: 'Seed',
  sprout: 'Sprout',
  leaf: 'Leaf',
  plant: 'Plant',
  tree: 'Tree',
}

// Flowers unlock at streak milestones.
export const FLOWER_MILESTONES = [3, 7, 14, 30]
export const FLOWER_EMOJI = ['🌼', '🌸', '🌺', '🌻']

export function unlockedFlowers(bestStreak: number): string[] {
  return FLOWER_MILESTONES.filter((m) => bestStreak >= m).map((_, i) => FLOWER_EMOJI[i])
}

export function nextFlowerMilestone(streak: number): number | null {
  return FLOWER_MILESTONES.find((m) => m > streak) ?? null
}

// How many lifetime approved tasks until the next garden stage.
export function nextStageProgress(approvedCount: number): {
  next: GardenStage | null
  remaining: number
  current: GardenStage
} {
  const current = gardenStage(approvedCount)
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === STAGE_ORDER.length - 1) return { next: null, remaining: 0, current }
  const next = STAGE_ORDER[idx + 1]
  const min = STAGE_THRESHOLDS.find((t) => t.stage === next)!.min
  return { next, remaining: Math.max(0, min - approvedCount), current }
}

// Age-fit: younger kids get smaller default goals so the jar feels reachable.
export function ageFitGoalMax(age: number): number {
  if (age <= 3) return 150
  if (age <= 5) return 250
  return 400
}

export function ageFitTaskPoints(base: number, age: number): number {
  // Younger -> fewer points per task (keeps numbers small and the jar in reach).
  const factor = age <= 3 ? 0.5 : age <= 5 ? 0.75 : 1
  return Math.max(2, Math.round((base * factor) / 2) * 2)
}

// Streak recompute given the day a task was just approved.
export function applyStreakOnApproval(child: Child, onDate: string): Pick<Child, 'streak' | 'bestStreak' | 'lastApprovedDate'> {
  if (child.lastApprovedDate === onDate) {
    return { streak: child.streak, bestStreak: child.bestStreak, lastApprovedDate: onDate }
  }
  let streak: number
  if (child.lastApprovedDate && addDays(child.lastApprovedDate, 1) === onDate) {
    streak = child.streak + 1 // consecutive day
  } else {
    streak = 1 // first ever, or a gap broke it
  }
  return {
    streak,
    bestStreak: Math.max(child.bestStreak, streak),
    lastApprovedDate: onDate,
  }
}

// A streak is "stale" (broken) if the last approval wasn't today or yesterday.
export function effectiveStreak(child: Child, today: string = todayKey()): number {
  if (!child.lastApprovedDate) return 0
  const gap = child.lastApprovedDate === today || addDays(child.lastApprovedDate, 1) === today
  return gap ? child.streak : 0
}

export function approvedTaskCount(tasks: AssignedTask[], childId: string): number {
  return tasks.filter((t) => t.childId === childId && t.status === 'approved').length
}

// Jar progress toward the current goal.
export function jarProgress(points: number, goalCost: number): { pct: number; remaining: number } {
  if (goalCost <= 0) return { pct: 0, remaining: 0 }
  const pct = Math.min(100, Math.round((points / goalCost) * 100))
  return { pct, remaining: Math.max(0, goalCost - points) }
}

// Gift cap: how many points a member has already gifted a child this week.
export function giftedThisWeek(gifts: GiftLog[], memberId: string, childId: string, wk = weekKey()): number {
  return gifts
    .filter((g) => g.fromMemberId === memberId && g.childId === childId && g.weekKey === wk)
    .reduce((sum, g) => sum + g.points, 0)
}

export function remainingGiftAllowance(gifts: GiftLog[], memberId: string, childId: string): number {
  return Math.max(0, GIFT_WEEKLY_CAP - giftedThisWeek(gifts, memberId, childId))
}

// Healthy-reward nudge trigger.
export function isLessHealthyReward(tags: string[]): boolean {
  return tags.includes('screen') || tags.includes('sweet')
}
