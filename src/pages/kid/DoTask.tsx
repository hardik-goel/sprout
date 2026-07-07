import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PartyPopper } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { PhotoCapture } from '@/components/PhotoCapture'
import { dataStore } from '@/lib/dataStore'

export function DoTask() {
  const { taskId } = useParams()
  const nav = useNavigate()
  const task = useStore((s) => s.data.tasks.find((t) => t.id === taskId))
  const markDone = useStore((s) => s.markDone)
  const [photo, setPhoto] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (!task) {
    return (
      <div className="px-5 pt-20 text-center text-white/70">
        Task not found.{' '}
        <Link to="/kid" className="font-bold text-glow">
          Go back
        </Link>
      </div>
    )
  }

  async function submit() {
    setSaving(true)
    // Photo seam: dataStore.savePhoto is a stub today (returns the data URL).
    const stored = photo ? await dataStore.savePhoto(photo) : null
    markDone(task!.id, stored)
    nav('/kid')
  }

  return (
    <div className="flex min-h-screen flex-col px-5 pb-10">
      <PageHeader title="" back="/kid" kid />
      <div className="flex flex-col items-center text-center">
        <div className="text-7xl">{task.emoji}</div>
        <h1 className="mt-3 text-2xl font-extrabold">{task.title}</h1>
        <div className="mt-1 chip bg-glow/15 text-glow">+{task.points} points</div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-bold text-white/70">Take a photo to show you did it 📸</p>
        <PhotoCapture value={photo} onChange={setPhoto} />
      </div>

      <div className="mt-auto pt-6">
        <button
          className="btn w-full bg-glow py-4 text-lg text-kidbg1 shadow-glow disabled:opacity-50"
          onClick={submit}
          disabled={saving}
        >
          <PartyPopper size={22} /> {saving ? 'Sending…' : 'I did it!'}
        </button>
        <p className="mt-2 text-center text-xs text-white/50">
          A grown-up will check and say well done ✓
        </p>
      </div>
    </div>
  )
}
