import { Outlet } from 'react-router-dom'
import { PhoneFrame } from './PhoneFrame'
import { ParentNav } from './ParentNav'
import { KidNav } from './KidNav'
import { PersonaSwitch } from './PersonaSwitch'
import { useStore } from '@/store'
import { hasPin } from '@/domain'
import { ParentLock } from '@/features/parent/ParentLock'
import { KidLogin } from '@/features/kid/KidLogin'

export function ParentLayout() {
  const locked = useStore((s) => hasPin(s.data.parentPinHash) && !s.session.parentUnlocked)

  // The lock replaces the whole layout, nav included. A locked screen that
  // still shows the tab bar is a locked screen with four ways around it.
  if (locked) {
    return (
      <PhoneFrame>
        <ParentLock />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </main>
        <ParentNav />
      </div>
      <PersonaSwitch />
    </PhoneFrame>
  )
}

export function KidLayout() {
  // Sign-in only exists once a parent has set at least one PIN. A family that
  // never asked for locks never meets one.
  const needsLogin = useStore(
    (s) => s.session.kidId === null && s.data.children.some((c) => hasPin(c.pinHash)),
  )

  if (needsLogin) {
    return (
      <PhoneFrame kid>
        <KidLogin />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame kid>
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <Outlet />
        </main>
        <KidNav />
      </div>
      <PersonaSwitch />
    </PhoneFrame>
  )
}
