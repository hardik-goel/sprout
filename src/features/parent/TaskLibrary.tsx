import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { ageFitDailyTaskCap, ageFitTaskPoints, isAgeAppropriate, todayKey } from '@/domain'
import type { TaskTemplate } from '@/domain/types'
import { t, taskTitle } from '@/i18n'

export function TaskLibrary() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const assignTask = useStore((s) => s.assignTask)
  const can = useStore((s) => s.can)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const todaysTasks = useMemo(() => {
    const today = todayKey()
    return data.tasks.filter((task) => task.childId === activeChild?.id && task.date === today)
  }, [data.tasks, activeChild?.id])
  const assignedTplToday = useMemo(
    () => new Set(todaysTasks.map((task) => task.templateId)),
    [todaysTasks],
  )

  // Only age-appropriate templates are offered — a 2-year-old shouldn't be
  // shown "finish homework".
  const packs = useMemo(() => {
    const map = new Map<string, { pack: 'basic' | 'plus'; items: TaskTemplate[] }>()
    for (const tpl of data.templates) {
      if (activeChild && !isAgeAppropriate(tpl, activeChild.age)) continue
      if (!map.has(tpl.packKey)) map.set(tpl.packKey, { pack: tpl.pack, items: [] })
      map.get(tpl.packKey)!.items.push(tpl)
    }
    return [...map.entries()]
  }, [data.templates, activeChild])

  function add(tpl: TaskTemplate) {
    if (!activeChild) return
    assignTask(activeChild.id, tpl)
    setJustAdded(tpl.id)
    setTimeout(() => setJustAdded((v) => (v === tpl.id ? null : v)), 1200)
  }

  if (!activeChild)
    return (
      <div className="px-5 pt-20 text-center text-muted">
        {t('tasks.needChild')}{' '}
        <Link to="/parent/add-child" className="text-sprout font-semibold">
          {t('child.add')}
        </Link>
      </div>
    )

  const dailyCap = ageFitDailyTaskCap(activeChild.age)
  const overCap = todaysTasks.length >= dailyCap

  return (
    <div className="pb-8">
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle', { name: activeChild.name })}
      />
      {overCap && (
        <p className="mx-5 mb-3 rounded-2xl bg-gold/10 p-3 text-xs text-gold">
          {t('tasks.capHint', { n: dailyCap, age: activeChild.age })}
        </p>
      )}
      <div className="space-y-6 px-5">
        {packs.map(([packKey, { pack, items }]) => {
          const locked = pack === 'plus' && !can.can('indiaPacks')
          return (
            <section key={packKey}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t(packKey)}</h2>
                {pack === 'plus' && <PlusBadge />}
              </div>
              <div className="space-y-2">
                {items.map((tpl) => {
                  const added = assignedTplToday.has(tpl.id)
                  const pts = ageFitTaskPoints(tpl.basePoints, activeChild.age)
                  return (
                    <div
                      key={tpl.id}
                      className={`card flex items-center gap-3 p-4 ${locked ? 'opacity-55' : ''}`}
                    >
                      <span className="text-2xl">{tpl.emoji}</span>
                      <div className="flex-1">
                        <div className="font-bold">{taskTitle(tpl.id, tpl.title)}</div>
                        <div className="text-xs text-muted">
                          {t(`task.category.${tpl.category}`)} · {t('common.plusPts', { n: pts })}
                        </div>
                      </div>
                      {locked ? (
                        <span className="chip bg-line text-muted">
                          <Lock size={14} /> {t('plus.label')}
                        </span>
                      ) : added || justAdded === tpl.id ? (
                        <span className="chip bg-sprout/15 text-sprout">
                          <Check size={14} /> {t('tasks.added')}
                        </span>
                      ) : (
                        <button onClick={() => add(tpl)} className="btn-primary px-4 py-2 text-sm">
                          <Plus size={16} /> {t('tasks.assign')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {locked && (
                <Link
                  to="/parent/upgrade"
                  className="mt-2 block text-center text-sm font-semibold text-gold"
                >
                  {t('tasks.unlockPack')}
                </Link>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
