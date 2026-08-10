import { describe, expect, it } from 'vitest'
import {
  appendEvent,
  approvedTaskCount,
  balance,
  EQUAL_SPLIT,
  GIFT_WEEKLY_CAP,
  giftedThisWeek,
  jarBalances,
  lifetimeEarned,
  lifetimeSpent,
  mergeLedgers,
  normalizeSplit,
  pointsEarnedBetween,
  remainingGiftAllowance,
  splitPoints,
  streakInfo,
} from '../ledger'
import type { LedgerEvent } from '../types'
import { addDays, weekKey } from '../dates'

const TODAY = '2026-06-15' // a Monday

function evt(over: Partial<LedgerEvent> & { id: string }): LedgerEvent {
  const date = over.date ?? TODAY
  return {
    type: 'TASK_APPROVED',
    childId: 'c1',
    actorId: 'p1',
    actorRole: 'parent',
    delta: 10,
    at: `${date}T10:00:00.000Z`,
    date,
    reason: 'Brush teeth',
    refId: 'task1',
    weekKey: weekKey(date),
    jar: 'save',
    ...over,
  }
}

describe('append & merge', () => {
  it('is idempotent — replaying the same event id never double-counts', () => {
    const e = evt({ id: 'e1' })
    let ledger: LedgerEvent[] = []
    ledger = appendEvent(ledger, e)
    ledger = appendEvent(ledger, e)
    ledger = appendEvent(ledger, { ...e }) // same id, fresh object
    expect(ledger).toHaveLength(1)
    expect(balance(ledger, 'c1')).toBe(10)
  })

  it('merges two ledgers by event id and orders by timestamp', () => {
    const a = [evt({ id: 'e1', date: '2026-06-14' }), evt({ id: 'e2' })]
    const b = [evt({ id: 'e2' }), evt({ id: 'e3', date: '2026-06-16' })]
    const merged = mergeLedgers(a, b)
    expect(merged.map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
  })
})

describe('balances', () => {
  const ledger = [
    evt({ id: 'e1', delta: 10 }),
    evt({ id: 'e2', delta: 6 }),
    evt({ id: 'e3', type: 'REWARD_REDEEMED', delta: -12, refId: 'rw1', reason: 'Zoo' }),
    evt({ id: 'e4', childId: 'c2', delta: 50 }),
  ]

  it('sums only the requested child', () => {
    expect(balance(ledger, 'c1')).toBe(4)
    expect(balance(ledger, 'c2')).toBe(50)
  })

  it('separates lifetime earned from spent', () => {
    expect(lifetimeEarned(ledger, 'c1')).toBe(16)
    expect(lifetimeSpent(ledger, 'c1')).toBe(12)
  })

  it('can go through zero without breaking', () => {
    const l = [...ledger, evt({ id: 'e5', type: 'ADJUSTMENT', delta: -4, reason: 'Correction' })]
    expect(balance(l, 'c1')).toBe(0)
  })

  it('sums points earned within a date window only', () => {
    const l = [
      evt({ id: 'a', delta: 10, date: '2026-06-10' }),
      evt({ id: 'b', delta: 10, date: '2026-06-15' }),
      evt({ id: 'c', delta: -5, date: '2026-06-15', type: 'REWARD_REDEEMED' }),
    ]
    expect(pointsEarnedBetween(l, 'c1', '2026-06-11', '2026-06-15')).toBe(10)
  })
})

describe('approved task count (the garden fuel)', () => {
  it('counts one approval even when it is split across jars', () => {
    const ledger = [
      evt({ id: 'e1', refId: 'task1', jar: 'save', delta: 6 }),
      evt({ id: 'e2', refId: 'task1', jar: 'spend', delta: 3 }),
      evt({ id: 'e3', refId: 'task1', jar: 'give', delta: 1 }),
      evt({ id: 'e4', refId: 'task2', jar: 'save', delta: 10 }),
    ]
    expect(approvedTaskCount(ledger, 'c1')).toBe(2)
    expect(balance(ledger, 'c1')).toBe(20)
  })

  it('ignores gifts and redemptions', () => {
    const ledger = [
      evt({ id: 'e1', refId: 'task1' }),
      evt({ id: 'e2', type: 'POINTS_GIFTED', refId: null, delta: 20 }),
      evt({ id: 'e3', type: 'REWARD_REDEEMED', refId: 'rw1', delta: -5 }),
    ]
    expect(approvedTaskCount(ledger, 'c1')).toBe(1)
  })
})

describe('jar splits', () => {
  it('never loses or invents a point (largest remainder)', () => {
    for (const amount of [1, 3, 7, 10, 13, 20, 99]) {
      const parts = splitPoints(amount, { save: 60, spend: 30, give: 10 })
      expect(parts.save + parts.spend + parts.give).toBe(amount)
    }
  })

  it('sends everything to save with the default single-jar split', () => {
    expect(splitPoints(10, EQUAL_SPLIT)).toEqual({ save: 10, spend: 0, give: 0 })
  })

  it('normalises a split that does not add to 100', () => {
    const n = normalizeSplit({ save: 50, spend: 25, give: 25 })
    expect(n.save + n.spend + n.give).toBe(100)
    const m = normalizeSplit({ save: 3, spend: 1, give: 1 })
    expect(m.save + m.spend + m.give).toBe(100)
    expect(normalizeSplit({ save: 0, spend: 0, give: 0 })).toEqual(EQUAL_SPLIT)
  })

  it('tracks a balance per jar and defaults untagged events to save', () => {
    const ledger = [
      evt({ id: 'e1', jar: 'save', delta: 6 }),
      evt({ id: 'e2', jar: 'spend', delta: 3 }),
      evt({ id: 'e3', jar: 'give', delta: 1 }),
      { ...evt({ id: 'e4', delta: 5 }), jar: undefined },
      evt({ id: 'e5', jar: 'spend', delta: -2, type: 'REWARD_REDEEMED' }),
    ]
    expect(jarBalances(ledger, 'c1')).toEqual({ save: 11, spend: 1, give: 1 })
  })
})

describe('gift cap', () => {
  const wk = weekKey(TODAY)

  it('sums only that member, that child, that week', () => {
    const ledger = [
      evt({ id: 'g1', type: 'POINTS_GIFTED', actorId: 'dadi', delta: 20, refId: null }),
      evt({ id: 'g2', type: 'POINTS_GIFTED', actorId: 'mama', delta: 30, refId: null }),
      evt({ id: 'g3', type: 'POINTS_GIFTED', actorId: 'dadi', childId: 'c2', delta: 15, refId: null }),
      evt({
        id: 'g4',
        type: 'POINTS_GIFTED',
        actorId: 'dadi',
        delta: 40,
        refId: null,
        date: addDays(TODAY, -7),
        weekKey: weekKey(addDays(TODAY, -7)),
      }),
    ]
    expect(giftedThisWeek(ledger, 'dadi', 'c1', wk)).toBe(20)
    expect(remainingGiftAllowance(ledger, 'dadi', 'c1', wk)).toBe(GIFT_WEEKLY_CAP - 20)
  })

  it('never reports a negative allowance', () => {
    const ledger = [
      evt({ id: 'g1', type: 'POINTS_GIFTED', actorId: 'dadi', delta: 50, refId: null }),
      evt({ id: 'g2', type: 'POINTS_GIFTED', actorId: 'dadi', delta: 30, refId: null }),
    ]
    expect(remainingGiftAllowance(ledger, 'dadi', 'c1', wk)).toBe(0)
  })

  it('resets the following week', () => {
    const ledger = [evt({ id: 'g1', type: 'POINTS_GIFTED', actorId: 'dadi', delta: 50, refId: null })]
    expect(remainingGiftAllowance(ledger, 'dadi', 'c1', weekKey(addDays(TODAY, 7)))).toBe(
      GIFT_WEEKLY_CAP,
    )
  })
})

describe('streaks', () => {
  const approvedOn = (dates: string[]): LedgerEvent[] =>
    dates.map((d, i) => evt({ id: `s${i}`, date: d, refId: `task${i}` }))

  it('is zero with no history', () => {
    expect(streakInfo([], 'c1', TODAY)).toEqual({
      current: 0,
      best: 0,
      lastActiveDate: null,
      atRisk: false,
    })
  })

  it('counts consecutive days ending today', () => {
    const l = approvedOn([addDays(TODAY, -2), addDays(TODAY, -1), TODAY])
    const s = streakInfo(l, 'c1', TODAY)
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
    expect(s.atRisk).toBe(false)
  })

  it('survives a day boundary: yesterday still counts, but flags at-risk', () => {
    const l = approvedOn([addDays(TODAY, -2), addDays(TODAY, -1)])
    const s = streakInfo(l, 'c1', TODAY)
    expect(s.current).toBe(2)
    expect(s.atRisk).toBe(true)
  })

  it('breaks when a day is missed', () => {
    const l = approvedOn([addDays(TODAY, -3), addDays(TODAY, -2)])
    const s = streakInfo(l, 'c1', TODAY)
    expect(s.current).toBe(0)
    expect(s.best).toBe(2)
  })

  it('remembers the best run even after a break', () => {
    const l = approvedOn([
      addDays(TODAY, -10),
      addDays(TODAY, -9),
      addDays(TODAY, -8),
      addDays(TODAY, -7),
      addDays(TODAY, -1),
      TODAY,
    ])
    const s = streakInfo(l, 'c1', TODAY)
    expect(s.best).toBe(4)
    expect(s.current).toBe(2)
  })

  it('counts a day once no matter how many tasks landed on it', () => {
    const l = [
      evt({ id: 'a', date: addDays(TODAY, -1), refId: 't1' }),
      evt({ id: 'b', date: addDays(TODAY, -1), refId: 't2' }),
      evt({ id: 'c', date: TODAY, refId: 't3' }),
    ]
    expect(streakInfo(l, 'c1', TODAY).current).toBe(2)
  })

  it('crosses a month boundary', () => {
    const l = approvedOn(['2026-05-30', '2026-05-31', '2026-06-01'])
    expect(streakInfo(l, 'c1', '2026-06-01').current).toBe(3)
  })
})
