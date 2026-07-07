import { Link, useNavigate } from 'react-router-dom'
import { Check, Lock, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { PlusBadge } from '@/components/PlusBadge'
import { StreakFlame } from '@/components/StreakFlame'
import { effectiveStreak } from '@/lib/game'

export function Children() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const setActiveChild = useStore((s) => s.setActiveChild)

  // First child is free; additional children are a Plus feature.
  const canAddMore = data.isPlus || data.children.length === 0

  return (
    <div className="pb-8">
      <PageHeader
        title="Children"
        subtitle="Manage your kids"
        right={data.children.length > 1 ? <PlusBadge /> : undefined}
      />
      <div className="space-y-3 px-5">
        {data.children.map((c) => {
          const isActive = c.id === activeChild?.id
          return (
            <button
              key={c.id}
              onClick={() => setActiveChild(c.id)}
              className={`card flex w-full items-center gap-3 p-4 text-left ${
                isActive ? 'ring-2 ring-sprout' : ''
              }`}
            >
              <span className="text-3xl">{c.avatar}</span>
              <div className="flex-1">
                <div className="font-bold">
                  {c.name} <span className="text-sm font-normal text-muted">· age {c.age}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StreakFlame count={effectiveStreak(c)} size={14} />
                  <span className="text-xs text-muted">{c.points} pts</span>
                </div>
              </div>
              {isActive && <Check className="text-sprout" size={20} />}
            </button>
          )
        })}

        {canAddMore ? (
          <button className="btn-primary w-full" onClick={() => nav('/parent/add-child')}>
            <Plus size={18} /> Add a child
          </button>
        ) : (
          <Link to="/parent/upgrade" className="btn-gold w-full">
            <Lock size={18} /> Add more children with Plus
          </Link>
        )}
      </div>
    </div>
  )
}
