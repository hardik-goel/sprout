import { Sparkles } from 'lucide-react'

export function PlusBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`chip bg-gold/20 text-gold ${className}`}>
      <Sparkles size={13} /> Plus
    </span>
  )
}
