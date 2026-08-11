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
export const HEALTHY_ALTERNATIVES: { titleKey: string; emoji: string; tags: RewardTag[] }[] = [
  { titleKey: 'reward.alt.park', emoji: '🛝', tags: ['outing'] },
  { titleKey: 'reward.alt.story', emoji: '📚', tags: ['experience'] },
  { titleKey: 'reward.alt.cook', emoji: '🥘', tags: ['experience'] },
  { titleKey: 'reward.alt.outing', emoji: '🗺️', tags: ['outing'] },
  { titleKey: 'reward.alt.cycle', emoji: '🚲', tags: ['outing'] },
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

export interface PendingFulfilment {
  reward: Reward
  childId: string
  date: string
}

/**
 * Rewards a child has spent points on but has not actually been given yet.
 *
 * Derived from the ledger rather than from the reward flag alone, because the
 * ledger is what knows *which* child redeemed a shared reward and *when*. This
 * is the promise the app made on the parent's behalf; leaving it invisible is
 * how a points system quietly loses a child's trust.
 */
export function pendingFulfilments(
  rewards: Reward[],
  ledger: LedgerEvent[],
): PendingFulfilment[] {
  return ledger
    .filter((e) => e.type === 'REWARD_REDEEMED')
    .map((e) => ({ event: e, reward: rewards.find((r) => r.id === e.refId) }))
    .filter((x): x is { event: LedgerEvent; reward: Reward } => !!x.reward && !x.reward.fulfilled)
    .map(({ event, reward }) => ({ reward, childId: event.childId, date: event.date }))
    .sort((a, b) => b.date.localeCompare(a.date))
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
