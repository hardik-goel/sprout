// A2 — the Sunday Family Story.
//
// The same week's data a dashboard would show, written the way a parent would
// actually say it out loud. This is the thing that gets forwarded to the family
// WhatsApp group, which is also our cheapest marketing.
//
// Pure text generation: no dates fetched, no randomness that can't be replayed
// (variant choice is a hash of childId + week, so the same week reads the same).

import type { AppData, Child, Reward } from './types'
import { balance } from './ledger'
import { weekStats, habitGrids, type WeekStats } from './insights'
import { shortDate, todayKey } from './dates'
import { jarProgress } from './rewards'

export interface FamilyStory {
  title: string
  subtitle: string
  /** Two to five short sentences — the story itself. */
  lines: string[]
  stats: { label: string; value: string; emoji: string }[]
  goalLine: string | null
  closing: string
  emoji: string
  /** Plus adds the habit spotlight + goal countdown; free gets the core three. */
  rich: boolean
}

const OPENERS = [
  (n: string) => `What a week for ${n}!`,
  (n: string) => `${n} showed up this week.`,
  (n: string) => `Big week in ${n}'s garden.`,
]

function variant(seed: string, count: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return h % count
}

function streakLine(name: string, s: WeekStats): string | null {
  if (s.streak >= 3) return `${s.streak} days in a row now — the streak is holding. 🔥`
  if (s.activeDays >= 3) return `${name} was active on ${s.activeDays} of the last 7 days.`
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

  const opener = OPENERS[variant(child.id + stats.to, OPENERS.length)](child.name)

  const lines: string[] = [opener]
  lines.push(
    stats.tasksDone > 0
      ? `${stats.tasksDone} task${stats.tasksDone === 1 ? '' : 's'} finished and ${stats.pointsEarned} ⭐ earned.`
      : `A quiet week — no tasks finished yet. Next week is a fresh start. 🌱`,
  )
  const sl = streakLine(child.name, stats)
  if (sl) lines.push(sl)
  if (stats.screenFreeWins > 0) {
    lines.push(
      `${stats.screenFreeWins} screen-free win${stats.screenFreeWins === 1 ? '' : 's'} — reading, moving, helping instead of a screen. 📵`,
    )
  }

  let goalLine: string | null = null
  if (goal) {
    const { remaining, pct } = jarProgress(bal, goal.cost)
    goalLine =
      remaining === 0
        ? `${goal.title} ${goal.emoji} is unlocked — time to make it happen!`
        : `${remaining} ⭐ away from ${goal.title} ${goal.emoji} (${pct}% there).`
    if (rich) lines.push(goalLine)
  }

  if (rich) {
    const grids = habitGrids(data, child.id, 7, today)
    const best = grids[0]
    if (best && best.doneCount >= 3) {
      lines.push(`Habit of the week: ${best.emoji} ${best.title}, ${best.doneCount}/7 days.`)
    }
  }

  return {
    title: `${child.name}'s week`,
    subtitle: `${shortDate(stats.from)} – ${shortDate(stats.to)}`,
    lines,
    stats: [
      { label: 'Tasks done', value: String(stats.tasksDone), emoji: '✅' },
      { label: 'Points earned', value: String(stats.pointsEarned), emoji: '⭐' },
      { label: 'Screen-free wins', value: String(stats.screenFreeWins), emoji: '📵' },
      ...(rich ? [{ label: 'Best streak', value: `${stats.bestStreak}d`, emoji: '🔥' }] : []),
    ],
    goalLine,
    closing: rich ? `Shabaash, ${child.name}! 🌟` : `Grown with Sprout 🌱`,
    emoji: child.avatar,
    rich,
  }
}

/** Plain-text version for a WhatsApp share sheet. */
export function storyToText(story: FamilyStory): string {
  return [
    `🌱 ${story.title} (${story.subtitle})`,
    '',
    ...story.lines,
    '',
    story.stats.map((s) => `${s.emoji} ${s.value} ${s.label.toLowerCase()}`).join('  ·  '),
    '',
    story.closing,
  ].join('\n')
}
