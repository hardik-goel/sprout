import { Outlet } from 'react-router-dom'
import { PhoneFrame } from './PhoneFrame'
import { ParentNav } from './ParentNav'
import { KidNav } from './KidNav'
import { PersonaSwitch } from './PersonaSwitch'

export function ParentLayout() {
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
