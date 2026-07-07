import type { ReactNode } from 'react'

// Centers the app in a phone-width column on desktop; full-bleed on mobile.
export function PhoneFrame({ children, kid = false }: { children: ReactNode; kid?: boolean }) {
  return (
    <div
      className={`app-frame ${kid ? 'text-white' : 'text-ink'}`}
      style={
        kid
          ? { background: 'linear-gradient(160deg, #0C342B 0%, #114438 100%)' }
          : { background: '#FCFAF5' }
      }
    >
      {children}
    </div>
  )
}
