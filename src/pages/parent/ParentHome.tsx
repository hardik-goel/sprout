import { Link, useNavigate } from 'react-router-dom'
import { Camera, CheckCircle2, ChevronRight, Plus, Users } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { StreakFlame } from '@/components/StreakFlame'
import { todayKey } from '@/lib/dates'
import { effectiveStreak, jarProgress } from '@/lib/game'

export function ParentHome() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const setActiveChild = useStore((s) => s.setActiveChild)

  if (!activeChild) {
    return (
      <div className="px-5 pt-20 text-center">
        <p className="text-muted">No child yet.</p>
        <Link to="/parent/add-child" className="btn-primary mt-4">
          <Plus size={18} /> Add a child
        </Link>
      </div>
    )
  }

  const goal = data.rewards.find((r) => r.id === activeChild.goalId)
  const { pct } = goal ? jarProgress(activeChild.points, goal.cost) : { pct: 0 }
  const streak = effectiveStreak(activeChild)
  const today = todayKey()
  const todays = data.tasks.filter((t) => t.childId === activeChild.id && t.date === today)
  const pending = todays.filter((t) => t.status === 'pending')
  const todo = todays.filter((t) => t.status === 'todo')
  const approved = todays.filter((t) => t.status === 'approved')

  return (
    <div className="pb-6">
      <PageHeader
        title={`Hi, ${data.parentName}`}
        subtitle="Here’s today"
        right={
          <Link
            to="/parent/children"
            className="flex items-center gap-1 rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold"
          >
            <Users size={16} /> {data.children.length}
          </Link>
        }
      />

      {/* Child switcher (when multiple) */}
      {data.children.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar px-5">
          {data.children.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveChild(c.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${
                c.id === activeChild.id ? 'bg-sprout text-white' : 'bg-white border border-line'
              }`}
            >
              <span className="text-lg">{c.avatar}</span> {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Goal + streak hero */}
      <div className="px-5">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeChild.avatar}</span>
                <span className="text-lg font-extrabold">{activeChild.name}</span>
                <span className="text-sm text-muted">· age {activeChild.age}</span>
              </div>
              <div className="mt-2">
                <StreakFlame count={streak} />
              </div>
              <div className="mt-3 text-sm text-muted">Saving for</div>
              <div className="text-lg font-bold">
                {goal ? (
                  <>
                    {goal.emoji} {goal.title}
                  </>
                ) : (
                  <Link to="/parent/rewards" className="text-sprout underline">
                    Choose a goal
                  </Link>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-sprout">{activeChild.points}</div>
              <div className="text-xs text-muted">points</div>
            </div>
          </div>
          {goal && (
            <div className="px-5 pb-5">
              <div className="h-3 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sprout to-glow transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>{pct}% there</span>
                <span>
                  {activeChild.points} / {goal.cost}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Needs approval */}
      {pending.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            Needs your approval
          </h2>
          <div className="space-y-2">
            {pending.map((t) => (
              <button
                key={t.id}
                onClick={() => nav(`/parent/approve/${t.id}`)}
                className="card flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{t.title}</div>
                  <div className="text-xs text-muted">+{t.points} pts · tap to review</div>
                </div>
                <span className="chip bg-gold/15 text-gold">
                  <Camera size={14} /> Review
                </span>
                <ChevronRight size={18} className="text-muted" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* To do today */}
      <section className="mt-6 px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Today’s tasks</h2>
          <Link to="/parent/tasks" className="text-sm font-semibold text-sprout">
            + Add
          </Link>
        </div>
        {todo.length === 0 && pending.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            Nothing assigned yet.{' '}
            <Link to="/parent/tasks" className="font-semibold text-sprout">
              Pick tasks
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todo.map((t) => (
              <div key={t.id} className="card flex items-center gap-3 p-4">
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{t.title}</div>
                  <div className="text-xs text-muted">+{t.points} pts · waiting on {activeChild.name}</div>
                </div>
                <span className="chip bg-line text-muted">To do</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Done today */}
      {approved.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Done today</h2>
          <div className="space-y-2">
            {approved.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-card bg-sprout/5 p-4">
                <CheckCircle2 size={22} className="text-sprout" />
                <div className="flex-1 font-semibold">{t.title}</div>
                <span className="text-sm font-bold text-sprout">+{t.points}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
