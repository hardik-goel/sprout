import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sprout, ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { t } from '@/i18n'

const STEPS = [
  { emoji: '✅', key: 'onboarding.step1' },
  { emoji: '📸', key: 'onboarding.step2' },
  { emoji: '🌳', key: 'onboarding.step3' },
]

export function Onboarding() {
  const nav = useNavigate()
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const children = useStore((s) => s.data.children)
  const [name, setName] = useState('')
  const [step, setStep] = useState(0)
  const [showForm, setShowForm] = useState(false)

  function finish() {
    completeOnboarding(name.trim() || t('onboarding.defaultName'))
    // If a child already exists (seed), go straight home; else add a child.
    nav(children.length > 0 ? '/parent' : '/parent/add-child')
  }

  return (
    <div className="app-frame bg-paper text-ink">
      <div className="flex min-h-screen flex-col px-6 pb-10 pt-12">
        <div className="flex items-center gap-2 text-sprout">
          <Sprout size={28} />
          <span className="text-xl font-extrabold">Sprout</span>
        </div>

        {!showForm ? (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="mb-6 text-7xl">{STEPS[step].emoji}</div>
              <h1 className="text-3xl font-extrabold">{t(`${STEPS[step].key}.title`)}</h1>
              <p className="mt-3 max-w-xs text-muted">{t(`${STEPS[step].key}.body`)}</p>
            </div>
            <div className="mb-6 flex justify-center gap-2">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-sprout' : 'w-2 bg-line'}`}
                />
              ))}
            </div>
            <button
              className="btn-primary w-full"
              onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : setShowForm(true))}
            >
              {step < STEPS.length - 1 ? t('common.next') : t('onboarding.start')} <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center">
              <label htmlFor="parent-name" className="text-2xl font-extrabold">
                {t('onboarding.nameQuestion')}
              </label>
              <p className="mt-1 text-muted">{t('onboarding.nameHint')}</p>
              <input
                id="parent-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('onboarding.namePlaceholder')}
                className="mt-6 w-full rounded-2xl border border-line bg-white px-4 py-4 text-lg font-semibold outline-none focus:border-sprout"
                onKeyDown={(e) => e.key === 'Enter' && finish()}
              />
            </div>
            <button className="btn-primary mb-2 w-full" onClick={finish}>
              {t('common.continue')} <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
