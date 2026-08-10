import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import type { Feature } from '@/domain'
import { t } from '@/i18n'

/**
 * Wraps a Plus-only screen. Gating asks the entitlements module — never
 * `isPlus` directly — so Phase 4 can swap in real subscription state without
 * touching a single screen.
 */
export function PlusGate({
  feature,
  title,
  blurb,
  children,
}: {
  feature: Feature
  title: string
  blurb: string
  children: ReactNode
}) {
  const can = useStore((s) => s.can)
  if (can.can(feature)) return <>{children}</>
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
        <Lock className="text-gold" size={28} />
      </div>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted">{blurb}</p>
      <Link to="/parent/upgrade" className="btn-gold mt-6">
        <Sparkles size={18} /> {t('plus.unlock')}
      </Link>
      <p className="mt-3 text-xs text-muted">{t('plus.demoNote')}</p>
    </div>
  )
}
