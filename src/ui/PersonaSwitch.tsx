import { useLocation, useNavigate } from 'react-router-dom'
import { Repeat } from 'lucide-react'
import { t } from '@/i18n'

// Small floating control to hop between Parent and Kid worlds for the demo.
//
// It hangs from the top centre rather than floating above the bottom-right,
// where it used to sit directly on top of whatever the screen's primary button
// was — the celebration's "Yay! Keep going" and approve's "Not yet" were both
// half-covered. Top centre is the one strip every screen leaves empty: titles
// are left-aligned and header actions are right-aligned.
export function PersonaSwitch() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const isKid = pathname.startsWith('/kid')
  return (
    <button
      onClick={() => nav(isKid ? '/parent' : '/kid')}
      className={`fixed left-1/2 top-0 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-b-2xl px-3 py-1.5 text-xs font-bold opacity-90 shadow-card transition active:scale-95 ${
        isKid ? 'bg-white/90 text-ink' : 'bg-ink/90 text-white'
      }`}
      aria-label={isKid ? t('persona.toParent') : t('persona.toKid')}
    >
      <Repeat size={13} />
      {isKid ? t('persona.parent') : t('persona.kid')}
    </button>
  )
}
