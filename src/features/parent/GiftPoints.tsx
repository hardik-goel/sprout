import { useState } from 'react'
import { Check, Gift } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { PlusGate } from '@/ui/PlusGate'
import { GIFT_WEEKLY_CAP } from '@/domain'
import { t } from '@/i18n'

export function GiftPoints() {
  return (
    <div className="pb-8">
      <PageHeader
        title={t('gift.title')}
        subtitle={t('gift.subtitle', { cap: GIFT_WEEKLY_CAP })}
        right={<PlusBadge />}
      />
      <PlusGate
        feature="giftPoints"
        title={t('gift.gate.title')}
        blurb={t('gift.gate.blurb', { cap: GIFT_WEEKLY_CAP })}
      >
        <GiftBody />
      </PlusGate>
    </div>
  )
}

// Note presets are our copy; the one that is picked is stored on the event as
// the words the relative actually sent.
const NOTE_KEYS = ['gift.preset.1', 'gift.preset.2', 'gift.preset.3']

function GiftBody() {
  const data = useStore((s) => s.data)
  const giftPoints = useStore((s) => s.giftPoints)
  const giftAllowance = useStore((s) => s.giftAllowance)

  const relatives = data.members.filter((m) => m.role === 'relative')
  const [memberId, setMemberId] = useState(relatives[0]?.id ?? '')
  const [childId, setChildId] = useState(data.activeChildId ?? data.children[0]?.id ?? '')
  const [amount, setAmount] = useState(10)
  const [noteKey, setNoteKey] = useState(NOTE_KEYS[0])
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Derived from the ledger on every render — the cap can't drift out of sync.
  const remaining = memberId && childId ? giftAllowance(memberId, childId) : 0
  const sendable = Math.min(amount, remaining)

  function send() {
    const res = giftPoints(memberId, childId, sendable, t(noteKey))
    const m = data.members.find((x) => x.id === memberId)
    const c = data.children.find((x) => x.id === childId)
    if (res.ok) {
      setMsg({
        ok: true,
        text: t('gift.sent', { from: m?.name ?? '', pts: sendable, to: c?.name ?? '' }),
      })
    } else {
      setMsg({
        ok: false,
        text: t(res.reason ?? 'gift.error.generic', { cap: GIFT_WEEKLY_CAP, left: remaining }),
      })
    }
  }

  return (
    <div className="space-y-5 px-5">
      <Field label={t('gift.from')}>
        <div className="flex flex-wrap gap-2">
          {relatives.map((m) => (
            <button
              key={m.id}
              onClick={() => setMemberId(m.id)}
              className={`chip border ${
                memberId === m.id ? 'border-sprout bg-sprout/10 text-sprout' : 'border-line bg-white'
              }`}
            >
              {m.avatar} {m.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t('gift.to')}>
        <div className="flex flex-wrap gap-2">
          {data.children.map((c) => (
            <button
              key={c.id}
              onClick={() => setChildId(c.id)}
              className={`chip border ${
                childId === c.id ? 'border-sprout bg-sprout/10 text-sprout' : 'border-line bg-white'
              }`}
            >
              {c.avatar} {c.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t('gift.amount', { n: amount })}>
        <input
          type="range"
          min={5}
          max={GIFT_WEEKLY_CAP}
          step={5}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full accent-sprout"
        />
        <p className="mt-1 text-xs text-muted">
          {t('gift.remaining', { left: remaining, cap: GIFT_WEEKLY_CAP })}
        </p>
      </Field>

      <Field label={t('gift.note')}>
        <div className="flex flex-wrap gap-2">
          {NOTE_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setNoteKey(k)}
              className={`chip border ${
                noteKey === k ? 'border-sprout bg-sprout/10 text-sprout' : 'border-line bg-white'
              }`}
            >
              {t(k)}
            </button>
          ))}
        </div>
      </Field>

      <button className="btn-primary w-full" onClick={send} disabled={remaining === 0}>
        <Gift size={18} />{' '}
        {remaining === 0 ? t('gift.capReached') : t('gift.cta', { n: sendable })}
      </button>

      {msg && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-3 text-sm font-semibold ${
            msg.ok ? 'bg-sprout/10 text-sprout' : 'bg-berry/10 text-berry'
          }`}
        >
          {msg.ok && <Check size={18} />}
          {msg.text}
        </div>
      )}

      <p className="text-xs text-muted">{t('gift.pointsOnlyNote')}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
    </div>
  )
}
