import { NavLink } from 'react-router-dom'
import { BarChart3, Gift, Home, LayoutGrid, ListChecks } from 'lucide-react'
import { t } from '@/i18n'

const items = [
  { to: '/parent', key: 'nav.home', icon: Home, end: true },
  { to: '/parent/tasks', key: 'nav.tasks', icon: ListChecks, end: false },
  { to: '/parent/rewards', key: 'nav.rewards', icon: Gift, end: false },
  { to: '/parent/insights', key: 'nav.insights', icon: BarChart3, end: false },
  { to: '/parent/more', key: 'nav.more', icon: LayoutGrid, end: false },
]

export function ParentNav() {
  return (
    <nav className="sticky bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, key, icon: Icon, end }) => (
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
            {t(key)}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
