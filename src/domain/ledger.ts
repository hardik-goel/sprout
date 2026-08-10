// ============================================================================
// The points ledger — append-only, event-sourced.
//
// Why not just store `child.points`?
//   1. Trust. A parent can always see WHY a balance is what it is.
//   2. Undo without lies. Reversing = appending a compensating event, never
//      editing history.
//   3. Caps for free. "How much did Dadi gift this week?" is a filter+sum over
//      events, not a counter someone has to remember to update.
//   4. Sync. Phase 2 becomes append-and-merge (union by event id), not a
//      three-way merge of mutable rows.
//
// Everything downstream (balance, jars, streak, garden) is DERIVED here.
// ============================================================================

import type { JarKind, JarSplit, LedgerEvent } from './types'
import { addDays, todayKey, weekKey } from './dates'

/**
 * Append with dedupe. Replaying the same event id (retry, offline flush,
 * multi-device merge) is a no-op — this is the whole point of client uuids.
 */
export function appendEvent(ledger: LedgerEvent[], event: LedgerEvent): LedgerEvent[] {
  if (ledger.some((e) => e.id === event.id)) return ledger
  return [...ledger, event]
}

export function mergeLedgers(a: LedgerEvent[], b: LedgerEvent[]): LedgerEvent[] {
  const byId = new Map<string, LedgerEvent>()
  for (const e of [...a, ...b]) byId.set(e.id, e)
  return [...byId.values()].sort((x, y) => x.at.localeCompare(y.at))
}

export function eventsFor(ledger: LedgerEvent[], childId: string): LedgerEvent[] {
  return ledger.filter((e) => e.childId === childId)
}

/** Current spendable balance = sum of every delta. */
export function balance(ledger: LedgerEvent[], childId: string): number {
  return eventsFor(ledger, childId).reduce((sum, e) => sum + e.delta, 0)
}

/** Everything ever earned (positive deltas only) — drives lifetime stats. */
export function lifetimeEarned(ledger: LedgerEvent[], childId: string): number {
  return eventsFor(ledger, childId)
    .filter((e) => e.delta > 0)
    .reduce((sum, e) => sum + e.delta, 0)
}

export function lifetimeSpent(ledger: LedgerEvent[], childId: string): number {
  return eventsFor(ledger, childId)
    .filter((e) => e.delta < 0)
    .reduce((sum, e) => sum - e.delta, 0)
}

/**
 * Count of approved tasks — the garden's fuel. Counted by distinct task
 * (refId), because a split across jars writes one event per jar for the same
 * approval and must still grow the garden exactly once.
 */
export function approvedTaskCount(ledger: LedgerEvent[], childId: string): number {
  const tasks = new Set(
    eventsFor(ledger, childId)
      .filter((e) => e.type === 'TASK_APPROVED')
      .map((e) => e.refId ?? e.id),
  )
  return tasks.size
}

export function pointsEarnedBetween(
  ledger: LedgerEvent[],
  childId: string,
  fromDate: string,
  toDate: string,
): number {
  return eventsFor(ledger, childId)
    .filter((e) => e.delta > 0 && e.date >= fromDate && e.date <= toDate)
    .reduce((sum, e) => sum + e.delta, 0)
}

// --- Jars ------------------------------------------------------------------

export const EQUAL_SPLIT: JarSplit = { save: 100, spend: 0, give: 0 }

/**
 * Split an incoming amount across the three jars with largest-remainder
 * rounding, so the parts always add back up to the whole (no lost point).
 */
export function splitPoints(amount: number, split: JarSplit): Record<JarKind, number> {
  const keys: JarKind[] = ['save', 'spend', 'give']
  const raw = keys.map((k) => (amount * split[k]) / 100)
  const floored = raw.map(Math.floor)
  let remainder = amount - floored.reduce((a, b) => a + b, 0)
  const order = keys
    .map((_, i) => ({ i, frac: raw[i] - floored[i] }))
    .sort((a, b) => b.frac - a.frac)
  for (const { i } of order) {
    if (remainder <= 0) break
    floored[i] += 1
    remainder -= 1
  }
  return { save: floored[0], spend: floored[1], give: floored[2] }
}

