import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { t } from '@/i18n'

export function PageHeader({
  title,
  subtitle,
  back,
  right,
  kid = false,
}: {
  title: string
  subtitle?: string
  back?: boolean | string
  right?: ReactNode
  kid?: boolean
}) {
  const nav = useNavigate()
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-3">
      <div className="flex items-start gap-2">
        {back && (
          <button
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            className={`mt-0.5 rounded-full p-1 ${kid ? 'text-white/80' : 'text-ink'}`}
            aria-label={t('common.back')}
          >
            <ChevronLeft size={26} />
          </button>
        )}
        <div>
          <h1 className={`text-2xl font-extrabold leading-tight ${kid ? 'text-white' : 'text-ink'}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`text-sm ${kid ? 'text-white/60' : 'text-muted'}`}>{subtitle}</p>
          )}
        </div>
      </div>
      {right}
    </header>
  )
}
