import type { GardenStage } from '@/types'
import { STAGE_EMOJI, STAGE_LABEL } from '@/lib/game'

// The garden: a plant at its current stage, with unlocked flowers around it.
export function GardenVisual({
  stage,
  flowers,
  size = 'md',
  grew = false,
}: {
  stage: GardenStage
  flowers: string[]
  size?: 'sm' | 'md' | 'lg'
  grew?: boolean
}) {
  const plant = size === 'lg' ? 'text-8xl' : size === 'sm' ? 'text-4xl' : 'text-6xl'
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-end justify-center">
        {/* soil mound */}
        <div className="absolute bottom-0 h-6 w-40 rounded-[100%] bg-[#5b3b22]/80 blur-[1px]" />
        <div className={`relative z-10 pb-3 ${plant} ${grew ? 'animate-grow-up' : ''}`}>
          {STAGE_EMOJI[stage]}
        </div>
      </div>
      {flowers.length > 0 && (
        <div className="flex gap-1 text-xl" aria-label="Unlocked flowers">
          {flowers.map((f, i) => (
            <span key={i} className="animate-pop-in" style={{ animationDelay: `${i * 80}ms` }}>
              {f}
            </span>
          ))}
        </div>
      )}
      <div className="chip bg-glow/15 text-glow">{STAGE_LABEL[stage]}</div>
    </div>
  )
}
