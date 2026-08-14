import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PartyPopper } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PhotoCapture } from '@/ui/PhotoCapture'
import { playWhoosh } from '@/lib/sfx'
import { t, taskTitle } from '@/i18n'

export function DoTask() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const child = useStore((s) => s.kidChild())
  const found = useStore((s) => s.data.tasks.find((x) => x.id === taskId))
  const markDone = useStore((s) => s.markDone)
  // A child can only finish their own task. Sibling views are read-only, and
  // the route is reachable by hand — so the check lives here, not in the link.
  const task = found && child && found.childId === child.id ? found : undefined
  const [photo, setPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!task) {
    return (
      <div className="px-5 pt-20 text-center text-white/70">
        {t('kid.taskNotFound')}{' '}
        <Link to="/kid" className="font-bold text-glow">
          {t('common.goBack')}
        </Link>
      </div>
    )
  }

  async function submit() {
    setSaving(true)
    playWhoosh()
    // The photo is already compressed by PhotoCapture; markDone hands it to the
    // photoStore seam and keeps only the id on the task.
    await markDone(task!.id, photo)
    nav('/kid')
  }

  return (
    <div className="flex min-h-screen flex-col px-5 pb-10">
      <PageHeader title="" back="/kid" kid />
      <div className="flex flex-col items-center text-center">
        <div className="text-7xl">{task.emoji}</div>
        <h1 className="mt-3 text-2xl font-extrabold">{taskTitle(task.templateId, task.title)}</h1>
        <div className="mt-1 chip bg-glow/15 text-glow">
          {t('common.plusPoints', { n: task.points })}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-bold text-white/70">{t('kid.photoPrompt')}</p>
        <PhotoCapture value={photo} onChange={setPhoto} />
      </div>

      <div className="mt-auto pt-6">
        <button
          className="btn w-full bg-glow py-4 text-lg text-kidbg1 shadow-glow disabled:opacity-50"
          onClick={submit}
          disabled={saving}
        >
          <PartyPopper size={22} /> {saving ? t('kid.sending') : t('kid.iDidIt')}
        </button>
        <p className="mt-2 text-center text-xs text-white/50">{t('kid.grownupWillCheck')}</p>
      </div>
    </div>
  )
}
