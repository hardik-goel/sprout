// Date helpers. All app dates are YYYY-MM-DD strings in local time.
// Pure — every function takes its inputs explicitly so tests can pin "today".

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + delta)
  return todayKey(dt)
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = new Date(ay, am - 1, ad).getTime()
  const db = new Date(by, bm - 1, bd).getTime()
  return Math.round((db - da) / 86_400_000)
}

/** ISO-week key like "2026-W26" — the bucket the gift cap sums over. */
export function weekKey(d: Date | string = new Date()): string {
  const date = typeof d === 'string' ? dateFromKey(d) : d
  const dt = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = (dt.getUTCDay() + 6) % 7 // Mon=0
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3) // nearest Thursday
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4))
  const week =
    1 +
    Math.round(
      ((dt.getTime() - firstThursday.getTime()) / 86_400_000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    )
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The last 7 day-keys ending today (oldest first) — the habit grid. */
export function lastNDays(n: number, today: string = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)))
}

// Deliberately no date *naming* here. "12 Aug" and "August 2026" are language,
// not domain, so they live in `src/i18n/format.ts` against the active
// dictionary. English-only helpers used to sit here and were exactly the kind
// of thing that quietly gets reached for and leaves a Hindi screen half-English.
