import { useLocation, useNavigate } from 'react-router-dom'
import { Repeat } from 'lucide-react'

// Small floating control to hop between Parent and Kid worlds for the demo.
export function PersonaSwitch() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const isKid = pathname.startsWith('/kid')
  return (
    <button
      onClick={() => nav(isKid ? '/parent' : '/kid')}
      className={`fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-card transition active:scale-95 ${
        isKid ? 'bg-white text-ink' : 'bg-ink text-white'
      }`}
      style={{ marginRight: 'max(0px, calc((100vw - 430px) / 2))' }}
      aria-label={isKid ? 'Switch to Parent view' : 'Switch to Kid view'}
    >
      <Repeat size={16} />
      {isKid ? 'Parent' : 'Kid'} view
    </button>
  )
}
