// ============================================================================
// i18n — every user-facing string goes through `t()`.
//
// English and Hindi ship. A missing Hindi key falls back to English key-by-key,
// so a partial translation degrades gracefully instead of showing blanks.
// ============================================================================

import type { Locale } from '@/domain/types'
import { en } from './en'
import { hi } from './hi'

export type { Locale }
export type Dict = Record<string, string>

const DICTS: Record<Locale, Dict> = { en, hi }

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
]

let locale: Locale = 'en'

export function setLocale(l: Locale) {
  locale = l
}

export function getLocale(): Locale {
  return locale
}

/**
 * A var that is itself a dictionary key. Lets the pure domain layer hand back
 * "the habit of the week is <this task>" without ever knowing the word for it:
 * it emits `{ key: 'task.title.tpl_teeth' }` and the lookup happens here.
 */
export type TVar = string | number | { key: string }

/**
 * Look up a key and interpolate {vars}. Unknown keys return the key itself,
 * which makes a missing string obvious in the UI instead of silently blank.
 */
export function t(key: string, vars?: Record<string, TVar>): string {
  const template = DICTS[locale][key] ?? en[key] ?? key
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, name) => {
    if (!(name in vars)) return m
    const v = vars[name]
    return typeof v === 'object' && v !== null ? t(v.key) : String(v)
  })
}

/**
 * The display name of a task template. Templates are our content, so they are
 * translated; anything we don't have a key for (a future custom task) falls
 * back to the stored English title rather than showing a raw key.
 */
export function taskTitle(templateId: string, fallback: string): string {
  const key = `task.title.${templateId}`
  return DICTS[locale][key] ?? en[key] ?? fallback
}

/** Simple pluralisation: `plural(n, 'streak.day.one', 'streak.day.many')`. */
export function plural(
  n: number,
  oneKey: string,
  manyKey: string,
  vars?: Record<string, TVar>,
): string {
  return t(n === 1 ? oneKey : manyKey, { n, ...vars })
}

/** Keys present in English but missing from another locale — used by tests. */
export function missingKeys(target: Locale): string[] {
  return Object.keys(en).filter((k) => !(k in DICTS[target]))
}
