import { Check, PartyPopper, Star, Target } from 'lucide-react'
import { useStore } from '@/store'
import { jarProgress, rewardsForChild } from '@/domain'
import { t } from '@/i18n'

// Look, want, save. Spending the points is a parent's tap, on the parent's
// screen — see the note in MyJar.
export function RewardsShelf() {
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.kidChild())

  if (!child) return <div className="px-5 pt-20 text-center text-white/70">{t('kid.noKid')}</div>

  const rewards = rewardsForChild(data.rewards, child.id)

  return (
    <div className="px-5 pb-6 pt-8">
      <div className="flex items-center gap-2">
        <Star className="text-gold" fill="#F0A92E" />
        <h1 className="text-2xl font-extrabold">{t('shelf.title')}</h1>
      </div>
      <p className="text-sm text-white/55">{t('shelf.subtitle', { n: child.points })}</p>

      <div className="mt-4 space-y-3">
        {rewards.map((r) => {
          const afford = child.points >= r.cost
          const isGoal = child.goalId === r.id
          const { pct } = jarProgress(child.points, r.cost)
          return (
            <div
              key={r.id}
              className={`rounded-kid p-4 ${r.redeemed ? 'bg-white/5 opacity-70' : 'bg-white/10'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{r.emoji}</span>
                <div className="flex-1">
                  <div className="text-lg font-bold">{r.title}</div>
                  <div className="text-sm text-white/60">{t('common.pts', { n: r.cost })}</div>
                </div>
                {r.redeemed ? (
                  <span className="chip bg-glow/15 text-glow">
                    <Check size={14} /> {t('shelf.gotIt')}
                  </span>
                ) : afford ? (
                  <span className="chip bg-glow/20 text-glow">
                    <PartyPopper size={14} /> {t('kid.readyAskGrownup')}
                  </span>
                ) : isGoal ? (
                  <span className="chip bg-gold/20 text-gold">
                    <Target size={14} /> {t('reward.goalChip')}
                  </span>
                ) : (
                  <span className="chip bg-white/10 text-white/60">
                    {t('kid.keepSaving', { n: r.cost - child.points })}
                  </span>
                )}
              </div>
              {!r.redeemed && !afford && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-glow" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-white/50">{t('shelf.pctSaved', { pct })}</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
