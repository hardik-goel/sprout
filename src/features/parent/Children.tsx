import { Link, useNavigate } from 'react-router-dom'
import { Check, Lock, Plus } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { StreakFlame } from '@/ui/StreakFlame'
import { t } from '@/i18n'

export function Children() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const children = useStore((s) => s.childViews())
  const activeChild = useStore((s) => s.activeChild())
  const setActiveChild = useStore((s) => s.setActiveChild)
  const can = useStore((s) => s.can)

  // First child is free; additional children are a Plus feature.
  const canAddMore = can.canAddChild(data.children.length)

  return (
    <div className="pb-8">
      <PageHeader
        title={t('children.title')}
        subtitle={t('children.subtitle')}
        right={data.children.length > 1 ? <PlusBadge /> : undefined}
      />
      <div className="space-y-3 px-5">
        {children.map((c) => {
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
                  {c.name}{' '}
                  <span className="text-sm font-normal text-muted">
                    {t('child.age', { age: c.age })}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StreakFlame count={c.streak} size={14} />
                  <span className="text-xs text-muted">{t('common.pts', { n: c.points })}</span>
                </div>
              </div>
              {isActive && <Check className="text-sprout" size={20} />}
            </button>
          )
        })}

        {canAddMore ? (
          <button className="btn-primary w-full" onClick={() => nav('/parent/add-child')}>
            <Plus size={18} /> {t('child.add')}
          </button>
        ) : (
          <Link to="/parent/upgrade" className="btn-gold w-full">
            <Lock size={18} /> {t('children.addWithPlus')}
          </Link>
        )}
      </div>
    </div>
  )
}
