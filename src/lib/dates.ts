// Date helpers. All app dates are YYYY-MM-DD strings in local time.

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

// ISO-week key like "2026-W26" — used for the gift-points weekly cap.
export function weekKey(d: Date = new Date()): string {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
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

export function shortDate(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${d} ${months[m - 1]}`
}

export function weekdayShort(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()]
}
