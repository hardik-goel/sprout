// The seed is demo data, but the demo is the pitch — if the numbers on the
// first screen don't add up, nothing else matters.

import { describe, expect, it } from 'vitest'
import { buildSeed } from '@/lib/seed'
import { balance, approvedTaskCount, streakInfo } from '../ledger'
import { entitlements } from '../entitlements'
import { rewardsForChild } from '../rewards'

describe('seed family', () => {
  const data = buildSeed()

  it('lands on a populated, onboarded home', () => {
    expect(data.onboarded).toBe(true)
    expect(data.parentName).toBe('Aanya')
    expect(data.children.map((c) => c.name)).toEqual(['Vir', 'Ira'])
    expect(data.members.map((m) => m.name)).toEqual(['Aanya', 'Dadi', 'Mama'])
    expect(data.isPlus).toBe(false)
  })

  it('shows Vir at 90 points toward the 150-point zoo trip', () => {
    expect(balance(data.ledger, 'child_vir')).toBe(90)
    const zoo = data.rewards.find((r) => r.id === 'rw_zoo')!
    expect(zoo.cost).toBe(150)
    expect(data.children[0].goalId).toBe('rw_zoo')
  })

  it('gives Vir a live 5-day streak', () => {
    const s = streakInfo(data.ledger, 'child_vir')
    expect(s.current).toBe(5)
    expect(s.best).toBeGreaterThanOrEqual(5)
  })

  it('has enough approved history for the garden and grids', () => {
    expect(approvedTaskCount(data.ledger, 'child_vir')).toBeGreaterThan(9)
    expect(approvedTaskCount(data.ledger, 'child_ira')).toBeGreaterThan(5)
  })

  it('leaves a task waiting for approval, so the core loop is one tap away', () => {
    expect(data.tasks.some((t) => t.status === 'pending' && t.photoId)).toBe(true)
  })

  it('has photos to fill the growth album', () => {
    const withPhotos = data.tasks.filter((t) => t.status === 'approved' && t.photoId)
    expect(withPhotos.length).toBeGreaterThan(3)
  })

  it('keeps rewards per-child, plus some shared ones', () => {
    const virs = rewardsForChild(data.rewards, 'child_vir')
    expect(virs.some((r) => r.id === 'rw_zoo')).toBe(true)
    expect(virs.some((r) => r.id === 'rw_bat')).toBe(false) // Ira's
    expect(virs.some((r) => r.childId === null)).toBe(true) // shared
  })

  it('starts free, so the second child is behind the Plus gate', () => {
    expect(entitlements(data.isPlus).canAddChild(data.children.length)).toBe(false)
  })

  it('has Dadi partway through her weekly gift cap', () => {
    const gifts = data.ledger.filter((e) => e.type === 'POINTS_GIFTED')
    expect(gifts).toHaveLength(1)
    expect(gifts[0].actorId).toBe('mem_dadi')
    expect(gifts[0].delta).toBe(20)
  })

  it('gives Ira a three-jar split and Vir a single jar', () => {
    const [vir, ira] = data.children
    expect(vir.jarSplit).toEqual({ save: 100, spend: 0, give: 0 })
    expect(ira.jarSplit.spend).toBeGreaterThan(0)
    expect(ira.jarSplit.save + ira.jarSplit.spend + ira.jarSplit.give).toBe(100)
  })

  it('generates unique ids across tasks and events', () => {
    const ids = [...data.tasks.map((t) => t.id), ...data.ledger.map((e) => e.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })
})
