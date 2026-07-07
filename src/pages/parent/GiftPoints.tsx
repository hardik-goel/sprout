import { useMemo, useState } from 'react'
import { Check, Gift } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { PlusBadge } from '@/components/PlusBadge'
import { PlusGate } from '@/components/PlusGate'
import { GIFT_WEEKLY_CAP, remainingGiftAllowance } from '@/lib/game'

export function GiftPoints() {
  return (
    <div className="pb-8">
      <PageHeader title="Gift points" subtitle={`Max ${GIFT_WEEKLY_CAP} pts / week each`} right={<PlusBadge />} />
      <PlusGate
        title="Let family gift points"
        blurb={`Relatives can gift points as encouragement — capped at ${GIFT_WEEKLY_CAP}/week each so it stays meaningful, never bought.`}
      >
        <GiftBody />
      </PlusGate>
    </div>
  )
}

function GiftBody() {
  const data = useStore((s) => s.data)
  const giftPoints = useStore((s) => s.giftPoints)

  const relatives = data.members.filter((m) => m.role === 'relative')
  const [memberId, setMemberId] = useState(relatives[0]?.id ?? '')
  const [childId, setChildId] = useState(data.activeChildId ?? data.children[0]?.id ?? '')
  const [amount, setAmount] = useState(10)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const remaining = useMemo(
    () => (memberId && childId ? remainingGiftAllowance(data.gifts, memberId, childId) : 0),
    [data.gifts, memberId, childId],
  )

  function send() {
    const res = giftPoints(memberId, childId, amount)
    if (res.ok) {
      const m = data.members.find((x) => x.id === memberId)
      const c = data.children.find((x) => x.id === childId)
      setMsg({ ok: true, text: `${m?.name} gifted ${amount} pts to ${c?.name}! 🎁` })
    } else {
      setMsg({ ok: false, text: res.reason ?? 'Could not gift.' })
    }
  }

  return (
    <div className="space-y-5 px-5">
      <Field label="From">
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

      <Field label="To">
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

      <Field label={`Amount: ${amount} pts`}>
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
          {remaining} of {GIFT_WEEKLY_CAP} pts left to gift this week (this person → this child).
        </p>
      </Field>

      <button className="btn-primary w-full" onClick={send} disabled={remaining === 0}>
        <Gift size={18} /> {remaining === 0 ? 'Weekly cap reached' : `Gift ${amount} pts`}
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
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  )
}
