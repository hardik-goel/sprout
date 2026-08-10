import { useNavigate } from 'react-router-dom'
import { BarChart3, Baby, Check, Gift, Mail, PiggyBank, Sparkles, Users } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { t } from '@/i18n'

const FEATURES = [
  { icon: Sparkles, key: 'upgrade.feature.packs' },
  { icon: BarChart3, key: 'upgrade.feature.insights' },
  { icon: Mail, key: 'upgrade.feature.digest' },
  { icon: Users, key: 'upgrade.feature.circle' },
  { icon: Gift, key: 'upgrade.feature.gift' },
  { icon: Baby, key: 'upgrade.feature.children' },
  { icon: PiggyBank, key: 'upgrade.feature.jars' },
]

export function Upgrade() {
  const nav = useNavigate()
  const isPlus = useStore((s) => s.data.isPlus)
  const setPlus = useStore((s) => s.setPlus)

  return (
    <div className="pb-10">
      <PageHeader title={t('upgrade.title')} back="/parent" />
      <div className="px-5">
        <div
          className="rounded-card p-6 text-white shadow-card"
          style={{ background: 'linear-gradient(150deg, #2FAE73, #114438)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={22} className="text-gold" />
            <span className="text-lg font-extrabold">{t('upgrade.hero')}</span>
          </div>
          <p className="mt-1 text-3xl font-extrabold">
            ₹99<span className="text-base font-semibold opacity-80">{t('upgrade.perMonth')}</span>
          </p>
          <p className="text-sm opacity-80">{t('upgrade.promise')}</p>
        </div>

        <ul className="mt-6 space-y-3">
          {FEATURES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sprout/10">
                <Icon size={16} className="text-sprout" />
              </span>
              <span className="text-sm font-medium">{t(key)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {isPlus ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 rounded-full bg-sprout/15 py-3 font-bold text-sprout">
                <Check size={18} /> {t('upgrade.active')}
              </div>
              <button className="btn-ghost w-full" onClick={() => setPlus(false)}>
                {t('upgrade.turnOff')}
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
              <Sparkles size={18} /> {t('upgrade.cta')}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            {t('upgrade.demoNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
