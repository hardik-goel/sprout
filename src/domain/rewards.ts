// Reward rules: the healthy nudge, jar progress, and which jar pays.

import type { JarKind, LedgerEvent, Reward, RewardTag } from './types'
import { jarBalances } from './ledger'

const LESS_HEALTHY: RewardTag[] = ['screen', 'sweet']

export function isLessHealthyReward(tags: RewardTag[] | string[]): boolean {
  return (tags as string[]).some((t) => (LESS_HEALTHY as string[]).includes(t))
}

/**
 * Gentle alternatives shown when a reward is screen/sweet. Never blocking —
 * "Add anyway" always wins. We suggest, the parent decides.
 */
export const HEALTHY_ALTERNATIVES: { title: string; emoji: string; tags: RewardTag[] }[] = [
  { title: 'Park + play time', emoji: '🛝', tags: ['outing'] },
  { title: 'Extra bedtime story', emoji: '📚', tags: ['experience'] },
  { title: 'Cook together', emoji: '🥘', tags: ['experience'] },
  { title: 'Pick the weekend outing', emoji: '🗺️', tags: ['outing'] },
  { title: 'Cycle ride with Papa', emoji: '🚲', tags: ['outing'] },
]

export function jarProgress(points: number, goalCost: number): { pct: number; remaining: number } {
  if (goalCost <= 0) return { pct: 0, remaining: 0 }
  return {
    pct: Math.min(100, Math.round((points / goalCost) * 100)),
    remaining: Math.max(0, goalCost - points),
  }
}

export function rewardsForChild(rewards: Reward[], childId: string): Reward[] {
  return rewards.filter((r) => r.childId === null || r.childId === childId)
}

export function affordableRewards(rewards: Reward[], balance: number): Reward[] {
  return rewards.filter((r) => !r.redeemed && r.cost <= balance)
}

/**
 * Which jar pays for a redemption: the spend jar if it can cover it on its own,
 * otherwise savings. Keeps "spend" money genuinely spendable for older kids
 * without blocking the simple single-jar case.
 */
export function payingJar(ledger: LedgerEvent[], childId: string, cost: number): JarKind {
  const jars = jarBalances(ledger, childId)
  return jars.spend >= cost ? 'spend' : 'save'
}
