import { Flame } from 'lucide-react'

export function StreakFlame({ count, size = 18 }: { count: number; size?: number }) {
  const active = count > 0
  return (
    <span
      className={`chip ${active ? 'bg-berry/15 text-berry' : 'bg-line text-muted'}`}
      title={`${count}-day streak`}
    >
      <Flame size={size} className={active ? 'animate-flame' : ''} fill={active ? '#E2725B' : 'none'} />
      {count} day{count === 1 ? '' : 's'}
    </span>
  )
}
