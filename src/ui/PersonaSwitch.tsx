import { useLocation, useNavigate } from 'react-router-dom'
import { Baby, Repeat, UserRound } from 'lucide-react'
import { useStore } from '@/store'
import { hasPin } from '@/domain'
import { t } from '@/i18n'

// The badge that says which of the two worlds you are standing in, and swaps.
//
// It used to be labelled with the world it would take you TO, which reads as a
// label for where you ARE — in the parent world it said "Kid view". So it now
// states the current world first, and the swap is the action beside it.
//
// It hangs from the top centre rather than floating above the bottom-right,
// where it used to sit directly on top of whatever the screen's primary button
// was — the celebration's "Yay! Keep going" and approve's "Not yet" were both
// half-covered. Top centre is the one strip every screen leaves empty: titles
// are left-aligned and header actions are right-aligned.
export function PersonaSwitch() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const lockParent = useStore((s) => s.lockParent)
  const logoutKid = useStore((s) => s.logoutKid)
  const parentHasPin = useStore((s) => hasPin(s.data.parentPinHash))
  const isKid = pathname.startsWith('/kid')
  const Icon = isKid ? Baby : UserRound

  function swap() {
    if (isKid) {
      // Going up to the parent world: the child stops being signed in, and the
      // parent lock (if there is one) is asked for again by ParentLayout.
      logoutKid()
      nav('/parent')
    } else {
      // Going down to the kid world re-locks the parent world behind us —
      // otherwise the lock is asked for exactly once per day and the child
      // simply taps back.
      lockParent()
      nav('/kid')
    }
  }

  return (
    <button
      onClick={swap}
      className={`fixed left-1/2 top-0 z-40 flex -translate-x-1/2 items-center gap-1.5 rounded-b-2xl px-3 py-1.5 text-xs font-bold opacity-95 shadow-card transition active:scale-95 ${
        isKid ? 'bg-white/90 text-ink' : 'bg-ink/90 text-white'
      }`}
      aria-label={isKid ? t('persona.toParent') : t('persona.toKid')}
    >
      <Icon size={13} />
      {isKid ? t('persona.inKid') : t('persona.inParent')}
      <span className="opacity-40">·</span>
      <Repeat size={12} />
      <span className="opacity-80">
        {isKid ? t('persona.switchToParent') : t('persona.switchToKid')}
      </span>
      {!isKid && parentHasPin && <span className="opacity-60">🔒</span>}
    </button>
  )
}
