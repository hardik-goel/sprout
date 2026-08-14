// The finish-the-day bonus, the screen locks and the shared streak arithmetic.
// All three are rules, so they are tested here as rules — on paper, with no
// React and no store in sight.

import { describe, expect, it } from 'vitest'
import {
  isPerfectDay,
  perfectDayBonus,
  perfectDayRefId,
  PERFECT_DAY_MIN_TASKS,
} from '../bonus'
import { hashPin, hasPin, isValidPin, PIN_LENGTH, verifyPin } from '../pin'
import { dayStreak, todayKey, addDays } from '../dates'
import type { AssignedTask, TaskStatus } from '../types'

const task = (status: TaskStatus, i = 0): AssignedTask => ({
  id: `task_${i}`,
  childId: 'child_a',
  templateId: 'tpl_teeth',
  title: 'Brush teeth',
  emoji: '🪥',
  points: 10,
  status,
  date: '2026-03-08',
  photoId: null,
  completedAt: null,
  approvedAt: null,
})

describe('finish-the-day bonus', () => {
  it('pays only when every assigned task is approved', () => {
    expect(isPerfectDay([task('approved', 1), task('approved', 2)])).toBe(true)
    expect(isPerfectDay([task('approved', 1), task('pending', 2)])).toBe(false)
    expect(isPerfectDay([task('approved', 1), task('todo', 2)])).toBe(false)
  })

  it('does not pay for a day that was only ever one task', () => {
    expect(PERFECT_DAY_MIN_TASKS).toBe(2)
    expect(isPerfectDay([task('approved')])).toBe(false)
    expect(isPerfectDay([])).toBe(false)
  })

  it('is worth about one task, scaled to the child like everything else', () => {
    expect(perfectDayBonus(3)).toBe(6)
    expect(perfectDayBonus(5)).toBe(8)
    expect(perfectDayBonus(7)).toBe(10)
  })

  it('has a stable reference per child per day, which is what makes it idempotent', () => {
    expect(perfectDayRefId('child_a', '2026-03-08')).toBe('perfect_child_a_2026-03-08')
    expect(perfectDayRefId('child_a', '2026-03-08')).toBe(perfectDayRefId('child_a', '2026-03-08'))
    expect(perfectDayRefId('child_b', '2026-03-08')).not.toBe(
      perfectDayRefId('child_a', '2026-03-08'),
    )
  })
})

describe('screen locks', () => {
  it('takes four digits and nothing else', () => {
    expect(PIN_LENGTH).toBe(4)
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('0000')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })

  it('never stores the digits themselves', () => {
    const hash = hashPin('1234')
    expect(hash).not.toContain('1234')
    expect(hashPin('1234')).toBe(hash) // stable
    expect(hashPin('1235')).not.toBe(hash)
  })

  it('verifies a PIN, and treats "no PIN" as an open door', () => {
    const hash = hashPin('4321')
    expect(verifyPin('4321', hash)).toBe(true)
    expect(verifyPin('1234', hash)).toBe(false)
    expect(verifyPin('anything', null)).toBe(true)
    expect(hasPin(null)).toBe(false)
    expect(hasPin(hash)).toBe(true)
  })
})

describe('day streaks', () => {
  const today = todayKey()

  it('counts a run that reaches today', () => {
    const days = [addDays(today, -2), addDays(today, -1), today]
    expect(dayStreak(days, today)).toMatchObject({ current: 3, best: 3, atRisk: false })
  })

  it('keeps yesterday’s run alive but flags it as at risk', () => {
    const days = [addDays(today, -2), addDays(today, -1)]
    expect(dayStreak(days, today)).toMatchObject({ current: 2, atRisk: true })
  })

  it('ends a run that stopped before yesterday, without losing the best', () => {
    const days = [addDays(today, -9), addDays(today, -8), addDays(today, -7)]
    expect(dayStreak(days, today)).toMatchObject({ current: 0, best: 3, atRisk: false })
  })

  it('ignores repeats and order — a day is a day', () => {
    const days = [today, addDays(today, -1), today]
    expect(dayStreak(days, today).current).toBe(2)
  })

  it('has nothing to say about no days at all', () => {
    expect(dayStreak([], today)).toEqual({
      current: 0,
      best: 0,
      lastActiveDate: null,
      atRisk: false,
    })
  })
})
