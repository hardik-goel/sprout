import { useNavigate } from 'react-router-dom'
import { BarChart3, Check, Gift, Mail, Sparkles, Users, Baby } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'

const FEATURES = [
  { icon: Sparkles, text: 'India & festival task packs (Diwali, rangoli, Hindi…)' },
  { icon: BarChart3, text: 'Habit insights — streaks & 7-day grids' },
  { icon: Mail, text: 'Calm weekly digest of your family’s week' },
  { icon: Users, text: 'Family circle — grandparents join in' },
  { icon: Gift, text: 'Gift points (within a 50/week healthy cap)' },
  { icon: Baby, text: 'Multiple children' },
]

export function Upgrade() {
  const nav = useNavigate()
  const isPlus = useStore((s) => s.data.isPlus)
  const setPlus = useStore((s) => s.setPlus)

  return (
    <div className="pb-10">
      <PageHeader title="Sprout Plus" back="/parent" />
      <div className="px-5">
        <div
          className="rounded-card p-6 text-white shadow-card"
          style={{ background: 'linear-gradient(150deg, #2FAE73, #114438)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-gold" />
            <span className="text-lg font-extrabold">Unlock the full family</span>
          </div>
          <p className="mt-1 text-3xl font-extrabold">
            ₹99<span className="text-base font-semibold opacity-80">/month</span>
          </p>
          <p className="text-sm opacity-80">Cancel anytime · no real money in the app, ever</p>
        </div>

        <ul className="mt-6 space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sprout/10">
                <Icon size={16} className="text-sprout" />
              </span>
              <span className="text-sm font-medium">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {isPlus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 rounded-full bg-sprout/15 py-3 font-bold text-sprout">
                <Check size={18} /> Plus is active (demo)
              </div>
              <button className="btn-ghost w-full" onClick={() => setPlus(false)}>
                Turn Plus off (demo)
              </button>
            </div>
          ) : (
            <button
              className="btn-gold w-full"
              onClick={() => {
                setPlus(true)
                nav('/parent/insights')
              }}
            >
              <Sparkles size={18} /> Unlock Plus (demo — flips locally)
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            Demo only. Real payments (Razorpay) are stubbed — see PROGRESS.md.
          </p>
        </div>
      </div>
    </div>
  )
}
