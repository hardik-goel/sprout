import { Sparkles } from 'lucide-react'
import { t } from '@/i18n'

export function PlusBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`chip bg-gold/20 text-gold ${className}`}>
      <Sparkles size={13} /> {t('plus.label')}
    </span>
  )
}
