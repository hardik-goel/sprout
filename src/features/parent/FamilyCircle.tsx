import { Link } from 'react-router-dom'
import { Gift, UserPlus } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { PlusGate } from '@/ui/PlusGate'
import { GIFT_WEEKLY_CAP, giftedThisWeek } from '@/domain'
import { t } from '@/i18n'

export function FamilyCircle() {
  return (
    <div className="pb-8">
      <PageHeader
        title={t('circle.title')}
        subtitle={t('circle.subtitle')}
        right={<PlusBadge />}
      />
      <PlusGate feature="familyCircle" title={t('circle.gate.title')} blurb={t('circle.gate.blurb')}>
        <CircleBody />
      </PlusGate>
    </div>
  )
}

function CircleBody() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())

  return (
    <div className="space-y-3 px-5">
      {data.members.map((m) => {
        const gifted = activeChild ? giftedThisWeek(data.ledger, m.id, activeChild.id) : 0
        return (
          <div key={m.id} className="card flex items-center gap-3 p-4">
            <span className="text-3xl">{m.avatar}</span>
            <div className="flex-1">
              <div className="font-bold">{m.name}</div>
              <div className="text-xs text-muted">{t(`member.role.${m.role}`)}</div>
            </div>
            {m.role === 'relative' && activeChild && (
              <div className="text-right">
                <div className="text-xs text-muted">
                  {t('circle.gifted', { n: gifted, cap: GIFT_WEEKLY_CAP })}
                </div>
                <Link to="/parent/gift" className="text-sm font-semibold text-sprout">
                  {t('circle.giftLink')}
                </Link>
              </div>
            )}
          </div>
        )
      })}

      <button className="btn-ghost w-full" disabled>
        <UserPlus size={18} /> {t('circle.invite')}
      </button>

      <Link to="/parent/gift" className="btn-primary w-full">
        <Gift size={18} /> {t('gift.title')}
      </Link>
    </div>
  )
}
