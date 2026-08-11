// A4 — language switch. Free, for everyone: an app for Indian families that
// only speaks English is a worse product, not a cheaper tier.

import { Check, Languages } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { LOCALES, t } from '@/i18n'

export function Language() {
  const locale = useStore((s) => s.data.locale)
  const setLocale = useStore((s) => s.setLocale)

  return (
    <div className="pb-8">
      <PageHeader title={t('language.title')} subtitle={t('language.subtitle')} back="/parent/more" />
      <div className="space-y-2 px-5">
        {LOCALES.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => setLocale(code)}
            className={`card flex w-full items-center gap-3 p-4 text-left ${
              code === locale ? 'ring-2 ring-sprout' : ''
            }`}
            aria-pressed={code === locale}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sprout/10">
              <Languages size={18} className="text-sprout" />
            </span>
            <span className="flex-1 text-lg font-semibold">{label}</span>
            {code === locale && <Check size={20} className="text-sprout" />}
          </button>
        ))}
      </div>
    </div>
  )
}
