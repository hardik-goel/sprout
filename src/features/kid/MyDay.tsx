import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Clock } from 'lucide-react'
import { useStore } from '@/store'
import { StreakFlame } from '@/ui/StreakFlame'
import { jarProgress, STAGE_EMOJI, todayKey } from '@/domain'
import { t } from '@/i18n'

export function MyDay() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.activeChild())
  const celebration = useStore((s) => s.celebration)

  if (!child)
    return <div className="px-5 pt-20 text-center text-white/70">{t('kid.noKid')}</div>

  const today = todayKey()
  const todays = data.tasks.filter((task) => task.childId === child.id && task.date === today)
  const todo = todays.filter((task) => task.status === 'todo')
  const pending = todays.filter((task) => task.status === 'pending')
  const approved = todays.filter((task) => task.status === 'approved')
  const goal = data.rewards.find((r) => r.id === child.goalId)
  const { pct } = goal ? jarProgress(child.points, goal.cost) : { pct: 0 }

  return (
    <div className="px-5 pb-6 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{child.avatar}</span>
          <div>
            <div className="text-sm text-white/60">{t('kid.hi')}</div>
            <div className="text-2xl font-extrabold">{child.name}!</div>
          </div>
        </div>
        <StreakFlame count={child.streak} />
      </div>

      {/* Celebration banner — appears after a grown-up approves a task */}
      {celebration && celebration.childId === child.id && (
        <button
          onClick={() => nav('/kid/celebrate')}
          className="mt-4 flex w-full items-center gap-3 rounded-kid bg-glow px-4 py-3 text-left text-kidbg1 shadow-glow animate-pop-in"
        >
          <span className="text-2xl">🎉</span>
          <div className="flex-1">
            <div className="font-extrabold">
              {t('kid.earnedPoints', { n: celebration.pointsAdded })}
            </div>
            <div className="text-sm font-semibold opacity-80">{t('kid.tapToSeeGarden')}</div>
          </div>
        </button>
      )}

      {/* Garden + jar peek */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Link
          to="/kid/garden"
          className="flex flex-col items-center justify-center rounded-kid bg-white/5 p-4 shadow-glow"
        >
          <div className="text-5xl">{STAGE_EMOJI[child.stage]}</div>
          <div className="mt-1 text-xs font-bold text-glow">{t('kid.myGardenLink')}</div>
        </Link>
        <Link to="/kid/jar" className="rounded-kid bg-white/5 p-4">
          <div className="text-xs text-white/60">{t('kid.myJar')}</div>
          <div className="text-2xl font-extrabold text-glow">
            {t('common.pts', { n: child.points })}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-glow" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-white/60">
            {goal ? t('kid.pctToGoal', { pct, emoji: goal.emoji }) : t('kid.pickGoal')}
          </div>
        </Link>
      </div>

      {/* Tasks */}
      <h2 className="mt-6 text-lg font-extrabold">{t('kid.todaysTasks')}</h2>
      <p className="text-sm text-white/55">{t('kid.tapWhenDone')}</p>

      <div className="mt-3 space-y-3">
        {todo.map((task) => (
          <button
            key={task.id}
            onClick={() => nav(`/kid/task/${task.id}`)}
            className="flex w-full items-center gap-4 rounded-kid bg-white/10 p-4 text-left transition active:scale-[0.98]"
          >
            <span className="text-4xl">{task.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-bold">{task.title}</div>
              <div className="text-sm text-glow">{t('common.plusPoints', { n: task.points })}</div>
            </div>
            <ChevronRight className="text-white/40" />
          </button>
        ))}

        {pending.map((task) => (
          <div key={task.id} className="flex items-center gap-4 rounded-kid bg-white/5 p-4 opacity-80">
            <span className="text-4xl">{task.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-bold">{task.title}</div>
              <div className="flex items-center gap-1 text-sm text-gold">
                <Clock size={14} /> {t('kid.waitingGrownup')}
              </div>
            </div>
          </div>
        ))}

        {approved.map((task) => (
          <div key={task.id} className="flex items-center gap-4 rounded-kid bg-glow/15 p-4">
            <span className="text-4xl">{task.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-bold line-through opacity-80">{task.title}</div>
              <div className="text-sm font-bold text-glow">
                {t('kid.doneWithPoints', { n: task.points })}
              </div>
            </div>
          </div>
        ))}

        {todays.length === 0 && (
          <div className="rounded-kid bg-white/5 p-6 text-center text-white/60">
            {t('kid.noTasksToday')}
          </div>
        )}
      </div>
    </div>
  )
}
