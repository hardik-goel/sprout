// Garden growth. Stages come from cumulative approved tasks (real-world
// action), flowers from streak milestones. Deliberately slow and finite:
// no infinite levels, nothing that rewards opening the app more often.

import type { GardenStage } from './types'

const STAGE_THRESHOLDS: { stage: GardenStage; min: number }[] = [
  { stage: 'tree', min: 30 },
  { stage: 'plant', min: 18 },
  { stage: 'leaf', min: 9 },
  { stage: 'sprout', min: 3 },
  { stage: 'seed', min: 0 },
]

export const STAGE_ORDER: GardenStage[] = ['seed', 'sprout', 'leaf', 'plant', 'tree']

export const STAGE_EMOJI: Record<GardenStage, string> = {
  seed: '🌰',
  sprout: '🌱',
  leaf: '🍃',
  plant: '🪴',
  tree: '🌳',
}

export const STAGE_LABEL_KEY: Record<GardenStage, string> = {
  seed: 'garden.stage.seed',
  sprout: 'garden.stage.sprout',
  leaf: 'garden.stage.leaf',
  plant: 'garden.stage.plant',
  tree: 'garden.stage.tree',
}

export function gardenStage(approvedCount: number): GardenStage {
  return STAGE_THRESHOLDS.find((t) => approvedCount >= t.min)!.stage
}

export function stageThreshold(stage: GardenStage): number {
  return STAGE_THRESHOLDS.find((t) => t.stage === stage)!.min
}

export function nextStageProgress(approvedCount: number): {
  current: GardenStage
  next: GardenStage | null
  remaining: number
  pct: number
} {
  const current = gardenStage(approvedCount)
  const idx = STAGE_ORDER.indexOf(current)
  if (idx === STAGE_ORDER.length - 1) {
    return { current, next: null, remaining: 0, pct: 100 }
  }
  const next = STAGE_ORDER[idx + 1]
  const from = stageThreshold(current)
  const to = stageThreshold(next)
  const pct = Math.min(100, Math.round(((approvedCount - from) / (to - from)) * 100))
  return { current, next, remaining: Math.max(0, to - approvedCount), pct }
}

/** Did this approval push the plant into a new stage? Drives the celebration. */
export function didStageUp(beforeCount: number, afterCount: number): boolean {
  return gardenStage(beforeCount) !== gardenStage(afterCount)
}

export const FLOWER_MILESTONES = [3, 7, 14, 30]
export const FLOWER_EMOJI = ['🌼', '🌸', '🌺', '🌻']

export function unlockedFlowers(bestStreak: number): string[] {
  return FLOWER_MILESTONES.filter((m) => bestStreak >= m).map((_, i) => FLOWER_EMOJI[i])
}

export function nextFlowerMilestone(streak: number): number | null {
  return FLOWER_MILESTONES.find((m) => m > streak) ?? null
}
