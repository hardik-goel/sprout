import { describe, expect, it } from 'vitest'
import {
  ageBand,
  ageFitDailyTaskCap,
  ageFitGoalMax,
  ageFitTaskPoints,
  defaultJarSplit,
  isAgeAppropriate,
  supportsThreeJars,
} from '../ageFit'
import {
  didStageUp,
  FLOWER_MILESTONES,
  gardenStage,
  nextFlowerMilestone,
  nextStageProgress,
  STAGE_ORDER,
  unlockedFlowers,
} from '../garden'
import { entitlements } from '../entitlements'
import { isLessHealthyReward, jarProgress, payingJar, rewardsForChild } from '../rewards'
import { addDays, daysBetween, lastNDays, todayKey, weekKey } from '../dates'
import type { LedgerEvent, Reward, TaskTemplate } from '../types'

describe('age-fit', () => {
  it('bands ages the way the product talks about them', () => {
    expect(ageBand(2)).toBe('toddler')
    expect(ageBand(3)).toBe('toddler')
    expect(ageBand(5)).toBe('preschool')
    expect(ageBand(8)).toBe('bigkid')
  })

  it('keeps goals nearer for younger kids', () => {
    expect(ageFitGoalMax(3)).toBeLessThan(ageFitGoalMax(5))
    expect(ageFitGoalMax(5)).toBeLessThan(ageFitGoalMax(7))
  })

  it('scales task points down for younger kids, always even and never below 2', () => {
    expect(ageFitTaskPoints(10, 7)).toBe(10)
    expect(ageFitTaskPoints(10, 5)).toBe(8)
    expect(ageFitTaskPoints(10, 3)).toBe(6)
    expect(ageFitTaskPoints(1, 2)).toBe(2)
    for (const age of [2, 3, 4, 5, 6, 7, 8]) {
      expect(ageFitTaskPoints(12, age) % 2).toBe(0)
    }
  })

  it('caps daily tasks lower for younger kids', () => {
    expect(ageFitDailyTaskCap(3)).toBeLessThan(ageFitDailyTaskCap(8))
  })

  it('gives three jars only to big kids, and a single jar otherwise', () => {
    expect(supportsThreeJars(3)).toBe(false)
    expect(supportsThreeJars(6)).toBe(true)
    expect(defaultJarSplit(3)).toEqual({ save: 100, spend: 0, give: 0 })
    const big = defaultJarSplit(7)
    expect(big.save + big.spend + big.give).toBe(100)
  })

  it('hides templates outside a child’s age range', () => {
    const tpl: TaskTemplate = {
      id: 'tpl_home',
      title: 'Finish homework',
      emoji: '✏️',
      category: 'learning',
      basePoints: 15,
      pack: 'basic',
      packName: 'Big Kid Routines',
      packKey: 'pack.bigKid',
      minAge: 5,
      maxAge: 8,
    }
    expect(isAgeAppropriate(tpl, 3)).toBe(false)
    expect(isAgeAppropriate(tpl, 6)).toBe(true)
  })
})

describe('garden', () => {
  it('maps approved counts to stages', () => {
    expect(gardenStage(0)).toBe('seed')
    expect(gardenStage(2)).toBe('seed')
    expect(gardenStage(3)).toBe('sprout')
    expect(gardenStage(9)).toBe('leaf')
    expect(gardenStage(18)).toBe('plant')
    expect(gardenStage(30)).toBe('tree')
    expect(gardenStage(300)).toBe('tree')
  })

  it('never goes backwards as the count rises', () => {
    let last = -1
    for (let n = 0; n < 40; n++) {
      const idx = STAGE_ORDER.indexOf(gardenStage(n))
      expect(idx).toBeGreaterThanOrEqual(last)
      last = idx
    }
  })

  it('reports what is left until the next stage', () => {
    const p = nextStageProgress(1)
    expect(p.current).toBe('seed')
    expect(p.next).toBe('sprout')
    expect(p.remaining).toBe(2)
    expect(nextStageProgress(30)).toMatchObject({ next: null, remaining: 0, pct: 100 })
  })

  it('detects the stage-up that triggers the celebration', () => {
    expect(didStageUp(2, 3)).toBe(true)
    expect(didStageUp(3, 4)).toBe(false)
  })

  it('unlocks one flower per streak milestone reached', () => {
    expect(unlockedFlowers(0)).toHaveLength(0)
    expect(unlockedFlowers(3)).toHaveLength(1)
    expect(unlockedFlowers(7)).toHaveLength(2)
    expect(unlockedFlowers(100)).toHaveLength(FLOWER_MILESTONES.length)
    expect(nextFlowerMilestone(3)).toBe(7)
    expect(nextFlowerMilestone(30)).toBeNull()
  })
})

