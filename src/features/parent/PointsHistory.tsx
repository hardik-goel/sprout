// The ledger, made readable.
//
// This screen is the payoff of event sourcing: a parent can answer "why does
// Vir have 90 points?" without trusting us. Every entry shows who caused it,
// why, which jar it touched, and what the balance was afterwards — and nothing
// here is ever edited, so a correction appears as its own entry.

import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, Gift, Info, SlidersHorizontal, Sprout } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import type { LedgerEvent, LedgerEventType } from '@/domain/types'
import { formatShortDate } from '@/i18n/format'
import { t, taskTitle } from '@/i18n'

const ICONS: Record<LedgerEventType, typeof Gift> = {
  TASK_APPROVED: Sprout,
  REWARD_REDEEMED: ArrowDownLeft,
  POINTS_GIFTED: Gift,
  ADJUSTMENT: SlidersHorizontal,
}

interface Row {
  event: LedgerEvent
  runningBalance: number
}

export function PointsHistory() {
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.activeChild())

  const rows = useMemo<Row[]>(() => {
    if (!child) return []
    const ordered = data.ledger
      .filter((e) => e.childId === child.id)
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at))

    // Walk forward to get the balance after each event, then show newest first.
    let running = 0
    const withBalance = ordered.map((event) => {
      running += event.delta
      return { event, runningBalance: running }
    })
    return withBalance.reverse()
  }, [data.ledger, child])

  if (!child) return <p className="px-5 pt-20 text-center text-muted">{t('common.noChildSelected')}</p>

  return (
    <div className="pb-8">
      <PageHeader
        title={t('history.title')}
        subtitle={t('history.subtitle')}
        right={
          <div className="text-right">
            <div className="text-2xl font-extrabold text-sprout">{child.points}</div>
            <div className="text-[11px] text-muted">{t('history.balance')}</div>
          </div>
        }
      />

      {rows.length === 0 ? (
        <div className="card mx-5 p-6 text-center text-sm text-muted">{t('history.empty')}</div>
      ) : (
        <div className="mx-5 card divide-y divide-line">
          {rows.map(({ event, runningBalance }) => {
            const Icon = ICONS[event.type]
            const positive = event.delta >= 0
            const actor = data.members.find((m) => m.id === event.actorId)
            // A ledger `reason` is whatever the thing was called when it
            // happened. For our own task templates we can name it in today's
            // language; a reward or a gift note stays exactly as it was written.
            const task =
              event.type === 'TASK_APPROVED' && event.refId
                ? data.tasks.find((x) => x.id === event.refId)
                : undefined
            const label = task ? taskTitle(task.templateId, event.reason) : event.reason
            return (
              <div key={event.id} className="flex items-start gap-3 p-4">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    positive ? 'bg-sprout/10' : 'bg-berry/10'
                  }`}
                >
                  <Icon size={17} className={positive ? 'text-sprout' : 'text-berry'} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{label}</div>
                  <div className="text-xs text-muted">
                    {t(`history.event.${event.type}`)} · {formatShortDate(event.date)}
                    {actor ? ` · ${t('history.by', { name: actor.name })}` : ''}
                  </div>
                  <div className="text-[11px] text-muted">
                    {event.jar &&
                      (positive
                        ? t('history.jar', { jar: t(`jars.${event.jar}.label`) })
                        : t('history.jarFrom', { jar: t(`jars.${event.jar}.label`) }))}{' '}
                    · {t('history.runningBalance', { n: runningBalance })}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 font-extrabold ${
                    positive ? 'text-sprout' : 'text-berry'
                  }`}
                >
                  {positive ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  {positive ? '+' : ''}
                  {event.delta}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-3 flex items-start gap-2 px-6 text-xs text-muted">
        <Info size={14} className="mt-0.5 shrink-0" />
        {t('history.note')}
      </p>
    </div>
  )
}
