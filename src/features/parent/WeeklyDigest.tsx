import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Share2, Sparkles, Star, TrendingUp } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { PlusGate } from '@/ui/PlusGate'
import { habitGrids, weekStats } from '@/domain'
import { formatRange } from '@/i18n/format'
import { t, taskTitle } from '@/i18n'

export function WeeklyDigest() {
  return (
    <div className="pb-8">
      <PageHeader
        title={t('digest.title')}
        subtitle={t('digest.subtitle')}
        right={<PlusBadge />}
      />
      <PlusGate feature="digest" title={t('digest.gate.title')} blurb={t('digest.gate.blurb')}>
        <DigestBody />
      </PlusGate>
    </div>
  )
}

function DigestBody() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())

  const stats = useMemo(
    () => (activeChild ? weekStats(data, activeChild.id) : null),
    [data, activeChild],
  )
  const topHabit = useMemo(
    () => (activeChild ? habitGrids(data, activeChild.id)[0] : undefined),
    [data, activeChild],
  )

  if (!activeChild || !stats) return <p className="px-5 text-muted">{t('common.noChildSelected')}</p>

  return (
    <div className="space-y-4 px-5">
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm text-muted">
          <CalendarDays size={16} />
          {formatRange(stats.from, stats.to)}
        </div>
        <p className="mt-3 text-lg font-bold leading-snug">
          {t('digest.headline', {
            name: activeChild.name,
            tasks: stats.tasksDone,
            points: stats.pointsEarned,
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile icon={<Star className="text-gold" />} label={t('digest.tasksDone')} value={`${stats.tasksDone}`} />
        <Tile icon={<TrendingUp className="text-sprout" />} label={t('digest.points')} value={`+${stats.pointsEarned}`} />
        <Tile icon={<Sparkles className="text-glow" />} label={t('digest.streak')} value={`${stats.streak}d`} />
        <Tile
          icon={<span className="text-xl">📵</span>}
          label={t('digest.screenFree')}
          value={`${stats.screenFreeWins}`}
        />
      </div>

      {topHabit && topHabit.doneCount > 0 && (
        <div className="rounded-card bg-sprout/5 p-4 text-sm">
          <span className="font-bold">{t('digest.habitOfWeek')}</span> {topHabit.emoji}{' '}
          {taskTitle(topHabit.templateId, topHabit.title)} —{' '}
          {t('digest.habitDetail', { n: topHabit.doneCount, name: activeChild.name })}
        </div>
      )}

      <Link to="/parent/story" className="btn-primary w-full">
        <Share2 size={18} /> {t('digest.toStory')}
      </Link>

      <p className="px-1 text-xs text-muted">{t('digest.deliveryNote')}</p>
    </div>
  )
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center">{icon}</div>
      <div>
        <div className="text-lg font-extrabold leading-none">{value}</div>
        <div className="text-[11px] text-muted">{label}</div>
      </div>
    </div>
  )
}
