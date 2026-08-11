// A2 — the Sunday Family Story.
//
// The same week's data a dashboard would show, written the way a parent would
// actually say it out loud. This is the thing that gets forwarded to the family
// WhatsApp group, which is also our cheapest marketing.
//
// The domain stays pure and language-free: it decides WHICH sentences the week
// deserves and with what numbers, and returns i18n keys + vars. The UI layer
// turns those into English or Hindi. Variant choice is a hash of childId + week,
// so the same week always reads the same.

import type { AppData, Child, Reward } from './types'
import { balance } from './ledger'
import { weekStats, habitGrids, type WeekStats } from './insights'
import { todayKey } from './dates'
import { jarProgress } from './rewards'

/** A translatable fragment: a dictionary key plus its interpolation values. */
export interface Phrase {
  key: string
  /**
   * A value may itself be `{ key }` — a nested dictionary lookup. That is how
   * the domain names one of our own task templates without owning a word of
   * any language.
   */
  vars?: Record<string, string | number | { key: string }>
}

export interface FamilyStory {
  title: Phrase
  /** Date range, already formatted by the caller's locale-aware formatter. */
  from: string
  to: string
  lines: Phrase[]
  stats: { labelKey: string; value: string; emoji: string }[]
  goalLine: Phrase | null
  closing: Phrase
  emoji: string
  /** Plus adds the goal countdown and habit spotlight; free gets the core. */
  rich: boolean
}

const OPENER_KEYS = ['story.opener.1', 'story.opener.2', 'story.opener.3']

function variant(seed: string, count: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % count
}

function streakPhrase(name: string, s: WeekStats): Phrase | null {
  if (s.streak >= 3) return { key: 'story.streak', vars: { n: s.streak } }
  if (s.activeDays >= 3) return { key: 'story.activeDays', vars: { name, n: s.activeDays } }
  return null
}

export function buildFamilyStory(
  data: AppData,
  child: Child,
  opts: { rich?: boolean; today?: string } = {},
): FamilyStory {
  const today = opts.today ?? todayKey()
  const rich = opts.rich ?? data.isPlus
  const stats = weekStats(data, child.id, today)
  const goal: Reward | undefined = data.rewards.find((r) => r.id === child.goalId)
  const bal = balance(data.ledger, child.id)

  const lines: Phrase[] = [
    {
      key: OPENER_KEYS[variant(child.id + stats.to, OPENER_KEYS.length)],
      vars: { name: child.name },
    },
  ]

  lines.push(
    stats.tasksDone > 0
      ? { key: 'story.tasksAndPoints', vars: { tasks: stats.tasksDone, points: stats.pointsEarned } }
      : { key: 'story.quietWeek' },
  )

  const streak = streakPhrase(child.name, stats)
  if (streak) lines.push(streak)

  if (stats.screenFreeWins > 0) {
    lines.push({ key: 'story.screenFree', vars: { n: stats.screenFreeWins } })
  }

  let goalLine: Phrase | null = null
  if (goal) {
    const { remaining, pct } = jarProgress(bal, goal.cost)
    goalLine =
      remaining === 0
        ? { key: 'story.goalReached', vars: { title: goal.title, emoji: goal.emoji } }
        : { key: 'story.goalAway', vars: { n: remaining, title: goal.title, emoji: goal.emoji, pct } }
    if (rich) lines.push(goalLine)
  }

  if (rich) {
    const best = habitGrids(data, child.id, 7, today)[0]
    if (best && best.doneCount >= 3) {
      lines.push({
        key: 'story.habitOfWeek',
        // The habit's name is our content, so it goes out as a key for the UI
        // layer to resolve — the domain never picks a language.
        vars: {
          emoji: best.emoji,
          title: { key: `task.title.${best.templateId}` },
          n: best.doneCount,
        },
      })
    }
  }

  return {
    title: { key: 'story.cardTitle', vars: { name: child.name } },
    from: stats.from,
    to: stats.to,
    lines,
    stats: [
      { labelKey: 'digest.tasksDone', value: String(stats.tasksDone), emoji: '✅' },
      { labelKey: 'digest.points', value: String(stats.pointsEarned), emoji: '⭐' },
      { labelKey: 'digest.screenFree', value: String(stats.screenFreeWins), emoji: '📵' },
      ...(rich ? [{ labelKey: 'insights.best', value: `${stats.bestStreak}d`, emoji: '🔥' }] : []),
    ],
    goalLine,
    closing: rich
      ? { key: 'story.closingRich', vars: { name: child.name } }
      : { key: 'story.closingFree' },
    emoji: child.avatar,
    rich,
  }
}

/** Turn a story into shareable plain text using the caller's translator. */
export function storyToText(
  story: FamilyStory,
  translate: (key: string, vars?: Phrase['vars']) => string,
  range: string,
): string {
  return [
    `🌱 ${translate(story.title.key, story.title.vars)} (${range})`,
    '',
    ...story.lines.map((l) => translate(l.key, l.vars)),
    '',
    story.stats
      .map((s) => `${s.emoji} ${s.value} ${translate(s.labelKey).toLowerCase()}`)
      .join('  ·  '),
    '',
    translate(story.closing.key, story.closing.vars),
  ].join('\n')
}
