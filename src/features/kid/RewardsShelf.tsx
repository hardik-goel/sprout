import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Star, Target } from 'lucide-react'
import { useStore } from '@/store'
import { jarProgress, rewardsForChild } from '@/domain'
import { t } from '@/i18n'

export function RewardsShelf() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.activeChild())
  const setGoal = useStore((s) => s.setGoal)
  const redeemReward = useStore((s) => s.redeemReward)
  const [toast, setToast] = useState<string | null>(null)

  if (!child) return <div className="px-5 pt-20 text-center text-white/70">{t('kid.noKid')}</div>

  const rewards = rewardsForChild(data.rewards, child.id)

  function get(rewardId: string, cost: number) {
    if (child!.points < cost) return
    const ok = redeemReward(child!.id, rewardId)
    if (ok) {
      const r = data.rewards.find((x) => x.id === rewardId)
      setToast(t('kid.yay', { emoji: r?.emoji ?? '', title: r?.title ?? '' }))
      setTimeout(() => nav(`/parent/reward/${rewardId}`), 1400)
    }
  }

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
                  <button
                    onClick={() => get(r.id, r.cost)}
                    className="rounded-full bg-glow px-4 py-2 text-sm font-bold text-kidbg1 active:scale-95"
                  >
                    {t('shelf.getIt')}
                  </button>
                ) : isGoal ? (
                  <span className="chip bg-gold/20 text-gold">
                    <Target size={14} /> {t('reward.goalChip')}
                  </span>
                ) : (
                  <button onClick={() => setGoal(child.id, r.id)} className="chip bg-white/10 text-white/70">
                    {t('kid.saveForThis')}
                  </button>
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

      {toast && (
        <div className="fixed inset-x-0 bottom-28 z-50 mx-auto w-[90%] max-w-[400px] rounded-2xl bg-glow px-4 py-3 text-center font-bold text-kidbg1 shadow-glow">
          {toast}
        </div>
      )}
    </div>
  )
}
