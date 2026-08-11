import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  Gift,
  Images,
  Languages,
  Mail,
  Mic,
  PiggyBank,
  ReceiptText,
  RotateCcw,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { ConfirmSheet } from '@/ui/ConfirmSheet'
import type { Feature } from '@/domain'
import { t } from '@/i18n'

const LINKS: { to: string; icon: typeof Gift; key: string; feature?: Feature }[] = [
  { to: '/parent/album', icon: Images, key: 'more.album' },
  { to: '/parent/story', icon: Share2, key: 'more.story' },
  { to: '/parent/digest', icon: Mail, key: 'more.digest', feature: 'digest' },
  { to: '/parent/circle', icon: Users, key: 'more.circle', feature: 'familyCircle' },
  { to: '/parent/gift', icon: Gift, key: 'more.gift', feature: 'giftPoints' },
  { to: '/parent/jars', icon: PiggyBank, key: 'more.jars', feature: 'threeJars' },
  { to: '/parent/history', icon: ReceiptText, key: 'more.history' },
  { to: '/parent/children', icon: Users, key: 'more.children' },
  { to: '/parent/cheers', icon: Mic, key: 'more.cheers' },
  { to: '/parent/language', icon: Languages, key: 'more.language' },
  { to: '/parent/upgrade', icon: Sparkles, key: 'more.upgrade' },
]

export function More() {
  const can = useStore((s) => s.can)
  const resetAll = useStore((s) => s.resetAll)
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="pb-8">
      <PageHeader title={t('more.title')} subtitle={t('more.subtitle')} />
      <div className="space-y-2 px-5">
        {LINKS.map(({ to, icon: Icon, key, feature }) => (
          <Link key={to} to={to} className="card flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sprout/10">
              <Icon size={18} className="text-sprout" />
            </span>
            <span className="flex-1 font-semibold">{t(key)}</span>
            {feature && !can.can(feature) && <PlusBadge />}
            <ChevronRight size={18} className="text-muted" />
          </Link>
        ))}

        <button className="btn-ghost mt-4 w-full text-muted" onClick={() => setConfirming(true)}>
          <RotateCcw size={16} /> {t('more.reset')}
        </button>
        <p className="text-center text-xs text-muted">{t('more.resetHint')}</p>
      </div>

      <ConfirmSheet
        open={confirming}
        title={t('more.reset')}
        body={t('more.resetConfirm')}
        confirmLabel={t('more.resetConfirmCta')}
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          resetAll()
        }}
      />
    </div>
  )
}
