import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Sparkles } from 'lucide-react'
import { useStore } from '@/store'

// Wraps a Plus-only screen. If not Plus, shows a friendly upsell instead of content.
export function PlusGate({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  const isPlus = useStore((s) => s.data.isPlus)
  if (isPlus) return <>{children}</>
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
        <Lock className="text-gold" size={28} />
      </div>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="mt-2 max-w-xs text-sm text-muted">{blurb}</p>
      <Link to="/parent/upgrade" className="btn-gold mt-6">
        <Sparkles size={18} /> Unlock with Plus
      </Link>
      <p className="mt-3 text-xs text-muted">Demo: the Upgrade screen flips Plus on locally.</p>
    </div>
  )
}
