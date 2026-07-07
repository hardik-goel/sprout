import { useStore } from '@/store'
import { GardenVisual } from '@/components/GardenVisual'
import {
  approvedTaskCount,
  effectiveStreak,
  FLOWER_EMOJI,
  FLOWER_MILESTONES,
  gardenStage,
  nextFlowerMilestone,
  nextStageProgress,
  STAGE_EMOJI,
  STAGE_LABEL,
  STAGE_ORDER,
} from '@/lib/game'

export function GardenWorld() {
  const data = useStore((s) => s.data)
  const child = useStore((s) => s.activeChild())

  if (!child) return <div className="px-5 pt-20 text-center text-white/70">No kid set up.</div>

  const approved = approvedTaskCount(data.tasks, child.id)
  const stage = gardenStage(approved)
  const { next, remaining } = nextStageProgress(approved)
  const streak = effectiveStreak(child)
  const nextFlower = nextFlowerMilestone(child.bestStreak)

  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="text-2xl font-extrabold">My Garden 🌳</h1>
      <p className="text-sm text-white/55">Do tasks to grow it. Keep streaks to bloom flowers!</p>

      <div className="mt-5 rounded-kid bg-white/5 p-6 shadow-glow">
        <GardenVisual stage={stage} flowers={unlocked(child.bestStreak)} size="lg" />
        <div className="mt-4 text-center text-sm text-white/70">
          {next ? (
            <>
              <span className="font-bold text-glow">{remaining}</span> more task
              {remaining === 1 ? '' : 's'} to become a {STAGE_EMOJI[next]} {STAGE_LABEL[next]}!
            </>
          ) : (
            <>Your plant is a mighty tree! 🌳 Keep it thriving.</>
          )}
        </div>
      </div>

      {/* Growth stages */}
      <h2 className="mt-7 text-lg font-extrabold">Growth stages</h2>
      <div className="mt-3 flex justify-between rounded-kid bg-white/5 p-4">
        {STAGE_ORDER.map((st) => {
          const reached = STAGE_ORDER.indexOf(st) <= STAGE_ORDER.indexOf(stage)
          return (
            <div key={st} className="flex flex-col items-center gap-1">
              <div className={`text-3xl ${reached ? '' : 'opacity-25 grayscale'}`}>
                {STAGE_EMOJI[st]}
              </div>
              <div className={`text-[10px] ${reached ? 'text-glow' : 'text-white/40'}`}>
                {STAGE_LABEL[st]}
              </div>
            </div>
          )
        })}
      </div>

      {/* Flower milestones */}
      <h2 className="mt-7 text-lg font-extrabold">Flowers from streaks 🔥</h2>
      <p className="text-sm text-white/55">
        Best streak: {child.bestStreak} days · current {streak} days
        {nextFlower ? ` · next flower at ${nextFlower} days` : ' · all flowers unlocked!'}
      </p>
      <div className="mt-3 grid grid-cols-4 gap-3">
        {FLOWER_MILESTONES.map((m, i) => {
          const got = child.bestStreak >= m
          return (
            <div
              key={m}
              className={`flex flex-col items-center gap-1 rounded-2xl p-3 ${
                got ? 'bg-glow/15' : 'bg-white/5'
              }`}
            >
              <div className={`text-3xl ${got ? '' : 'opacity-25 grayscale'}`}>{FLOWER_EMOJI[i]}</div>
              <div className={`text-[11px] ${got ? 'text-glow' : 'text-white/40'}`}>{m}d</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function unlocked(bestStreak: number): string[] {
  return FLOWER_MILESTONES.filter((m) => bestStreak >= m).map((_, i) => FLOWER_EMOJI[i])
}
