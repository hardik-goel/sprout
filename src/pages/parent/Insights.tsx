import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Award, Flame, TrendingUp } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { PlusBadge } from '@/components/PlusBadge'
import { PlusGate } from '@/components/PlusGate'
import { addDays, todayKey, weekdayShort } from '@/lib/dates'
import { effectiveStreak } from '@/lib/game'

export function Insights() {
  return (
    <div className="pb-8">
      <PageHeader title="Habit insights" subtitle="Streaks & 7-day grids" right={<PlusBadge />} />
      <PlusGate
        title="See what’s sticking"
        blurb="Per-habit 7-day grids and streaks show you which habits are forming — and which need a nudge."
      >
        <InsightsBody />
      </PlusGate>
    </div>
  )
}

function InsightsBody() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())

  const last7 = useMemo(() => {
    const today = todayKey()
    return Array.from({ length: 7 }, (_, i) => addDays(today, -(6 - i)))
  }, [])

  const habits = useMemo(() => {
    if (!activeChild) return []
    const byTpl = new Map<string, { title: string; emoji: string; days: Set<string> }>()
    for (const t of data.tasks) {
      if (t.childId !== activeChild.id || t.status !== 'approved') continue
      if (!byTpl.has(t.templateId))
        byTpl.set(t.templateId, { title: t.title, emoji: t.emoji, days: new Set() })
      byTpl.get(t.templateId)!.days.add(t.date)
    }
    return [...byTpl.values()].sort((a, b) => b.days.size - a.days.size)
  }, [data.tasks, activeChild])

  if (!activeChild) return <p className="px-5 text-muted">No child selected.</p>

  return (
    <div className="space-y-5 px-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Flame className="text-berry" size={18} />} label="Streak" value={`${effectiveStreak(activeChild)}d`} />
        <Stat icon={<Award className="text-gold" size={18} />} label="Best" value={`${activeChild.bestStreak}d`} />
        <Stat icon={<TrendingUp className="text-sprout" size={18} />} label="Lifetime" value={`${activeChild.lifetimePoints}`} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          Last 7 days · {activeChild.name}
        </h2>
        {habits.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            No approved habits yet.{' '}
            <Link to="/parent/tasks" className="font-semibold text-sprout">
              Assign tasks
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-line">
            {habits.map((h) => (
              <div key={h.title} className="flex items-center gap-3 p-4">
                <span className="text-xl">{h.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{h.title}</div>
                  <div className="text-xs text-muted">{h.days.size}/7 days</div>
                </div>
                <div className="flex gap-1">
                  {last7.map((d) => {
                    const hit = h.days.has(d)
                    return (
                      <div key={d} className="flex flex-col items-center gap-1">
                        <div
                          className={`h-6 w-6 rounded-md ${hit ? 'bg-sprout' : 'bg-line'}`}
                          title={`${d}: ${hit ? 'done' : 'missed'}`}
                        />
                        <span className="text-[9px] text-muted">{weekdayShort(d)[0]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link to="/parent/digest" className="btn-ghost w-full">
        View weekly digest →
      </Link>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 p-3">
      {icon}
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}
