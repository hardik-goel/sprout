import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Award, Flame, Lightbulb, TrendingUp } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { PlusGate } from '@/ui/PlusGate'
import { habitGrids, habitToNudge, weekdayShort } from '@/domain'
import { t } from '@/i18n'

export function Insights() {
  return (
    <div className="pb-8">
      <PageHeader
        title={t('insights.title')}
        subtitle={t('insights.subtitle')}
        right={<PlusBadge />}
      />
      <PlusGate feature="insights" title={t('insights.gate.title')} blurb={t('insights.gate.blurb')}>
        <InsightsBody />
      </PlusGate>
    </div>
  )
}

function InsightsBody() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())

  const grids = useMemo(
    () => (activeChild ? habitGrids(data, activeChild.id) : []),
    [data, activeChild],
  )
  const nudge = useMemo(() => habitToNudge(grids), [grids])

  if (!activeChild) return <p className="px-5 text-muted">{t('common.noChildSelected')}</p>

  return (
    <div className="space-y-5 px-5">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={<Flame className="text-berry" size={18} />}
          label={t('insights.streak')}
          value={`${activeChild.streak}d`}
        />
        <Stat
          icon={<Award className="text-gold" size={18} />}
          label={t('insights.best')}
          value={`${activeChild.bestStreak}d`}
        />
        <Stat
          icon={<TrendingUp className="text-sprout" size={18} />}
          label={t('insights.lifetime')}
          value={`${activeChild.lifetimePoints}`}
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
          {t('insights.last7', { name: activeChild.name })}
        </h2>
        {grids.length === 0 ? (
          <div className="card p-5 text-center text-sm text-muted">
            {t('insights.empty')}{' '}
            <Link to="/parent/tasks" className="font-semibold text-sprout">
              {t('insights.assignTasks')}
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-line">
            {grids.map((h) => (
              <div key={h.templateId} className="flex items-center gap-3 p-4">
                <span className="text-xl">{h.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold">{h.title}</div>
                  <div className="text-xs text-muted">
                    {t('insights.daysOf', { n: h.doneCount, total: h.days.length })}
                  </div>
                </div>
                <div className="flex gap-1">
                  {h.days.map((d) => (
                    <div key={d.date} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-6 w-6 rounded-md ${d.done ? 'bg-sprout' : 'bg-line'}`}
                        title={`${d.date}: ${d.done ? t('insights.done') : t('insights.missed')}`}
                      />
                      <span className="text-[9px] text-muted">{weekdayShort(d.date)[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {nudge && (
        <div className="flex items-start gap-3 rounded-card bg-gold/10 p-4 text-sm">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-gold" />
          <p>
            <span className="font-bold">{t('insights.nudge.label')}</span>{' '}
            {t('insights.nudge.body', {
              emoji: nudge.emoji,
              title: nudge.title,
              n: nudge.doneCount,
              total: nudge.days.length,
            })}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Link to="/parent/digest" className="btn-ghost w-full">
          {t('insights.toDigest')}
        </Link>
        <Link to="/parent/album" className="btn-ghost w-full">
          {t('insights.toAlbum')}
        </Link>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 p-3">
      {icon}
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  )
}
