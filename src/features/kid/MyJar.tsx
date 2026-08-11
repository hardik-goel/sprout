import { useState } from 'react'
import { Lock, PiggyBank, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { JarVisual } from '@/ui/JarVisual'
import { jarProgress, rewardsForChild, supportsThreeJars } from '@/domain'
import { t } from '@/i18n'

export function MyJar() {
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.activeChild())
  const setGoal = useStore((s) => s.setGoal)
  const redeemReward = useStore((s) => s.redeemReward)
  const can = useStore((s) => s.can)
  const [toast, setToast] = useState<string | null>(null)

  if (!child) return <div className="px-5 pt-20 text-center text-white/70">{t('kid.noKid')}</div>

  const goal = data.rewards.find((r) => r.id === child.goalId)
  const { pct, remaining } = goal ? jarProgress(child.points, goal.cost) : { pct: 0, remaining: 0 }
  const available = rewardsForChild(data.rewards, child.id).filter((r) => !r.redeemed)
  // P6: three jars are for kids old enough to weigh a trade-off, on Plus.
  const showThreeJars = supportsThreeJars(child.age) && can.can('threeJars')

  // Redeeming used to bounce the kid into the parent world to "fulfil" the
  // reward. A three-year-old should never be dropped into the settings app —
  // the kid stays here, and the parent picks it up from the "still to give"
  // queue on their own home screen.
  function spend(rewardId: string) {
    const ok = redeemReward(child!.id, rewardId)
    if (ok) {
      const r = data.rewards.find((x) => x.id === rewardId)
      setToast(t('kid.youGot', { emoji: r?.emoji ?? '', title: r?.title ?? '' }))
      setTimeout(() => setToast(null), 2600)
    }
  }

  return (
    <div className="px-5 pb-6 pt-8">
      <div className="flex items-center gap-2">
        <PiggyBank className="text-glow" />
        <h1 className="text-2xl font-extrabold">{t('kid.myJar')}</h1>
      </div>

      <div className="mt-4 flex flex-col items-center rounded-kid bg-white/5 p-6">
        <JarVisual
          pct={pct}
          size="lg"
          label={goal ? t('kid.toGoalLabel', { title: goal.title }) : t('kid.noGoalYet')}
        />
        <div className="mt-3 text-center">
          <div className="text-3xl font-extrabold text-glow">
            {t('common.pts', { n: child.points })}
          </div>
          {goal ? (
            <p className="text-sm text-white/70">
              {remaining > 0
                ? t('kid.moreTo', { n: remaining, emoji: goal.emoji, title: goal.title })
                : t('kid.goalReached', { emoji: goal.emoji })}
            </p>
          ) : (
            <p className="text-sm text-white/70">{t('kid.pickSomething')}</p>
          )}
        </div>
      </div>

      {showThreeJars && (
        <>
          <h2 className="mt-7 text-lg font-extrabold">{t('jars.title')}</h2>
          <p className="text-sm text-white/55">
            {t('jars.splitHint', {
              save: child.jarSplit.save,
              spend: child.jarSplit.spend,
              give: child.jarSplit.give,
            })}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(['save', 'spend', 'give'] as const).map((jar) => (
              <div key={jar} className="rounded-kid bg-white/10 p-4 text-center">
                <div className="text-3xl">{t(`jars.${jar}.emoji`)}</div>
                <div className="mt-1 text-xl font-extrabold text-glow">{child.jars[jar]}</div>
                <div className="text-[11px] text-white/60">{t(`jars.${jar}.label`)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Spend vs save */}
      <h2 className="mt-7 text-lg font-extrabold">{t('kid.spendOrSave')}</h2>
      <p className="text-sm text-white/55">{t('kid.spendOrSaveHint')}</p>

      <div className="mt-3 space-y-2">
        {available.map((r) => {
          const afford = child.points >= r.cost
          const isGoal = child.goalId === r.id
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-kid bg-white/10 p-4">
              <span className="text-3xl">{r.emoji}</span>
              <div className="flex-1">
                <div className="font-bold">{r.title}</div>
                <div className="text-sm text-white/60">{t('common.pts', { n: r.cost })}</div>
              </div>
              {afford ? (
                <button
                  onClick={() => spend(r.id)}
                  className="rounded-full bg-glow px-4 py-2 text-sm font-bold text-kidbg1 active:scale-95"
                >
                  {t('kid.spend')}
                </button>
              ) : isGoal ? (
                <span className="chip bg-glow/15 text-glow">
                  <Sparkles size={13} /> {t('kid.saving')}
                </span>
              ) : (
                <button onClick={() => setGoal(child.id, r.id)} className="chip bg-white/10 text-white/70">
                  <Lock size={13} /> {t('kid.saveForThis')}
                </button>
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
