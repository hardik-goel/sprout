// End-to-end domain flow: assign → approve → ledger → derived state → undo.
// No React, no storage — just the rules.

import { describe, expect, it } from 'vitest'
import type { AppData, AssignedTask, LedgerEvent, Reward } from '../types'
import {
  adjustmentEvent,
  pointsGiftedEvent,
  reverseEvents,
  rewardRedeemedEvent,
  taskApprovedEvents,
} from '../events'
import { appendEvent, approvedTaskCount, balance, jarBalances, streakInfo } from '../ledger'
import { gardenStage } from '../garden'
import { habitGrids, habitToNudge, recentActivity, weekStats } from '../insights'
import { buildFamilyStory, storyToText, type Phrase } from '../story'
import { addDays } from '../dates'

const TODAY = '2026-06-15'
const CTX = { actorId: 'p1', actorRole: 'parent' as const, at: `${TODAY}T12:00:00.000Z`, date: TODAY }

function task(over: Partial<AssignedTask> = {}): AssignedTask {
  return {
    id: 'task1',
    childId: 'c1',
    templateId: 'tpl_teeth',
    title: 'Brush teeth',
    emoji: '🪥',
    points: 10,
    status: 'pending',
    date: TODAY,
    photoId: null,
    completedAt: `${TODAY}T08:00:00.000Z`,
    approvedAt: null,
    ...over,
  }
}

const SINGLE = { save: 100, spend: 0, give: 0 }
const THREE = { save: 60, spend: 30, give: 10 }

describe('approval flow', () => {
  it('credits points, grows the garden, and starts a streak', () => {
    let ledger: LedgerEvent[] = []
    for (const e of taskApprovedEvents(task(), SINGLE, CTX)) ledger = appendEvent(ledger, e)

    expect(balance(ledger, 'c1')).toBe(10)
    expect(approvedTaskCount(ledger, 'c1')).toBe(1)
    expect(gardenStage(approvedTaskCount(ledger, 'c1'))).toBe('seed')
    expect(streakInfo(ledger, 'c1', TODAY).current).toBe(1)
  })

  it('splits an approval across three jars without losing a point', () => {
    let ledger: LedgerEvent[] = []
    for (const e of taskApprovedEvents(task({ points: 10 }), THREE, CTX)) {
      ledger = appendEvent(ledger, e)
    }
    expect(balance(ledger, 'c1')).toBe(10)
    expect(jarBalances(ledger, 'c1')).toEqual({ save: 6, spend: 3, give: 1 })
    expect(approvedTaskCount(ledger, 'c1')).toBe(1) // still ONE task
  })

  it('undo is a compensating event, not a deletion', () => {
    let ledger: LedgerEvent[] = []
    const approvals = taskApprovedEvents(task(), THREE, CTX)
    for (const e of approvals) ledger = appendEvent(ledger, e)
    for (const e of reverseEvents(approvals, 'Undo: Brush teeth', CTX)) {
      ledger = appendEvent(ledger, e)
    }
    expect(balance(ledger, 'c1')).toBe(0)
    expect(jarBalances(ledger, 'c1')).toEqual({ save: 0, spend: 0, give: 0 })
    // History is preserved, not rewritten: both the approval and the reversal exist.
    expect(ledger).toHaveLength(approvals.length * 2)
  })

  it('spends on redemption and accepts a gift', () => {
    const reward: Reward = {
      id: 'rw1',
      childId: 'c1',
      title: 'Zoo trip',
      emoji: '🦁',
      cost: 30,
      tags: ['outing'],
      redeemed: false,
      redeemedAt: null,
      fulfilled: false,
    }
    let ledger: LedgerEvent[] = []
    for (const e of taskApprovedEvents(task({ points: 40 }), SINGLE, CTX)) {
      ledger = appendEvent(ledger, e)
    }
    ledger = appendEvent(ledger, rewardRedeemedEvent(reward, 'c1', 'save', CTX))
    expect(balance(ledger, 'c1')).toBe(10)

    ledger = appendEvent(
      ledger,
      pointsGiftedEvent('c1', 20, 'Shabaash beta!', { ...CTX, actorId: 'dadi', actorRole: 'relative' }),
    )
    expect(balance(ledger, 'c1')).toBe(30)

    ledger = appendEvent(ledger, adjustmentEvent('c1', -5, 'Correction', CTX))
    expect(balance(ledger, 'c1')).toBe(25)
  })
})

// --- A small fake family, used for the insights + story assertions ----------

