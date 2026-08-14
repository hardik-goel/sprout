import { PartyPopper, PiggyBank, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { JarVisual } from '@/ui/JarVisual'
import { jarProgress, rewardsForChild, supportsThreeJars } from '@/domain'
import { t } from '@/i18n'

// The kid's jar is a window, not a control panel. Choosing the goal and
// handing a reward over are both parent decisions — a four-year-old cashing
// out their own zoo trip at 9pm is the argument this app exists to prevent.
export function MyJar() {
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.kidChild())
  const can = useStore((s) => s.can)

  if (!child) return <div className="px-5 pt-20 text-center text-white/70">{t('kid.noKid')}</div>

  const goal = data.rewards.find((r) => r.id === child.goalId)
  const { pct, remaining } = goal ? jarProgress(child.points, goal.cost) : { pct: 0, remaining: 0 }
  const available = rewardsForChild(data.rewards, child.id).filter((r) => !r.redeemed)
  // P6: three jars are for kids old enough to weigh a trade-off, on Plus.
  const showThreeJars = supportsThreeJars(child.age) && can.can('threeJars')

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
            <p className="text-sm text-white/70">{t('kid.grownupPicksGoal')}</p>
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
                <span className="chip bg-glow/20 text-glow">
                  <PartyPopper size={13} /> {t('kid.readyAskGrownup')}
                </span>
              ) : isGoal ? (
                <span className="chip bg-glow/15 text-glow">
                  <Sparkles size={13} /> {t('kid.saving')}
                </span>
              ) : (
                <span className="chip bg-white/10 text-white/60">
                  {t('kid.keepSaving', { n: r.cost - child.points })}
                </span>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
