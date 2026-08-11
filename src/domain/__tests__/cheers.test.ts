// A3 — which cheer a child hears, and why it must not be random.

import { describe, expect, it } from 'vitest'
import type { VoiceCheer } from '../types'
import { canAddCheer, cheersFor, MAX_CHEERS, pickCheer } from '../cheers'

function cheer(id: string, childId: string | null): VoiceCheer {
  return {
    id,
    audioId: `audio_${id}`,
    memberId: 'mem_dadi',
    childId,
    durationMs: 3000,
    createdAt: '2026-08-11T10:00:00.000Z',
  }
}

const CHEERS = [cheer('a', null), cheer('b', 'c1'), cheer('c', 'c2')]

describe('cheersFor', () => {
  it('gives a child their own cheers plus the family-wide ones', () => {
    expect(cheersFor(CHEERS, 'c1').map((c) => c.id)).toEqual(['a', 'b'])
    expect(cheersFor(CHEERS, 'c2').map((c) => c.id)).toEqual(['a', 'c'])
  })

  it('gives a child with nothing recorded for them just the shared ones', () => {
    expect(cheersFor(CHEERS, 'c9').map((c) => c.id)).toEqual(['a'])
  })
})

describe('pickCheer', () => {
  it('returns nothing when the family has recorded nothing', () => {
    expect(pickCheer([], 'c1', 0)).toBeNull()
  })

  it('rotates through the eligible cheers as approvals add up', () => {
    // Two cheers apply to c1, so consecutive approvals alternate. Playing the
    // same clip every time is how a grandmother's voice turns into a chime.
    const heard = [0, 1, 2, 3].map((n) => pickCheer(CHEERS, 'c1', n)!.id)
    expect(heard).toEqual(['a', 'b', 'a', 'b'])
  })

  it('is replayable: the same rotation always picks the same cheer', () => {
    expect(pickCheer(CHEERS, 'c1', 7)!.id).toBe(pickCheer(CHEERS, 'c1', 7)!.id)
  })

  it('survives a negative counter rather than reading off the end', () => {
    expect(pickCheer(CHEERS, 'c1', -1)).not.toBeNull()
  })
})

describe('canAddCheer', () => {
  it('stops at the cap, because these live in localStorage', () => {
    const many = Array.from({ length: MAX_CHEERS }, (_, i) => cheer(`x${i}`, null))
    expect(canAddCheer(many.slice(0, -1))).toBe(true)
    expect(canAddCheer(many)).toBe(false)
  })
})
