import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, PiggyBank, Sparkles } from 'lucide-react'
import { useStore } from '@/store'
import { JarVisual } from '@/components/JarVisual'
import { jarProgress } from '@/lib/game'

export function MyJar() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.activeChild())
  const setGoal = useStore((s) => s.setGoal)
  const redeemReward = useStore((s) => s.redeemReward)
  const [toast, setToast] = useState<string | null>(null)

  if (!child) return <div className="px-5 pt-20 text-center text-white/70">No kid set up.</div>

  const goal = data.rewards.find((r) => r.id === child.goalId)
  const { pct, remaining } = goal ? jarProgress(child.points, goal.cost) : { pct: 0, remaining: 0 }
  const available = data.rewards.filter((r) => !r.redeemed)

  function spend(rewardId: string) {
    const ok = redeemReward(child!.id, rewardId)
    if (ok) {
      const r = data.rewards.find((x) => x.id === rewardId)
      setToast(`You got ${r?.emoji} ${r?.title}! Ask a grown-up.`)
      setTimeout(() => nav(`/parent/reward/${rewardId}`), 1400)
    }
  }

  return (
    <div className="px-5 pb-6 pt-8">
      <div className="flex items-center gap-2">
        <PiggyBank className="text-glow" />
        <h1 className="text-2xl font-extrabold">My Jar</h1>
      </div>

      <div className="mt-4 flex flex-col items-center rounded-kid bg-white/5 p-6">
        <JarVisual pct={pct} size="lg" label={goal ? `to ${goal.title}` : 'no goal yet'} />
        <div className="mt-3 text-center">
          <div className="text-3xl font-extrabold text-glow">{child.points} pts</div>
          {goal ? (
            <p className="text-sm text-white/70">
              {remaining > 0 ? `${remaining} more to ${goal.emoji} ${goal.title}` : `Goal reached! ${goal.emoji}`}
            </p>
          ) : (
            <p className="text-sm text-white/70">Pick something to save for ↓</p>
          )}
        </div>
      </div>

      {/* Spend vs save */}
      <h2 className="mt-7 text-lg font-extrabold">Spend now or keep saving?</h2>
      <p className="text-sm text-white/55">Cheaper treats you can get now — or save for something big!</p>

      <div className="mt-3 space-y-2">
        {available.map((r) => {
          const afford = child.points >= r.cost
          const isGoal = child.goalId === r.id
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-kid bg-white/10 p-4">
              <span className="text-3xl">{r.emoji}</span>
              <div className="flex-1">
                <div className="font-bold">{r.title}</div>
                <div className="text-sm text-white/60">{r.cost} pts</div>
              </div>
              {afford ? (
                <button
                  onClick={() => spend(r.id)}
                  className="rounded-full bg-glow px-4 py-2 text-sm font-bold text-kidbg1 active:scale-95"
                >
                  Spend
                </button>
              ) : isGoal ? (
                <span className="chip bg-glow/15 text-glow">
                  <Sparkles size={13} /> Saving
                </span>
              ) : (
                <button
                  onClick={() => setGoal(child.id, r.id)}
                  className="chip bg-white/10 text-white/70"
                >
                  <Lock size={13} /> Save for this
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
