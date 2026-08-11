import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, CheckCircle2, ChevronRight, Gift, Plus, Users, X } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { ConfirmSheet } from '@/ui/ConfirmSheet'
import { StreakFlame } from '@/ui/StreakFlame'
import { jarProgress, pendingFulfilments, todayKey } from '@/domain'
import { formatShortDate } from '@/i18n/format'
import { t, taskTitle } from '@/i18n'

export function ParentHome() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const setActiveChild = useStore((s) => s.setActiveChild)
  const removeTask = useStore((s) => s.removeTask)
  const [removing, setRemoving] = useState<string | null>(null)

  if (!activeChild) {
    return (
      <div className="px-5 pt-20 text-center">
        <p className="text-muted">{t('home.noChild')}</p>
        <Link to="/parent/add-child" className="btn-primary mt-4">
          <Plus size={18} /> {t('child.add')}
        </Link>
      </div>
    )
  }

  const goal = data.rewards.find((r) => r.id === activeChild.goalId)
  const { pct } = goal ? jarProgress(activeChild.points, goal.cost) : { pct: 0 }
  const today = todayKey()
  const todays = data.tasks.filter((t) => t.childId === activeChild.id && t.date === today)
  const pending = todays.filter((t) => t.status === 'pending')
  const todo = todays.filter((t) => t.status === 'todo')
  const approved = todays.filter((t) => t.status === 'approved')
  // Rewards already paid for out of the jar but not yet actually handed over.
  const owed = pendingFulfilments(data.rewards, data.ledger)

  return (
    <div className="pb-6">
      <PageHeader
        title={t('home.greeting', { name: data.parentName })}
        subtitle={t('home.subtitle')}
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
                <span className="text-sm text-muted">{t('child.age', { age: activeChild.age })}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <StreakFlame count={activeChild.streak} />
                {activeChild.streakAtRisk && (
                  <span className="chip bg-gold/15 text-gold">{t('streak.atRisk')}</span>
                )}
              </div>
              <div className="mt-3 text-sm text-muted">{t('home.savingFor')}</div>
              <div className="text-lg font-bold">
                {goal ? (
                  <>
                    {goal.emoji} {goal.title}
                  </>
                ) : (
                  <Link to="/parent/rewards" className="text-sprout underline">
                    {t('home.chooseGoal')}
                  </Link>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-sprout">{activeChild.points}</div>
              <div className="text-xs text-muted">{t('common.points')}</div>
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
                <span>{t('home.pctThere', { pct })}</span>
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
            {t('home.needsApproval')}
          </h2>
          <div className="space-y-2">
            {pending.map((task) => (
              <button
                key={task.id}
                onClick={() => nav(`/parent/approve/${task.id}`)}
                className="card flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="text-2xl">{task.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{taskTitle(task.templateId, task.title)}</div>
                  <div className="text-xs text-muted">
                    {t('home.tapToReview', { pts: task.points })}
                  </div>
                </div>
                <span className="chip bg-gold/15 text-gold">
                  <Camera size={14} /> {t('home.review')}
                </span>
                <ChevronRight size={18} className="text-muted" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Still to give — the promise the points already bought */}
      {owed.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            {t('home.stillToGive')}
          </h2>
          <div className="space-y-2">
            {owed.map(({ reward, childId, date }) => {
              const who = data.children.find((c) => c.id === childId)
              return (
                <button
                  key={reward.id}
                  onClick={() => nav(`/parent/reward/${reward.id}`)}
                  className="card flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="text-2xl">{reward.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold">{reward.title}</div>
                    <div className="text-xs text-muted">
                      {t('home.redeemedBy', {
                        name: who?.name ?? '',
                        date: formatShortDate(date),
                      })}
                    </div>
                  </div>
                  <span className="chip bg-gold/15 text-gold">
                    <Gift size={14} /> {t('home.give')}
                  </span>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* To do today */}
      <section className="mt-6 px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            {t('home.todaysTasks')}
          </h2>
          <Link to="/parent/tasks" className="text-sm font-semibold text-sprout">
            {t('home.addTask')}
          </Link>
        </div>
        {todo.length === 0 && pending.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            {t('home.nothingAssigned')}{' '}
            <Link to="/parent/tasks" className="font-semibold text-sprout">
              {t('home.pickTasks')}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {todo.map((task) => (
              <div key={task.id} className="card flex items-center gap-3 p-4">
                <span className="text-2xl">{task.emoji}</span>
                <div className="flex-1">
                  <div className="font-bold">{taskTitle(task.templateId, task.title)}</div>
                  <div className="text-xs text-muted">
                    {t('home.waitingOn', { pts: task.points, name: activeChild.name })}
                  </div>
                </div>
                <span className="chip bg-line text-muted">{t('task.todo')}</span>
                {/* Assigning the wrong task was, until now, permanent. Only
                    un-started tasks can go: an approved one is referenced by
                    the ledger and is reversed, not deleted. */}
                <button
                  onClick={() => setRemoving(task.id)}
                  className="shrink-0 text-muted"
                  aria-label={t('home.removeTask')}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmSheet
        open={removing !== null}
        title={t('home.removeTaskTitle')}
        body={t('home.removeTaskBody')}
        confirmLabel={t('home.removeTaskCta')}
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) removeTask(removing)
          setRemoving(null)
        }}
      />

      {/* Done today */}
      {approved.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            {t('home.doneToday')}
          </h2>
          <div className="space-y-2">
            {approved.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-card bg-sprout/5 p-4">
                <CheckCircle2 size={22} className="text-sprout" />
                <div className="flex-1 font-semibold">{taskTitle(task.templateId, task.title)}</div>
                <span className="text-sm font-bold text-sprout">+{task.points}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
