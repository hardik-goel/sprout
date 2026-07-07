import { Link } from 'react-router-dom'
import { Gift, UserPlus } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { PlusBadge } from '@/components/PlusBadge'
import { PlusGate } from '@/components/PlusGate'
import { GIFT_WEEKLY_CAP, giftedThisWeek } from '@/lib/game'

export function FamilyCircle() {
  return (
    <div className="pb-8">
      <PageHeader title="Family circle" subtitle="Grandparents & relatives" right={<PlusBadge />} />
      <PlusGate
        title="Bring the whole family in"
        blurb="Let Dadi, Nani and others cheer your kids on — and gift points (within a healthy weekly cap)."
      >
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
        const gifted = activeChild ? giftedThisWeek(data.gifts, m.id, activeChild.id) : 0
        return (
          <div key={m.id} className="card flex items-center gap-3 p-4">
            <span className="text-3xl">{m.avatar}</span>
            <div className="flex-1">
              <div className="font-bold">{m.name}</div>
              <div className="text-xs capitalize text-muted">{m.role}</div>
            </div>
            {m.role === 'relative' && activeChild && (
              <div className="text-right">
                <div className="text-xs text-muted">
                  {gifted}/{GIFT_WEEKLY_CAP} gifted
                </div>
                <Link to="/parent/gift" className="text-sm font-semibold text-sprout">
                  Gift points →
                </Link>
              </div>
            )}
          </div>
        )
      })}

      <button className="btn-ghost w-full" disabled>
        <UserPlus size={18} /> Invite a relative (stub)
      </button>

      <Link to="/parent/gift" className="btn-primary w-full">
        <Gift size={18} /> Gift points
      </Link>
    </div>
  )
}