describe('entitlements', () => {
  it('locks Plus features on free and opens them on Plus', () => {
    const free = entitlements(false)
    const plus = entitlements(true)
    expect(free.can('insights')).toBe(false)
    expect(free.can('threeJars')).toBe(false)
    expect(plus.can('insights')).toBe(true)
    // The album is deliberately free — it's the emotional hook, not the upsell.
    expect(free.can('growthAlbum')).toBe(true)
  })

  it('allows exactly one child on free', () => {
    expect(entitlements(false).canAddChild(0)).toBe(true)
    expect(entitlements(false).canAddChild(1)).toBe(false)
    expect(entitlements(true).canAddChild(4)).toBe(true)
  })
})

describe('rewards', () => {
  const rewards: Reward[] = [
    { id: 'r1', childId: 'c1', title: 'Zoo', emoji: '🦁', cost: 150, tags: ['outing'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'r2', childId: 'c2', title: 'Bat', emoji: '🏏', cost: 250, tags: ['toy'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'r3', childId: null, title: 'Cartoon', emoji: '📺', cost: 40, tags: ['screen'], redeemed: false, redeemedAt: null, fulfilled: false },
  ]

  it('flags screen and sweet rewards for the healthy nudge, and nothing else', () => {
    expect(isLessHealthyReward(['screen'])).toBe(true)
    expect(isLessHealthyReward(['sweet', 'outing'])).toBe(true)
    expect(isLessHealthyReward(['outing', 'toy'])).toBe(false)
    expect(isLessHealthyReward([])).toBe(false)
  })

  it('shows a child their own rewards plus the shared ones', () => {
    expect(rewardsForChild(rewards, 'c1').map((r) => r.id)).toEqual(['r1', 'r3'])
  })

  it('computes jar progress and clamps at 100%', () => {
    expect(jarProgress(90, 150)).toEqual({ pct: 60, remaining: 60 })
    expect(jarProgress(200, 150)).toEqual({ pct: 100, remaining: 0 })
    expect(jarProgress(10, 0)).toEqual({ pct: 0, remaining: 0 })
  })

  it('pays from the spend jar only when it can cover the whole cost', () => {
    const base = {
      type: 'TASK_APPROVED' as const,
      childId: 'c1',
      actorId: 'p1',
      actorRole: 'parent' as const,
      at: '2026-06-15T10:00:00.000Z',
      date: '2026-06-15',
      reason: 'x',
      refId: 't1',
      weekKey: '2026-W25',
    }
    const ledger: LedgerEvent[] = [
      { ...base, id: 'a', delta: 40, jar: 'save' },
      { ...base, id: 'b', delta: 25, jar: 'spend' },
    ]
    expect(payingJar(ledger, 'c1', 20)).toBe('spend')
    expect(payingJar(ledger, 'c1', 30)).toBe('save')
  })
})

describe('dates', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29') // leap year
  })

  it('measures whole days between keys', () => {
    expect(daysBetween('2026-06-01', '2026-06-08')).toBe(7)
    expect(daysBetween('2026-06-08', '2026-06-01')).toBe(-7)
  })

  it('produces a stable ISO week key for the gift cap', () => {
    // Mon 15 Jun 2026 and Sun 21 Jun 2026 are the same ISO week.
    expect(weekKey('2026-06-15')).toBe(weekKey('2026-06-21'))
    expect(weekKey('2026-06-15')).not.toBe(weekKey('2026-06-22'))
  })

  it('returns the last N days oldest-first, ending today', () => {
    const days = lastNDays(7, '2026-06-15')
    expect(days).toHaveLength(7)
    expect(days[6]).toBe('2026-06-15')
    expect(days[0]).toBe('2026-06-09')
  })

  it('formats today as YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 5, 3))).toBe('2026-06-03')
  })
})