function buildData(): AppData {
  const days = [addDays(TODAY, -2), addDays(TODAY, -1), TODAY]
  const tasks: AssignedTask[] = []
  let ledger: LedgerEvent[] = []

  days.forEach((date, i) => {
    const teeth = task({ id: `teeth${i}`, date, status: 'approved', points: 6 })
    tasks.push(teeth)
    for (const e of taskApprovedEvents(teeth, SINGLE, { ...CTX, date, at: `${date}T12:00:00.000Z` })) {
      ledger = appendEvent(ledger, e)
    }
    // Reading is assigned every day but only lands on the first — the habit to nudge.
    const read = task({
      id: `read${i}`,
      templateId: 'tpl_read',
      title: 'Read a story',
      emoji: '📖',
      date,
      points: 6,
      status: i === 0 ? 'approved' : 'todo',
    })
    tasks.push(read)
    if (i === 0) {
      for (const e of taskApprovedEvents(read, SINGLE, { ...CTX, date, at: `${date}T13:00:00.000Z` })) {
        ledger = appendEvent(ledger, e)
      }
    }
  })

  return {
    version: 2,
    locale: 'en',
    parentName: 'Aanya',
    isPlus: false,
    onboarded: true,
    activeChildId: 'c1',
    children: [{ id: 'c1', name: 'Vir', age: 3, avatar: '🦖', goalId: 'rw1', jarSplit: SINGLE }],
    members: [{ id: 'p1', name: 'Aanya', role: 'parent', avatar: '👩' }],
    templates: [
      { id: 'tpl_teeth', title: 'Brush teeth', emoji: '🪥', category: 'health', basePoints: 10, pack: 'basic', packName: 'Daily Basics', packKey: 'pack.basics', minAge: 2, maxAge: 8 },
      { id: 'tpl_read', title: 'Read a story', emoji: '📖', category: 'learning', basePoints: 12, pack: 'basic', packName: 'Little Learner', packKey: 'pack.littleLearner', minAge: 2, maxAge: 8 },
    ],
    tasks,
    rewards: [
      { id: 'rw1', childId: 'c1', title: 'Zoo trip', emoji: '🦁', cost: 60, tags: ['outing'], redeemed: false, redeemedAt: null, fulfilled: false },
    ],
    ledger,
  }
}

describe('insights', () => {
  const data = buildData()

  it('counts the week honestly', () => {
    const s = weekStats(data, 'c1', TODAY)
    expect(s.tasksDone).toBe(4) // 3 brushings + 1 reading
    expect(s.pointsEarned).toBe(24)
    expect(s.activeDays).toBe(3)
    expect(s.streak).toBe(3)
    // Health + learning count as active screen-free wins.
    expect(s.screenFreeWins).toBe(4)
  })

  it('builds a 7-day grid per habit, busiest first', () => {
    const grids = habitGrids(data, 'c1', 7, TODAY)
    expect(grids[0].templateId).toBe('tpl_teeth')
    expect(grids[0].doneCount).toBe(3)
    expect(grids[0].days).toHaveLength(7)
    expect(grids[0].days[6].done).toBe(true) // today
  })

  it('picks the weakest habit to nudge', () => {
    const nudge = habitToNudge(habitGrids(data, 'c1', 7, TODAY))
    expect(nudge?.templateId).toBe('tpl_read')
  })

  it('lists recent ledger activity newest first', () => {
    const recent = recentActivity(data, 'c1', 3)
    expect(recent).toHaveLength(3)
    expect(recent[0].at >= recent[1].at).toBe(true)
  })
})

describe('sunday family story', () => {
  const data = buildData()
  const child = data.children[0]
  const keysOf = (s: ReturnType<typeof buildFamilyStory>) => s.lines.map((l) => l.key)
  /**
   * Stand-in translator: renders "key(var=value)" so tests read the structure.
   * A var that is itself `{ key }` renders as that key, which is how the domain
   * hands back one of our own task names without naming it in any language.
   */
  const fakeT = (key: string, vars?: Phrase['vars']) =>
    vars
      ? `${key}(${Object.entries(vars)
          .map(([k, v]) => `${k}=${typeof v === 'object' ? v.key : v}`)
          .join(',')})`
      : key

  it('chooses the sentences the week actually earned', () => {
    const story = buildFamilyStory(data, child, { rich: false, today: TODAY })
    expect(story.title.vars).toMatchObject({ name: 'Vir' })
    expect(keysOf(story)).toContain('story.tasksAndPoints')
    expect(story.lines.find((l) => l.key === 'story.tasksAndPoints')!.vars).toMatchObject({
      tasks: 4,
      points: 24,
    })
    expect(story.stats).toHaveLength(3)
    expect(story.rich).toBe(false)
  })

  it('stays language-free — no English leaks out of the domain', () => {
    const story = buildFamilyStory(data, child, { rich: true, today: TODAY })
    const text = JSON.stringify([story.lines, story.closing, story.title])
    // Only keys, numbers and data the family typed themselves (names, titles).
    expect(text).not.toMatch(/week for|showed up|in a row|screen-free/)
  })

  it('is deterministic — the same week reads the same', () => {
    const a = buildFamilyStory(data, child, { rich: false, today: TODAY })
    const b = buildFamilyStory(data, child, { rich: false, today: TODAY })
    expect(a).toEqual(b)
  })

  it('adds the goal countdown and habit spotlight on Plus', () => {
    const rich = buildFamilyStory(data, child, { rich: true, today: TODAY })
    expect(rich.stats).toHaveLength(4)
    expect(keysOf(rich)).toContain('story.goalAway')
    expect(keysOf(rich)).toContain('story.habitOfWeek')
    expect(rich.closing.key).toBe('story.closingRich')
  })

  it('stays kind in a week with nothing done', () => {
    const empty = { ...data, tasks: [], ledger: [] }
    const story = buildFamilyStory(empty, child, { rich: false, today: TODAY })
    expect(keysOf(story)).toContain('story.quietWeek')
  })

  it('renders shareable plain text through the caller’s translator', () => {
    const story = buildFamilyStory(data, child, { rich: true, today: TODAY })
    const text = storyToText(story, fakeT, '9 Jun – 15 Jun')
    expect(text).toContain('🌱')
    expect(text).toContain('9 Jun – 15 Jun')
    expect(text).toContain('story.tasksAndPoints(tasks=4,points=24)')
    expect(text.split('\n').length).toBeGreaterThan(4)
  })
})
