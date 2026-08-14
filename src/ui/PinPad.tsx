import { useState } from 'react'
import { Delete } from 'lucide-react'
import { PIN_LENGTH } from '@/domain'
import { t } from '@/i18n'

/**
 * A four-digit keypad, sized for a thumb and for a five-year-old's aim.
 *
 * Numbers only, no keyboard: a phone keyboard on a kid's screen is an invitation
 * to go and find the address bar. Submitting happens on the fourth digit, so
 * there is no "OK" button to explain.
 */
export function PinPad({
  title,
  subtitle,
  onSubmit,
  onCancel,
  cancelLabel,
  kid = false,
}: {
  title: string
  subtitle?: string
  /** Return false to reject — the pad shakes and clears. */
  onSubmit: (pin: string) => boolean
  onCancel?: () => void
  cancelLabel?: string
  kid?: boolean
}) {
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)

  function press(digit: string) {
    if (pin.length >= PIN_LENGTH) return
    const next = pin + digit
    setPin(next)
    setWrong(false)
    if (next.length === PIN_LENGTH) {
      // One tick, so the fourth dot is actually seen before the screen changes.
      setTimeout(() => {
        const ok = onSubmit(next)
        // Cleared either way: on a reject so it can be retyped, and on an
        // accept because the same pad is reused to confirm a new PIN.
        setPin('')
        setWrong(!ok)
      }, 120)
    }
  }

  const dot = kid ? 'bg-glow' : 'bg-sprout'
  const empty = kid ? 'bg-white/20' : 'bg-line'
  const key = kid
    ? 'bg-white/10 text-white active:bg-white/20'
    : 'bg-white border border-line text-ink active:bg-line/40'

  return (
    <div className="flex flex-col items-center px-6 py-10">
      <h1 className={`text-2xl font-extrabold ${kid ? 'text-white' : 'text-ink'}`}>{title}</h1>
      {subtitle && (
        <p className={`mt-1 text-center text-sm ${kid ? 'text-white/60' : 'text-muted'}`}>
          {subtitle}
        </p>
      )}

      <div className={`mt-7 flex gap-3 ${wrong ? 'animate-shake' : ''}`} aria-live="polite">
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full transition ${i < pin.length ? dot : empty}`}
          />
        ))}
      </div>
      {/* Reserved height so nothing jumps, but the message is only in the DOM
          when it is true — an aria-live region that always contains "wrong"
          reads it out at the wrong moment. */}
      <p className="mt-3 h-5 text-sm font-semibold text-berry">{wrong ? t('pin.wrong') : ''}</p>

      <div className="mt-2 grid w-full max-w-[280px] grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className={`h-16 rounded-2xl text-2xl font-extrabold transition active:scale-95 ${key}`}
          >
            {d}
          </button>
        ))}
        <span />
        <button
          onClick={() => press('0')}
          className={`h-16 rounded-2xl text-2xl font-extrabold transition active:scale-95 ${key}`}
        >
          0
        </button>
        <button
          onClick={() => setPin((p) => p.slice(0, -1))}
          aria-label={t('pin.delete')}
          className={`flex h-16 items-center justify-center rounded-2xl transition active:scale-95 ${key}`}
        >
          <Delete size={22} />
        </button>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className={`mt-6 text-sm font-bold ${kid ? 'text-white/60' : 'text-muted'}`}
        >
          {cancelLabel ?? t('common.back')}
        </button>
      )}
    </div>
  )
}