export function normalizeSplit(split: JarSplit): JarSplit {
  const total = split.save + split.spend + split.give
  if (total === 100) return split
  if (total <= 0) return EQUAL_SPLIT
  const scaled = splitPoints(100, {
    save: (split.save / total) * 100,
    spend: (split.spend / total) * 100,
    give: (split.give / total) * 100,
  })
  return scaled
}

/** Balance held in one jar. Events without a jar tag default to `save`. */
export function jarBalance(ledger: LedgerEvent[], childId: string, jar: JarKind): number {
  return eventsFor(ledger, childId)
    .filter((e) => (e.jar ?? 'save') === jar)
    .reduce((sum, e) => sum + e.delta, 0)
}

export function jarBalances(ledger: LedgerEvent[], childId: string): Record<JarKind, number> {
  return {
    save: jarBalance(ledger, childId, 'save'),
    spend: jarBalance(ledger, childId, 'spend'),
    give: jarBalance(ledger, childId, 'give'),
  }
}

// --- Gift cap --------------------------------------------------------------

export const GIFT_WEEKLY_CAP = 50 // pts per family member, per child, per week

export function giftedThisWeek(
  ledger: LedgerEvent[],
  memberId: string,
  childId: string,
  wk: string = weekKey(),
): number {
  return ledger
    .filter(
      (e) =>
        e.type === 'POINTS_GIFTED' &&
        e.actorId === memberId &&
        e.childId === childId &&
        e.weekKey === wk,
    )
    .reduce((sum, e) => sum + e.delta, 0)
}

export function remainingGiftAllowance(
  ledger: LedgerEvent[],
  memberId: string,
  childId: string,
  wk: string = weekKey(),
): number {
  return Math.max(0, GIFT_WEEKLY_CAP - giftedThisWeek(ledger, memberId, childId, wk))
}

// --- Streaks ---------------------------------------------------------------

export interface StreakInfo {
  current: number
  best: number
  lastActiveDate: string | null
  /** True when today has no approval yet but yesterday did — "don't lose it". */
  atRisk: boolean
}

/**
 * Streak = consecutive days with >= 1 approved task, derived from the ledger.
 * A streak whose last day is older than yesterday is over, so `current` is 0.
 */
export function streakInfo(
  ledger: LedgerEvent[],
  childId: string,
  today: string = todayKey(),
): StreakInfo {
  const days = [
    ...new Set(
      eventsFor(ledger, childId)
        .filter((e) => e.type === 'TASK_APPROVED')
        .map((e) => e.date),
    ),
  ].sort()

  if (days.length === 0) {
    return { current: 0, best: 0, lastActiveDate: null, atRisk: false }
  }

  // Longest run anywhere in history = best streak.
  let best = 1
  let run = 1
  for (let i = 1; i < days.length; i++) {
    run = addDays(days[i - 1], 1) === days[i] ? run + 1 : 1
    if (run > best) best = run
  }

  // Run ending at the last active day = the live streak (0 if it's stale).
  const last = days[days.length - 1]
  let current = 0
  if (last === today || addDays(last, 1) === today) {
    current = 1
    for (let i = days.length - 1; i > 0; i--) {
      if (addDays(days[i - 1], 1) === days[i]) current++
      else break
    }
  }

  return {
    current,
    best,
    lastActiveDate: last,
    atRisk: current > 0 && last !== today,
  }
}

export function activeDays(ledger: LedgerEvent[], childId: string): Set<string> {
  return new Set(
    eventsFor(ledger, childId)
      .filter((e) => e.type === 'TASK_APPROVED')
      .map((e) => e.date),
  )
}
