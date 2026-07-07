import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ImageOff, Sprout, ThumbsUp } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { GardenVisual } from '@/components/GardenVisual'
import {
  approvedTaskCount,
  effectiveStreak,
  gardenStage,
  unlockedFlowers,
} from '@/lib/game'

export function ApproveTask() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const approveTask = useStore((s) => s.approveTask)
  const [done, setDone] = useState(false)

  const task = data.tasks.find((t) => t.id === taskId)
  const child = data.children.find((c) => c.id === task?.childId)

  if (!task || !child) {
    return (
      <div className="px-5 pt-20 text-center text-muted">
        Task not found.{' '}
        <Link to="/parent" className="text-sprout font-semibold">
          Home
        </Link>
      </div>
    )
  }

  // After approval, recompute fresh from store for the "grew" view.
  const freshChild = data.children.find((c) => c.id === child.id)!
  const approved = approvedTaskCount(data.tasks, child.id)
  const stage = gardenStage(approved)

  function doApprove() {
    approveTask(task!.id)
    setDone(true)
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col px-5 pb-10">
        <PageHeader title="Approved!" back="/parent" />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-2 flex items-center gap-2 text-sprout">
            <ThumbsUp size={20} />
            <span className="font-bold">+{task.points} points added to {child.name}</span>
          </div>
          <div className="my-6">
            <GardenVisual
              stage={stage}
              flowers={unlockedFlowers(freshChild.bestStreak)}
              grew
              size="lg"
            />
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Sprout size={16} className="text-sprout" /> Garden updated · streak{' '}
            {effectiveStreak(freshChild)} days
          </p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
            <button className="btn-primary w-full" onClick={() => nav('/parent')}>
              <Check size={18} /> Back home
            </button>
            <button className="btn-ghost w-full" onClick={() => nav('/kid/celebrate')}>
              See {child.name}’s celebration
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader title="Approve task" subtitle={`${child.name} marked this done`} back="/parent" />
      <div className="px-5">
        <div className="card overflow-hidden">
          {task.photo ? (
            <img src={task.photo} alt="Task proof" className="h-72 w-full object-cover" />
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center gap-2 bg-line/50 text-muted">
              <ImageOff size={32} />
              <span className="text-sm">No photo added</span>
            </div>
          )}
          <div className="flex items-center gap-3 p-5">
            <span className="text-3xl">{task.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-extrabold">{task.title}</div>
              <div className="text-sm text-muted">Worth +{task.points} points</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button className="btn-primary w-full" onClick={doApprove}>
            <Check size={18} /> Approve · +{task.points} pts
          </button>
          <button className="btn-ghost w-full" onClick={() => nav('/parent')}>
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}
