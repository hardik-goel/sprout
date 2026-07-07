import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { GardenVisual } from '@/components/GardenVisual'
import { JarVisual } from '@/components/JarVisual'
import {
  approvedTaskCount,
  gardenStage,
  jarProgress,
  unlockedFlowers,
} from '@/lib/game'

const CONFETTI = ['🎉', '⭐', '🌟', '✨', '🎊', '🌈']

export function Celebrate() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const celebration = useStore((s) => s.celebration)
  const clearCelebration = useStore((s) => s.clearCelebration)

  const child =
    data.children.find((c) => c.id === celebration?.childId) ?? data.children.find((c) => c.id === data.activeChildId)

  // Animate jar from "before" to "after".
  const goal = child ? data.rewards.find((r) => r.id === child.goalId) : undefined
  const afterPts = child?.points ?? 0
  const added = celebration?.pointsAdded ?? 0
  const beforePts = Math.max(0, afterPts - added)
  const toPct = goal ? jarProgress(afterPts, goal.cost).pct : 0
  const fromPct = goal ? jarProgress(beforePts, goal.cost).pct : 0

  const [jarPct, setJarPct] = useState(fromPct)
  const [showAdded, setShowAdded] = useState(false)

  const stage = child ? gardenStage(approvedTaskCount(data.tasks, child.id)) : 'seed'
  const flowers = child ? unlockedFlowers(child.bestStreak) : []

  const confetti = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: (i % 7) * 0.12,
        emoji: CONFETTI[i % CONFETTI.length],
      })),
    [],
  )

  useEffect(() => {
    const t1 = setTimeout(() => setJarPct(toPct), 350)
    const t2 = setTimeout(() => setShowAdded(true), 250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [toPct])

  function done() {
    clearCelebration()
    nav('/kid')
  }

  if (!child) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white/70">
        Nothing to celebrate yet — finish a task first! 🌱
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden px-5 pb-10 pt-10">
      {/* confetti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute -top-6 text-2xl animate-confetti"
            style={{ left: `${c.left}%`, animationDelay: `${c.delay}s` }}
          >
            {c.emoji}
          </span>
        ))}
      </div>

      <h1 className="z-10 text-center text-3xl font-extrabold">Woohoo, {child.name}! 🎉</h1>
      {showAdded && (
        <div className="z-10 mt-2 animate-pop-in rounded-full bg-glow px-5 py-2 text-xl font-extrabold text-kidbg1">
          +{added} points!
        </div>
      )}

      <div className="z-10 mt-8 flex w-full items-end justify-around">
        <div className="text-center">
          <GardenVisual stage={stage} flowers={flowers} grew size="md" />
          <div className="mt-1 text-xs text-white/60">Your garden grew!</div>
        </div>
        <div className="text-center">
          <JarVisual pct={jarPct} size="md" label={goal ? `to ${goal.emoji}` : undefined} />
          <div className="mt-1 text-xs text-white/60">Jar filled up!</div>
        </div>
      </div>

      {goal && (
        <p className="z-10 mt-6 text-center text-sm text-white/70">
          {jarProgress(afterPts, goal.cost).remaining > 0
            ? `${jarProgress(afterPts, goal.cost).remaining} more points to your ${goal.title} ${goal.emoji}`
            : `You reached your ${goal.title} goal! ${goal.emoji}`}
        </p>
      )}

      <button
        className="z-10 mt-auto w-full rounded-full bg-white py-4 text-lg font-extrabold text-kidbg1 active:scale-95"
        onClick={done}
      >
        Yay! Keep going 🌟
      </button>
    </div>
  )
}
