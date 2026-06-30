import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { PlusBadge } from '@/components/PlusBadge'
import { ageFitTaskPoints } from '@/lib/game'
import { todayKey } from '@/lib/dates'
import type { TaskTemplate } from '@/types'

export function TaskLibrary() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const assignTask = useStore((s) => s.assignTask)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  const assignedTplToday = useMemo(() => {
    const today = todayKey()
    return new Set(
      data.tasks
        .filter((t) => t.childId === activeChild?.id && t.date === today)
        .map((t) => t.templateId),
    )
  }, [data.tasks, activeChild?.id])

  const packs = useMemo(() => {
    const map = new Map<string, { pack: 'basic' | 'plus'; items: TaskTemplate[] }>()
    for (const t of data.templates) {
      if (!map.has(t.packName)) map.set(t.packName, { pack: t.pack, items: [] })
      map.get(t.packName)!.items.push(t)
    }
    return [...map.entries()]
  }, [data.templates])

  function add(tpl: TaskTemplate) {
    if (!activeChild) return
    assignTask(activeChild.id, tpl)
    setJustAdded(tpl.id)
    setTimeout(() => setJustAdded((v) => (v === tpl.id ? null : v)), 1200)
  }

  if (!activeChild)
    return (
      <div className="px-5 pt-20 text-center text-muted">
        Add a child first.{' '}
        <Link to="/parent/add-child" className="text-sprout font-semibold">
          Add child
        </Link>
      </div>
    )

  return (
    <div className="pb-8">
      <PageHeader
        title="Task library"
        subtitle={`Assigning to ${activeChild.name} · today`}
      />
      <div className="space-y-6 px-5">
        {packs.map(([packName, { pack, items }]) => {
          const locked = pack === 'plus' && !data.isPlus
          return (
            <section key={packName}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{packName}</h2>
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
                        <div className="font-bold">{tpl.title}</div>
                        <div className="text-xs text-muted capitalize">
                          {tpl.category} · +{pts} pts
                        </div>
                      </div>
                      {locked ? (
                        <span className="chip bg-line text-muted">
                          <Lock size={14} /> Plus
                        </span>
                      ) : added || justAdded === tpl.id ? (
                        <span className="chip bg-sprout/15 text-sprout">
                          <Check size={14} /> Added
                        </span>
                      ) : (
                        <button onClick={() => add(tpl)} className="btn-primary px-4 py-2 text-sm">
                          <Plus size={16} /> Assign
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
                  Unlock this pack with Plus →
                </Link>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
