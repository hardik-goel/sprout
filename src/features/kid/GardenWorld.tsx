import { useStore } from '@/store'
import { GardenVisual } from '@/ui/GardenVisual'
import {
  FLOWER_EMOJI,
  FLOWER_MILESTONES,
  nextFlowerMilestone,
  nextStageProgress,
  STAGE_EMOJI,
  STAGE_LABEL_KEY,
  STAGE_ORDER,
  unlockedFlowers,
} from '@/domain'
import { t } from '@/i18n'

export function GardenWorld() {
  const child = useStore((s) => s.activeChild())

  if (!child) return <div className="px-5 pt-20 text-center text-white/70">{t('kid.noKid')}</div>

  const { next, remaining } = nextStageProgress(child.approvedCount)
  const nextFlower = nextFlowerMilestone(child.bestStreak)

  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="text-2xl font-extrabold">{t('garden.title')}</h1>
      <p className="text-sm text-white/55">{t('garden.subtitle')}</p>

      <div className="mt-5 rounded-kid bg-white/5 p-6 shadow-glow">
        <GardenVisual stage={child.stage} flowers={unlockedFlowers(child.bestStreak)} size="lg" />
        <div className="mt-4 text-center text-sm text-white/70">
          {next
            ? t('garden.toNextStage', {
                n: remaining,
                emoji: STAGE_EMOJI[next],
                stage: t(STAGE_LABEL_KEY[next]),
              })
            : t('garden.maxStage')}
        </div>
      </div>

      {/* Growth stages */}
      <h2 className="mt-7 text-lg font-extrabold">{t('garden.stages')}</h2>
      <div className="mt-3 flex justify-between rounded-kid bg-white/5 p-4">
        {STAGE_ORDER.map((st) => {
          const reached = STAGE_ORDER.indexOf(st) <= STAGE_ORDER.indexOf(child.stage)
          return (
            <div key={st} className="flex flex-col items-center gap-1">
              <div className={`text-3xl ${reached ? '' : 'opacity-25 grayscale'}`}>
                {STAGE_EMOJI[st]}
              </div>
              <div className={`text-[10px] ${reached ? 'text-glow' : 'text-white/40'}`}>
                {t(STAGE_LABEL_KEY[st])}
              </div>
            </div>
          )
        })}
      </div>

      {/* Flower milestones */}
      <h2 className="mt-7 text-lg font-extrabold">{t('garden.flowersTitle')}</h2>
      <p className="text-sm text-white/55">
        {t('garden.streakSummary', { best: child.bestStreak, current: child.streak })}
        {nextFlower
          ? t('garden.nextFlower', { n: nextFlower })
          : t('garden.allFlowers')}
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
