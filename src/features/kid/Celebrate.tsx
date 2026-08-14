// The signature moment. This is where the animation budget goes: garden grows
// a stage, jar thumps up, confetti — then a single button back to the real
// world. Nothing here rewards staying in the app longer.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Volume2 } from 'lucide-react'
import { useStore } from '@/store'
import { GardenVisual } from '@/ui/GardenVisual'
import { JarVisual } from '@/ui/JarVisual'
import { jarProgress, pickCheer, unlockedFlowers } from '@/domain'
import { audioStore } from '@/lib/audioStore'
import { playChime } from '@/lib/sfx'
import { t } from '@/i18n'

const CONFETTI = ['🎉', '⭐', '🌟', '✨', '🎊', '🌈']

export function Celebrate() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const celebration = useStore((s) => s.celebration)
  const clearCelebration = useStore((s) => s.clearCelebration)
  const childById = useStore((s) => s.childById)
  const activeChild = useStore((s) => s.kidChild())

  const child = (celebration ? childById(celebration.childId) : undefined) ?? activeChild

  // Animate the jar from "before this approval" to "after".
  const goal = child ? data.rewards.find((r) => r.id === child.goalId) : undefined
  const afterPts = child?.points ?? 0
  const added = celebration?.pointsAdded ?? 0
  const bonus = celebration?.bonusAdded ?? 0
  // The jar starts where it was before *both* the task and the day's bonus,
  // otherwise it appears to jump before the animation even runs.
  const beforePts = Math.max(0, afterPts - added - bonus)
  const toPct = goal ? jarProgress(afterPts, goal.cost).pct : 0
  const fromPct = goal ? jarProgress(beforePts, goal.cost).pct : 0

  const [jarPct, setJarPct] = useState(fromPct)
  const [showAdded, setShowAdded] = useState(false)

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
    playChime()
    const t1 = setTimeout(() => setJarPct(toPct), 350)
    const t2 = setTimeout(() => setShowAdded(true), 250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [toPct])

  // A3 — the recorded cheer. Rotated by approval count so it stays a person and
  // doesn't decay into a notification sound.
  const cheer = child ? pickCheer(data.cheers, child.id, child.approvedCount) : null
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [needsTap, setNeedsTap] = useState(false)

  function playCheer() {
    const src = cheer ? audioStore.url(cheer.audioId) : null
    if (!src) return
    audioRef.current?.pause()
    const el = new Audio(src)
    audioRef.current = el
    // Browsers block autoplay outside a user gesture, and how strictly varies.
    // If it's refused we don't lose the cheer — we offer a button instead.
    void el
      .play()
      .then(() => setNeedsTap(false))
      .catch(() => setNeedsTap(true))
  }

  useEffect(() => {
    if (!cheer) return
    const timer = setTimeout(playCheer, 600)
    return () => {
      clearTimeout(timer)
      audioRef.current?.pause()
      audioRef.current = null
    }
    // Re-run only when the chosen cheer changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheer?.id])

  function done() {
    clearCelebration()
    nav('/kid')
  }

  if (!child) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center text-white/70">
        {t('celebrate.nothingYet')}
      </div>
    )
  }

  const remaining = goal ? jarProgress(afterPts, goal.cost).remaining : 0

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

      <h1 className="z-10 text-center text-3xl font-extrabold">
        {t('celebrate.woohoo', { name: child.name })}
      </h1>
      {showAdded && (
        <div className="z-10 mt-2 animate-pop-in rounded-full bg-glow px-5 py-2 text-xl font-extrabold text-kidbg1">
          {t('celebrate.plusPoints', { n: added })}
        </div>
      )}
      {celebration?.stagedUp && (
        <div className="z-10 mt-2 text-sm font-bold text-gold">{t('celebrate.stagedUp')}</div>
      )}
      {/* The finish-the-day bonus lands in the celebration the child is already
          looking at. A bonus announced on a screen they never open isn't one. */}
      {(celebration?.bonusAdded ?? 0) > 0 && (
        <div className="z-10 mt-3 flex animate-pop-in items-center gap-2 rounded-full bg-gold px-5 py-2 font-extrabold text-kidbg1">
          🏆 {t('celebrate.perfectDay', { n: celebration!.bonusAdded })}
        </div>
      )}

      <div className="z-10 mt-8 flex w-full items-end justify-around">
        <div className="text-center">
          <GardenVisual
            stage={child.stage}
            flowers={unlockedFlowers(child.bestStreak)}
            grew
            size="md"
          />
          <div className="mt-1 text-xs text-white/60">{t('celebrate.gardenGrew')}</div>
        </div>
        <div className="text-center">
          <JarVisual
            pct={jarPct}
            size="md"
            label={goal ? t('celebrate.toGoal', { emoji: goal.emoji }) : undefined}
          />
          <div className="mt-1 text-xs text-white/60">{t('celebrate.jarFilled')}</div>
        </div>
      </div>

      {cheer && (
        <button
          onClick={playCheer}
          className={`z-10 mt-6 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
            needsTap ? 'bg-glow text-kidbg1 animate-pop-in' : 'bg-white/10 text-white/70'
          }`}
        >
          <Volume2 size={16} />
          {needsTap
            ? t('cheers.tapToHear', {
                name: data.members.find((m) => m.id === cheer.memberId)?.name ?? '',
              })
            : t('cheers.playingFrom', {
                name: data.members.find((m) => m.id === cheer.memberId)?.name ?? '',
              })}
        </button>
      )}

      {goal && (
        <p className="z-10 mt-6 text-center text-sm text-white/70">
          {remaining > 0
            ? t('celebrate.moreToGoal', { n: remaining, title: goal.title, emoji: goal.emoji })
            : t('celebrate.goalReached', { title: goal.title, emoji: goal.emoji })}
        </p>
      )}

      <button
        className="z-10 mt-auto w-full rounded-full bg-white py-4 text-lg font-extrabold text-kidbg1 active:scale-95"
        onClick={done}
      >
        {t('celebrate.keepGoing')}
      </button>
    </div>
  )
}
