// The kid world's colour palettes.
//
// The one thing a child this age can decide for themselves in here. It changes
// nothing about points, tasks or rules — which is exactly why it is theirs and
// not the parent's. Every palette keeps a dark background and a bright accent,
// so contrast stays legible whichever one a five-year-old picks.
//
// Values are space-separated RGB channels because Tailwind composes them with
// its own opacity modifiers (`bg-glow/15`); see `--kid-*` in index.css.

export type KidTheme = 'forest' | 'ocean' | 'grape' | 'sunset' | 'berry'

export interface KidPalette {
  /** Background gradient, dark end first. */
  bg1: string
  bg2: string
  /** The accent everything glows with. */
  glow: string
  emoji: string
}

export const KID_THEMES: Record<KidTheme, KidPalette> = {
  forest: { bg1: '12 52 43', bg2: '17 68 56', glow: '67 214 160', emoji: '🌿' },
  ocean: { bg1: '10 37 64', bg2: '13 54 92', glow: '77 190 255', emoji: '🌊' },
  grape: { bg1: '40 24 66', bg2: '58 34 94', glow: '186 143 255', emoji: '🍇' },
  sunset: { bg1: '61 26 26', bg2: '92 38 30', glow: '255 168 92', emoji: '🌅' },
  berry: { bg1: '58 20 44', bg2: '84 27 62', glow: '255 138 190', emoji: '🍓' },
}

export const KID_THEME_ORDER: KidTheme[] = ['forest', 'ocean', 'grape', 'sunset', 'berry']

export const DEFAULT_KID_THEME: KidTheme = 'forest'

export function paletteFor(theme: KidTheme | undefined | null): KidPalette {
  return KID_THEMES[theme ?? DEFAULT_KID_THEME] ?? KID_THEMES[DEFAULT_KID_THEME]
}
