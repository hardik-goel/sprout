// Age-fit engine. A 3-year-old cannot hold "400 points, three weeks away" in
// their head. Younger => smaller numbers and nearer goals, so the jar always
// feels reachable and the reward actually arrives while it still means something.

import type { JarSplit, TaskTemplate } from './types'

export type AgeBand = 'toddler' | 'preschool' | 'bigkid'

export function ageBand(age: number): AgeBand {
  if (age <= 3) return 'toddler'
  if (age <= 5) return 'preschool'
  return 'bigkid'
}

/** Ceiling for a saving goal, so a goal is days away — not weeks. */
export function ageFitGoalMax(age: number): number {
  return { toddler: 150, preschool: 250, bigkid: 400 }[ageBand(age)]
}

/** Suggested goal cost for a new child. */
export function ageFitSuggestedGoal(age: number): number {
  return { toddler: 100, preschool: 150, bigkid: 250 }[ageBand(age)]
}

/** Points per task, scaled down for younger kids and rounded to even numbers. */
export function ageFitTaskPoints(base: number, age: number): number {
  const factor = { toddler: 0.5, preschool: 0.75, bigkid: 1 }[ageBand(age)]
  return Math.max(2, Math.round((base * factor) / 2) * 2)
}

/**
 * Bounds on a parent-authored task's points. Not a nanny rule — it keeps a
 * custom task in the same universe as ours, so one 500-point task can't make
 * every other task on the screen look pointless.
 */
export const CUSTOM_TASK_MIN_POINTS = 2
export const CUSTOM_TASK_MAX_POINTS = 30

export function clampCustomPoints(points: number): number {
  return Math.min(CUSTOM_TASK_MAX_POINTS, Math.max(CUSTOM_TASK_MIN_POINTS, Math.round(points)))
}

/**
 * What a template is worth for this child. Our templates carry a base cost we
 * scale by age; a custom task is the parent's own number, typed on a screen
 * that already said whose tasks these are — quietly halving it would make the
 * library lie about what it just showed them.
 */
export function taskPointsFor(tpl: TaskTemplate, age: number): number {
  return tpl.pack === 'custom'
    ? clampCustomPoints(tpl.basePoints)
    : ageFitTaskPoints(tpl.basePoints, age)
}

/** Suggested points for a new custom task — our mid-range task, age-scaled. */
export function ageFitSuggestedTaskPoints(age: number): number {
  return ageFitTaskPoints(10, age)
}

/** How many tasks a day is reasonable to assign — more is nagging, not habit. */
export function ageFitDailyTaskCap(age: number): number {
  return { toddler: 3, preschool: 4, bigkid: 6 }[ageBand(age)]
}

/** Three jars only make sense once a kid can grasp trade-offs (~6+). */
export function supportsThreeJars(age: number): boolean {
  return ageBand(age) === 'bigkid'
}

export function defaultJarSplit(age: number): JarSplit {
  return supportsThreeJars(age)
    ? { save: 60, spend: 30, give: 10 }
    : { save: 100, spend: 0, give: 0 }
}

export function isAgeAppropriate(tpl: TaskTemplate, age: number): boolean {
  return age >= tpl.minAge && age <= tpl.maxAge
}
