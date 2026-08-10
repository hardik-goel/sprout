// ============================================================================
// i18n — every user-facing string goes through `t()`.
//
// Phase 1 ships English only, but nothing in the UI hardcodes text, so adding
// Hindi in Phase 2 is a new dictionary file plus a language toggle — not a
// hunt through 30 components.
// ============================================================================

import { en } from './en'

export type Locale = 'en' | 'hi'
export type Dict = Record<string, string>

const DICTS: Record<Locale, Dict> = {
  en,
  hi: {}, // TODO(phase 2): Hindi dictionary; falls back to English key-by-key.
}

let locale: Locale = 'en'

export function setLocale(l: Locale) {
  locale = l
}

export function getLocale(): Locale {
  return locale
}

/**
 * Look up a key and interpolate {vars}. Unknown keys return the key itself,
 * which makes a missing string obvious in the UI instead of silently blank.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[locale]
  const template = dict[key] ?? DICTS.en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, name) =>
    name in vars ? String(vars[name]) : m,
  )
}

/** Simple pluralisation: `plural(n, 'task.one', 'task.many')`. */
export function plural(n: number, oneKey: string, manyKey: string, vars?: Record<string, string | number>): string {
  return t(n === 1 ? oneKey : manyKey, { n, ...vars })
}
