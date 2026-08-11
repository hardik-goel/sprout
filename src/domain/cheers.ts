// A3 — voice cheers.
//
// Which recorded cheer a child hears when a task is approved. Pure: the caller
// passes the cheers and a counter, and gets back a choice it can replay.

import type { ID, VoiceCheer } from './types'

/** Longest cheer we will keep. A cheer is a hug, not a voicemail. */
export const MAX_CHEER_MS = 6_000

/** How many cheers one family may store, so localStorage stays sane. */
export const MAX_CHEERS = 12

/** Cheers that apply to a child: their own, plus the family-wide ones. */
export function cheersFor(cheers: VoiceCheer[], childId: ID): VoiceCheer[] {
  return cheers.filter((c) => c.childId === null || c.childId === childId)
}

/**
 * Pick the cheer to play, rotating by how many tasks the child has had
 * approved. Rotation matters: the same clip on every single approval stops
 * being Dadi and starts being a notification sound. Deriving the index from a
 * counter rather than randomness keeps the choice replayable — re-opening the
 * celebration plays the same cheer, not a new one.
 */
export function pickCheer(
  cheers: VoiceCheer[],
  childId: ID,
  rotation: number,
): VoiceCheer | null {
  const eligible = cheersFor(cheers, childId)
  if (eligible.length === 0) return null
  const index = ((rotation % eligible.length) + eligible.length) % eligible.length
  return eligible[index]
}

export function canAddCheer(cheers: VoiceCheer[]): boolean {
  return cheers.length < MAX_CHEERS
}
