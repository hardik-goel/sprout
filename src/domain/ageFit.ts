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
