import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Check, Clock } from 'lucide-react'
import { useStore } from '@/store'
import { StreakFlame } from '@/ui/StreakFlame'
import { isPerfectDay, jarProgress, perfectDayBonus, STAGE_EMOJI, todayKey } from '@/domain'
import { playWhoosh } from '@/lib/sfx'
import { t, taskTitle } from '@/i18n'

export function MyDay() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.kidChild())
  const celebration = useStore((s) => s.celebration)
  const markDone = useStore((s) => s.markDone)
  const logoutKid = useStore((s) => s.logoutKid)
  const signedIn = useStore((s) => s.session.kidId !== null)
  // The tick that just fired, so it can animate before the card moves.
  const [ticking, setTicking] = useState<string | null>(null)

  if (!child)
    return <div className="px-5 pt-20 text-center text-white/70">{t('kid.noKid')}</div>

  const today = todayKey()
  const todays = data.tasks.filter((task) => task.childId === child.id && task.date === today)
  const todo = todays.filter((task) => task.status === 'todo')
  const pending = todays.filter((task) => task.status === 'pending')
  const approved = todays.filter((task) => task.status === 'approved')
  const goal = data.rewards.find((r) => r.id === child.goalId)
  const { pct } = goal ? jarProgress(child.points, goal.cost) : { pct: 0 }
  // Read-only, and only if a parent turned it on. Siblings watching each other
  // is motivating; siblings *touching* each other's day is a fight.
  const siblings = child.canSeeSiblings
    ? data.children.filter((c) => c.id !== child.id)
    : []
  const bonus = perfectDayBonus(child.age)
  const dayDone = isPerfectDay(todays)

  async function tick(taskId: string) {
    setTicking(taskId)
    playWhoosh() // fires with the tick, not after the save — sound is feedback
    // Let the tick land before the card leaves the list.
    await new Promise((r) => setTimeout(r, 420))
    await markDone(taskId, null)
    setTicking(null)
  }

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
        <div className="flex items-center gap-2">
          <StreakFlame count={child.streak} />
          {/* Only there when a lock is in use — otherwise it is a button that
              signs you out of nothing. */}
          {signedIn && (
            <button
              onClick={logoutKid}
              className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/70"
            >
              {t('kid.notMe')}
            </button>
          )}
        </div>
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

      {/* Finish everything and there is one more prize on top. Say so before
          the day starts, not only after it ends. */}
      {todays.length >= 2 && (
        <div
          className={`mt-3 flex items-center gap-3 rounded-kid p-3 ${
            dayDone ? 'bg-glow text-kidbg1' : 'bg-white/5 text-white/70'
          }`}
        >
          <span className="text-2xl">{dayDone ? '🏆' : '🎯'}</span>
          <div className="text-sm font-bold">
            {dayDone
              ? t('kid.allDone', { n: bonus })
              : t('kid.finishAllFor', { n: bonus, left: todays.length - approved.length })}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {todo.map((task) => {
          const done = ticking === task.id
          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 rounded-kid bg-white/10 p-4 transition ${
                done ? 'bg-glow/25 scale-[0.98]' : ''
              }`}
            >
              {/* Tap the tick to say you did it. Tap the card to add a photo
                  first — both finish the task, and neither is hidden behind
                  the other. */}
              <button
                onClick={() => tick(task.id)}
                disabled={done}
                aria-label={t('kid.markDone', { title: taskTitle(task.templateId, task.title) })}
                className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
                  done ? 'bg-glow text-kidbg1' : 'border-2 border-white/30 text-white/40'
                }`}
              >
                {done ? (
                  <>
                    <Check size={30} strokeWidth={3.5} className="animate-check-pop" />
                    <span className="pointer-events-none absolute -top-1 text-sm font-extrabold text-glow animate-float-up">
                      {t('common.plusPoints', { n: task.points })}
                    </span>
                  </>
                ) : (
                  <Check size={28} strokeWidth={3} />
                )}
              </button>

              <button
                onClick={() => nav(`/kid/task/${task.id}`)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="text-4xl">{task.emoji}</span>
                <div className="flex-1">
                  <div className="text-lg font-bold">{taskTitle(task.templateId, task.title)}</div>
                  <div className="text-sm text-glow">
                    {t('common.plusPoints', { n: task.points })}
                  </div>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/70">
                  <Camera size={14} /> {t('kid.addPhoto')}
                </span>
              </button>
            </div>
          )
        })}

        {pending.map((task) => (
          <div key={task.id} className="flex items-center gap-4 rounded-kid bg-white/5 p-4 opacity-80">
            <span className="text-4xl">{task.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-bold">{taskTitle(task.templateId, task.title)}</div>
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
              <div className="text-lg font-bold line-through opacity-80">{taskTitle(task.templateId, task.title)}</div>
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

      {/* Siblings, watch-only. No buttons anywhere in here on purpose. */}
      {siblings.length > 0 && (
        <>
          <h2 className="mt-7 text-lg font-extrabold">{t('kid.family.title')}</h2>
          <p className="text-sm text-white/55">{t('kid.family.readOnly')}</p>
          <div className="mt-3 space-y-2">
            {siblings.map((sib) => {
              const theirs = data.tasks.filter((x) => x.childId === sib.id && x.date === today)
              const theirDone = theirs.filter((x) => x.status === 'approved').length
              return (
                <div key={sib.id} className="flex items-center gap-3 rounded-kid bg-white/5 p-4">
                  <span className="text-3xl">{sib.avatar}</span>
                  <div className="flex-1">
                    <div className="font-bold">{sib.name}</div>
                    <div className="text-sm text-white/55">
                      {t('kid.family.progress', { done: theirDone, total: theirs.length })}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {theirs.slice(0, 6).map((x) => (
                      <span key={x.id} className={x.status === 'approved' ? '' : 'opacity-30'}>
                        {x.emoji}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
