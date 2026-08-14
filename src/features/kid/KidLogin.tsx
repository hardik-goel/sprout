// "Who's playing?" — the kid world's front door.
//
// A child signs in as themselves, so what they see is their day and nobody
// else's. Signing in is tapping your own face; the PIN only appears if a
// parent set one for that child. Reading, not typing: half of these users
// can't spell their own name yet.

import { useState } from 'react'
import { useStore } from '@/store'
import { PinPad } from '@/ui/PinPad'
import { hasPin } from '@/domain'
import { t } from '@/i18n'

export function KidLogin() {
  const children = useStore((s) => s.childViews())
  const loginKid = useStore((s) => s.loginKid)
  const [picked, setPicked] = useState<string | null>(null)

  const child = children.find((c) => c.id === picked)

  if (child) {
    return (
      <PinPad
        kid
        title={t('kid.login.pinTitle', { name: child.name })}
        subtitle={t('kid.login.pinSubtitle')}
        onSubmit={(pin) => loginKid(child.id, pin)}
        onCancel={() => setPicked(null)}
        cancelLabel={t('kid.login.notMe')}
      />
    )
  }

  return (
    <div className="px-6 py-12">
      <h1 className="text-center text-3xl font-extrabold text-white">{t('kid.login.title')}</h1>
      <p className="mt-2 text-center text-sm text-white/60">{t('kid.login.subtitle')}</p>

      <div className="mt-8 grid grid-cols-2 gap-4">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              // No PIN means no door to open — go straight in.
              if (hasPin(c.pinHash)) setPicked(c.id)
              else loginKid(c.id, '')
            }}
            className="flex flex-col items-center gap-2 rounded-kid bg-white/10 p-6 transition active:scale-95"
          >
            <span className="text-6xl">{c.avatar}</span>
            <span className="text-lg font-extrabold text-white">{c.username || c.name}</span>
            {hasPin(c.pinHash) && (
              <span className="text-[11px] font-bold text-white/50">{t('kid.login.hasPin')}</span>
            )}
          </button>
        ))}
      </div>

      {children.length === 0 && (
        <p className="mt-10 text-center text-white/60">{t('kid.noKid')}</p>
      )}
    </div>
  )
}
