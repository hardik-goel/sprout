import { NavLink } from 'react-router-dom'
import { Home, ListChecks, Gift, BarChart3, Sparkles } from 'lucide-react'

const items = [
  { to: '/parent', label: 'Home', icon: Home, end: true },
  { to: '/parent/tasks', label: 'Tasks', icon: ListChecks, end: false },
  { to: '/parent/rewards', label: 'Rewards', icon: Gift, end: false },
  { to: '/parent/insights', label: 'Insights', icon: BarChart3, end: false },
  { to: '/parent/upgrade', label: 'Plus', icon: Sparkles, end: false },
]

export function ParentNav() {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold transition ${
                isActive ? 'text-sprout' : 'text-muted'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
