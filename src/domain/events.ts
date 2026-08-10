// Factories that turn an intent ("approve this task") into ledger events.
// Nothing here mutates anything — callers append the result to the ledger.

import type {
  ActorRole,
  AssignedTask,
  JarKind,
  JarSplit,
  LedgerEvent,
  Reward,
} from './types'
import { splitPoints } from './ledger'
import { todayKey, weekKey } from './dates'
import { uuid } from './ids'

interface Ctx {
  actorId: string
  actorRole: ActorRole
  at?: string // ISO — injectable so seeds/tests are deterministic
  date?: string // YYYY-MM-DD
}

function stamp(ctx: Ctx) {
  const date = ctx.date ?? todayKey()
  return {
    at: ctx.at ?? new Date().toISOString(),
    date,
    weekKey: weekKey(date),
    actorId: ctx.actorId,
    actorRole: ctx.actorRole,
  }
}

/**
 * Approving a task credits points. With a three-jar split we emit one event
 * per non-empty jar, all sharing `refId` (the task id) so the approval is still
 * one countable event for the garden and the album.
 */
export function taskApprovedEvents(
  task: AssignedTask,
  split: JarSplit,
  ctx: Ctx,
): LedgerEvent[] {
  const base = stamp(ctx)
  const parts = splitPoints(task.points, split)
  const jars = (Object.keys(parts) as JarKind[]).filter((j) => parts[j] > 0)
  return jars.map((jar) => ({
    id: uuid(),
    type: 'TASK_APPROVED' as const,
    childId: task.childId,
    delta: parts[jar],
    reason: task.title,
    refId: task.id,
    jar,
    ...base,
  }))
}

/** Redeeming spends from a jar (spend jar if it can cover it, else save). */
export function rewardRedeemedEvent(
  reward: Reward,
  childId: string,
  jar: JarKind,
  ctx: Ctx,
): LedgerEvent {
  return {
    id: uuid(),
    type: 'REWARD_REDEEMED',
    childId,
    delta: -Math.abs(reward.cost),
    reason: reward.title,
    refId: reward.id,
    jar,
    ...stamp(ctx),
  }
}

export function pointsGiftedEvent(
  childId: string,
  points: number,
  note: string,
  ctx: Ctx,
): LedgerEvent {
  return {
    id: uuid(),
    type: 'POINTS_GIFTED',
    childId,
    delta: Math.abs(points),
    reason: note,
    refId: null,
    jar: 'save',
    ...stamp(ctx),
  }
}

/**
 * Undo / manual correction. We never edit or delete a past event — we append
 * its mirror image, so the history stays a truthful record of what happened.
 */
export function adjustmentEvent(
  childId: string,
  delta: number,
  reason: string,
  ctx: Ctx,
  opts: { refId?: string | null; jar?: JarKind } = {},
): LedgerEvent {
  return {
    id: uuid(),
    type: 'ADJUSTMENT',
    childId,
    delta,
    reason,
    refId: opts.refId ?? null,
    jar: opts.jar ?? 'save',
    ...stamp(ctx),
  }
}

/** Compensating events that exactly reverse a prior approval. */
export function reverseEvents(events: LedgerEvent[], reason: string, ctx: Ctx): LedgerEvent[] {
  return events.map((e) =>
    adjustmentEvent(e.childId, -e.delta, reason, ctx, { refId: e.refId, jar: e.jar }),
  )
}
