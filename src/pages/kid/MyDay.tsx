import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Clock } from 'lucide-react'
import { useStore } from '@/store'
import { StreakFlame } from '@/components/StreakFlame'
import { todayKey } from '@/lib/dates'
import {
  approvedTaskCount,
  effectiveStreak,
  gardenStage,
  jarProgress,
} from '@/lib/game'
import { STAGE_EMOJI } from '@/lib/game'

export function MyDay() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.activeChild())
  const celebration = useStore((s) => s.celebration)

  if (!child)
    return <div className="px-5 pt-20 text-center text-white/70">No kid set up yet.</div>

  const today = todayKey()
  const todays = data.tasks.filter((t) => t.childId === child.id && t.date === today)
  const todo = todays.filter((t) => t.status === 'todo')
  const pending = todays.filter((t) => t.status === 'pending')
  const approved = todays.filter((t) => t.status === 'approved')
  const stage = gardenStage(approvedTaskCount(data.tasks, child.id))
  const goal = data.rewards.find((r) => r.id === child.goalId)
  const { pct } = goal ? jarProgress(child.points, goal.cost) : { pct: 0 }

  return (
    <div className="px-5 pb-6 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{child.avatar}</span>
          <div>
            <div className="text-sm text-white/60">Hi,</div>
            <div className="text-2xl font-extrabold">{child.name}!</div>
          </div>
        </div>
        <StreakFlame count={effectiveStreak(child)} />
      </div>

      {/* Celebration banner — appears after a grown-up approves a task */}
      {celebration && celebration.childId === child.id && (
        <button
          onClick={() => nav('/kid/celebrate')}
          className="mt-4 flex w-full items-center gap-3 rounded-kid bg-glow px-4 py-3 text-left text-kidbg1 shadow-glow animate-pop-in"
        >
          <span className="text-2xl">🎉</span>
          <div className="flex-1">
            <div className="font-extrabold">You earned +{celebration.pointsAdded} points!</div>
            <div className="text-sm font-semibold opacity-80">Tap to see your garden grow →</div>
          </div>
        </button>
      )}

      {/* Garden + jar peek */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          to="/kid/garden"
          className="flex flex-col items-center justify-center rounded-kid bg-white/5 p-4 shadow-glow"
        >
          <div className="text-5xl">{STAGE_EMOJI[stage]}</div>
          <div className="mt-1 text-xs font-bold text-glow">My garden →</div>
        </Link>
        <Link to="/kid/jar" className="rounded-kid bg-white/5 p-4">
          <div className="text-xs text-white/60">My jar</div>
          <div className="text-2xl font-extrabold text-glow">{child.points} pts</div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-glow" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-white/60">
            {goal ? `${pct}% to ${goal.emoji}` : 'Pick a goal →'}
          </div>
        </Link>
      </div>

      {/* Tasks */}
      <h2 className="mt-6 text-lg font-extrabold">Today’s tasks</h2>
      <p className="text-sm text-white/55">Tap one when you finish it!</p>

      <div className="mt-3 space-y-3">
        {todo.map((t) => (
          <button
            key={t.id}
            onClick={() => nav(`/kid/task/${t.id}`)}
            className="flex w-full items-center gap-4 rounded-kid bg-white/10 p-4 text-left transition active:scale-[0.98]"
          >
            <span className="text-4xl">{t.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-bold">{t.title}</div>
              <div className="text-sm text-glow">+{t.points} points</div>
            </div>
            <ChevronRight className="text-white/40" />
          </button>
        ))}

        {pending.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-4 rounded-kid bg-white/5 p-4 opacity-80"
          >
            <span className="text-4xl">{t.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-bold">{t.title}</div>
              <div className="flex items-center gap-1 text-sm text-gold">
                <Clock size={14} /> Waiting for grown-up ✓
              </div>
            </div>
          </div>
        ))}

        {approved.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-4 rounded-kid bg-glow/15 p-4"
          >
            <span className="text-4xl">{t.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-bold line-through opacity-80">{t.title}</div>
              <div className="text-sm font-bold text-glow">Done! +{t.points} 🎉</div>
            </div>
          </div>
        ))}

        {todays.length === 0 && (
          <div className="rounded-kid bg-white/5 p-6 text-center text-white/60">
            No tasks yet today. Ask a grown-up to add some! 🌱
          </div>
        )}
      </div>
    </div>
  )
}
