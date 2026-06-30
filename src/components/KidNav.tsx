import { NavLink } from 'react-router-dom'
import { Sun, Sprout, PiggyBank, Star } from 'lucide-react'

const items = [
  { to: '/kid', label: 'My Day', icon: Sun, end: true },
  { to: '/kid/garden', label: 'Garden', icon: Sprout, end: false },
  { to: '/kid/jar', label: 'My Jar', icon: PiggyBank, end: false },
  { to: '/kid/rewards', label: 'Rewards', icon: Star, end: false },
]

export function KidNav() {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-white/10 bg-kidbg1/80 backdrop-blur">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-bold transition ${
                isActive ? 'text-glow' : 'text-white/55'
              }`
            }
          >
            <Icon size={24} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
