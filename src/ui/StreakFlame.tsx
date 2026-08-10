import { Flame } from 'lucide-react'
import { plural, t } from '@/i18n'

export function StreakFlame({ count, size = 18 }: { count: number; size?: number }) {
  const active = count > 0
  return (
    <span
      className={`chip ${active ? 'bg-berry/15 text-berry' : 'bg-line text-muted'}`}
      title={t('streak.title', { n: count })}
    >
      <Flame size={size} className={active ? 'animate-flame' : ''} fill={active ? '#E2725B' : 'none'} />
      {plural(count, 'streak.day.one', 'streak.day.many')}
    </span>
  )
}
