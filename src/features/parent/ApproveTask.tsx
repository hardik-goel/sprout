import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ImageOff, RotateCcw, Sprout, ThumbsUp, X } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { GardenVisual } from '@/ui/GardenVisual'
import { photoStore } from '@/lib/photoStore'
import { unlockedFlowers } from '@/domain'
import { t } from '@/i18n'

export function ApproveTask() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const approveTask = useStore((s) => s.approveTask)
  const rejectTask = useStore((s) => s.rejectTask)
  const undoApproval = useStore((s) => s.undoApproval)
  const childById = useStore((s) => s.childById)
  const [done, setDone] = useState(false)

  const task = data.tasks.find((x) => x.id === taskId)
  const child = task ? childById(task.childId) : undefined

  if (!task || !child) {
    return (
      <div className="px-5 pt-20 text-center text-muted">
        {t('approve.notFound')}{' '}
        <Link to="/parent" className="text-sprout font-semibold">
          {t('common.home')}
        </Link>
      </div>
    )
  }

  const photo = photoStore.url(task.photoId)

  function doApprove() {
    approveTask(task!.id)
    setDone(true)
  }

  function doUndo() {
    undoApproval(task!.id)
    setDone(false)
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col px-5 pb-10">
        <PageHeader title={t('approve.approved')} back="/parent" />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-2 flex items-center gap-2 text-sprout">
            <ThumbsUp size={20} />
            <span className="font-bold">
              {t('approve.pointsAdded', { pts: task.points, name: child.name })}
            </span>
          </div>
          <div className="my-6">
            {/* child is re-derived from the ledger, so this is the post-approval garden */}
            <GardenVisual
              stage={child.stage}
              flowers={unlockedFlowers(child.bestStreak)}
              grew
              size="lg"
            />
          </div>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Sprout size={16} className="text-sprout" />{' '}
            {t('approve.gardenUpdated', { n: child.streak })}
          </p>
          <div className="mt-8 flex w-full max-w-xs flex-col gap-2">
            <button className="btn-primary w-full" onClick={() => nav('/parent')}>
              <Check size={18} /> {t('approve.backHome')}
            </button>
            <button className="btn-ghost w-full" onClick={() => nav('/kid/celebrate')}>
              {t('approve.seeCelebration', { name: child.name })}
            </button>
            {/* Undo is a compensating ledger event — history is never rewritten. */}
            <button className="btn-ghost w-full text-muted" onClick={doUndo}>
              <RotateCcw size={16} /> {t('approve.undo')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader
        title={t('approve.title')}
        subtitle={t('approve.subtitle', { name: child.name })}
        back="/parent"
      />
      <div className="px-5">
        <div className="card overflow-hidden">
          {photo ? (
            <img src={photo} alt={t('photo.alt')} className="h-72 w-full object-cover" />
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center gap-2 bg-line/50 text-muted">
              <ImageOff size={32} />
              <span className="text-sm">{t('approve.noPhoto')}</span>
            </div>
          )}
          <div className="flex items-center gap-3 p-5">
            <span className="text-3xl">{task.emoji}</span>
            <div className="flex-1">
              <div className="text-lg font-extrabold">{task.title}</div>
              <div className="text-sm text-muted">{t('approve.worth', { pts: task.points })}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button className="btn-primary w-full" onClick={doApprove}>
            <Check size={18} /> {t('approve.cta', { pts: task.points })}
          </button>
          <button
            className="btn-ghost w-full"
            onClick={() => {
              rejectTask(task.id)
              nav('/parent')
            }}
          >
            <X size={18} /> {t('approve.tryAgain')}
          </button>
          <button className="btn-ghost w-full text-muted" onClick={() => nav('/parent')}>
            {t('approve.notYet')}
          </button>
        </div>
      </div>
    </div>
  )
}
