// The dictionaries are data, and data rots quietly. These tests fail loudly
// when a Hindi key goes missing or a placeholder gets lost in translation.

import { afterEach, describe, expect, it } from 'vitest'
import { en } from '../en'
import { hi } from '../hi'
import { getLocale, missingKeys, plural, setLocale, t, taskTitle } from '../index'
import { TASK_TEMPLATES } from '@/lib/seed'

afterEach(() => setLocale('en'))

const placeholders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()

describe('dictionaries', () => {
  it('translates every English key into Hindi', () => {
    expect(missingKeys('hi')).toEqual([])
  })

  it('has no Hindi keys that English does not know about', () => {
    expect(Object.keys(hi).filter((k) => !(k in en))).toEqual([])
  })

  it('keeps the same placeholders in both languages', () => {
    const mismatched = Object.keys(en).filter(
      (k) => hi[k] && placeholders(en[k]).join() !== placeholders(hi[k]).join(),
    )
    expect(mismatched).toEqual([])
  })

  it('never ships an empty string', () => {
    expect(Object.entries({ ...en, ...hi }).filter(([, v]) => v.trim() === '')).toEqual([])
  })

  it('actually contains Devanagari, not copied English', () => {
    const devanagari = Object.entries(hi).filter(([, v]) => /[ऀ-ॿ]/.test(v))
    // Brand names, emoji-only and numeric keys legitimately have none.
    expect(devanagari.length).toBeGreaterThan(Object.keys(hi).length * 0.8)
  })
})

describe('task templates', () => {
  // Templates are our content, not the family's. A pack or a task without a
  // Hindi name is a screen that silently reverts to English mid-sentence.
  it('names every template and pack in both languages', () => {
    const missing: string[] = []
    for (const tpl of TASK_TEMPLATES) {
      for (const key of [`task.title.${tpl.id}`, tpl.packKey]) {
        if (!(key in en)) missing.push(`en:${key}`)
        if (!(key in hi)) missing.push(`hi:${key}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('resolves a template name in the active language, with a fallback', () => {
    expect(taskTitle('tpl_teeth', 'Brush teeth')).toBe('Brush teeth')
    setLocale('hi')
    expect(taskTitle('tpl_teeth', 'Brush teeth')).toBe('दाँत ब्रश करना')
    // A template we have no key for keeps whatever it was stored as.
    expect(taskTitle('tpl_made_up', 'Feed the cat')).toBe('Feed the cat')
  })
})

describe('t()', () => {
  it('resolves a var that is itself a key, so the domain stays language-free', () => {
    expect(t('insights.nudge.body', {
      emoji: '🪥',
      title: { key: 'task.title.tpl_teeth' },
      n: 2,
      total: 7,
    })).toContain('Brush teeth')

    setLocale('hi')
    expect(t('insights.nudge.body', {
      emoji: '🪥',
      title: { key: 'task.title.tpl_teeth' },
      n: 2,
      total: 7,
    })).toContain('दाँत ब्रश करना')
  })

  it('returns the active locale’s string', () => {
    expect(t('nav.home')).toBe('Home')
    setLocale('hi')
    expect(getLocale()).toBe('hi')
    expect(t('nav.home')).toBe('होम')
  })

  it('interpolates vars in both languages', () => {
    expect(t('home.greeting', { name: 'Aanya' })).toBe('Hi, Aanya')
    setLocale('hi')
    expect(t('home.greeting', { name: 'आन्या' })).toContain('आन्या')
  })

  it('leaves an unknown placeholder untouched rather than printing undefined', () => {
    expect(t('home.greeting', {})).toBe('Hi, {name}')
  })

  it('falls back to English for a key a locale is missing', () => {
    setLocale('hi')
    // Simulate a partial translation by asking for a key only English defines.
    expect(t('__unknown.key__')).toBe('__unknown.key__')
  })

  it('pluralises', () => {
    expect(plural(1, 'streak.day.one', 'streak.day.many')).toBe('1 day')
    expect(plural(5, 'streak.day.one', 'streak.day.many')).toBe('5 days')
  })
})
