import type { ReactNode } from 'react'
import { useStore } from '@/store'
import { paletteFor } from '@/domain'

// Centers the app in a phone-width column on desktop; full-bleed on mobile.
//
// In the kid world it also paints the child's own palette, by setting the
// `--kid-*` CSS vars every kid-side Tailwind class is built on. One place to
// swap, so a new palette never means touching a screen.
export function PhoneFrame({ children, kid = false }: { children: ReactNode; kid?: boolean }) {
  const theme = useStore((s) => (kid ? s.kidChild()?.theme : undefined))
  const palette = paletteFor(theme)

  return (
    <div
      className={`app-frame ${kid ? 'text-white' : 'text-ink'}`}
      style={
        kid
          ? ({
              '--kid-bg1': palette.bg1,
              '--kid-bg2': palette.bg2,
              '--kid-glow': palette.glow,
              background: `linear-gradient(160deg, rgb(${palette.bg1}) 0%, rgb(${palette.bg2}) 100%)`,
            } as React.CSSProperties)
          : { background: '#FCFAF5' }
      }
    >
      {children}
    </div>
  )
}
