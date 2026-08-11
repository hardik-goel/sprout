// Locale-aware formatting of the domain's raw date keys.
//
// The domain deals only in YYYY-MM-DD strings — it has no opinion about what a
// month is called. Naming happens here, against the active dictionary.

import { dateFromKey } from '@/domain/dates'
import { t } from './index'

export function formatShortDate(key: string): string {
  const [, m, d] = key.split('-').map(Number)
  return t('date.short', { d, month: t(`date.month.short.${m}`) })
}

export function formatWeekdayInitial(key: string): string {
  return t(`date.weekday.initial.${dateFromKey(key).getDay()}`)
}

export function formatMonthTitle(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return t('date.monthTitle', { month: t(`date.month.${m}`), year: y })
}

export function formatRange(from: string, to: string): string {
  return `${formatShortDate(from)} – ${formatShortDate(to)}`
}
