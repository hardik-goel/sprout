import { useMemo } from 'react'
import { CalendarDays, Sparkles, Star, TrendingUp } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { PlusBadge } from '@/components/PlusBadge'
import { PlusGate } from '@/components/PlusGate'
import { addDays, shortDate, todayKey } from '@/lib/dates'
import { effectiveStreak } from '@/lib/game'

export function WeeklyDigest() {
  return (
    <div className="pb-8">
      <PageHeader title="Weekly digest" subtitle="Your family’s week" right={<PlusBadge />} />
      <PlusGate
        title="A calm weekly recap"
        blurb="Every Sunday, a friendly summary of what your kids did — wins, points, and the habit of the week."
      >
        <DigestBody />
      </PlusGate>
    </div>
  )
}

function DigestBody() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())

  const stats = useMemo(() => {
    if (!activeChild) return null
    const today = todayKey()
    const start = addDays(today, -6)
    const week = data.tasks.filter(
      (t) => t.childId === activeChild.id && t.status === 'approved' && t.date >= start && t.date <= today,
    )
    const points = week.reduce((s, t) => s + t.points, 0)
    const byTitle = new Map<string, { emoji: string; count: number }>()
    for (const t of week) {
      const cur = byTitle.get(t.title) ?? { emoji: t.emoji, count: 0 }
      cur.count++
      byTitle.set(t.title, cur)
    }
    const top = [...byTitle.entries()].sort((a, b) => b[1].count - a[1].count)[0]
    return { count: week.length, points, top, start, today }
  }, [data.tasks, activeChild])

  if (!activeChild || !stats) return <p className="px-5 text-muted">No child selected.</p>

  return (
    <div className="space-y-4 px-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays size={16} />
          {shortDate(stats.start)} – {shortDate(stats.today)}
        </div>
        <p className="mt-3 text-lg font-bold leading-snug">
          {activeChild.name} completed{' '}
          <span className="text-sprout">{stats.count} task{stats.count === 1 ? '' : 's'}</span> and
          earned <span className="text-sprout">{stats.points} points</span> this week. 🎉
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile icon={<Star className="text-gold" />} label="Tasks done" value={`${stats.count}`} />
        <Tile icon={<TrendingUp className="text-sprout" />} label="Points" value={`+${stats.points}`} />
        <Tile icon={<Sparkles className="text-glow" />} label="Current streak" value={`${effectiveStreak(activeChild)}d`} />
        <Tile
          icon={<span className="text-xl">{stats.top?.[1].emoji ?? '🌱'}</span>}
          label="Habit of the week"
          value={stats.top ? `${stats.top[1].count}×` : '—'}
        />
      </div>

      {stats.top && (
        <div className="rounded-card bg-sprout/5 p-4 text-sm">
          <span className="font-bold">Habit of the week:</span> {stats.top[1].emoji} {stats.top[0]} —{' '}
          done {stats.top[1].count} times. Worth celebrating with {activeChild.name}!
        </div>
      )}

      <p className="px-1 text-xs text-muted">
        In the real app this digest is delivered as a weekly push/email (stubbed — see PROGRESS.md).
      </p>
    </div>
  )
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center">{icon}</div>
      <div>
        <div className="text-lg font-extrabold leading-none">{value}</div>
        <div className="text-[11px] text-muted">{label}</div>
      </div>
    </div>
  )
}
