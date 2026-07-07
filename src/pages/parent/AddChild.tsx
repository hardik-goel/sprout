import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { AvatarPicker } from '@/components/AvatarPicker'
import { ageFitGoalMax } from '@/lib/game'

export function AddChild() {
  const nav = useNavigate()
  const addChild = useStore((s) => s.addChild)
  const [name, setName] = useState('')
  const [age, setAge] = useState(4)
  const [avatar, setAvatar] = useState('🦄')

  function save() {
    if (!name.trim()) return
    addChild(name.trim(), age, avatar)
    nav('/parent/tasks')
  }

  return (
    <div className="app-frame bg-paper text-ink min-h-screen">
      <PageHeader title="Add a child" subtitle="Ages 2–8" back="/parent" />
      <div className="px-5 pb-12">
        <div className="card p-5">
          <label className="text-sm font-semibold text-muted">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vir"
            className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-sprout"
          />

          <label className="mt-5 block text-sm font-semibold text-muted">Age: {age}</label>
          <div className="mt-2 flex gap-2">
            {[2, 3, 4, 5, 6, 7, 8].map((a) => (
              <button
                key={a}
                onClick={() => setAge(a)}
                className={`flex h-11 flex-1 items-center justify-center rounded-xl font-bold transition ${
                  age === a ? 'bg-sprout text-white' : 'bg-white border border-line text-ink'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">
            We’ll keep goals small for younger kids — default goal up to {ageFitGoalMax(age)} pts so
            the jar feels reachable.
          </p>

          <label className="mt-5 block text-sm font-semibold text-muted">Avatar</label>
          <div className="mt-2">
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </div>
        </div>

        <button className="btn-primary mt-6 w-full" onClick={save} disabled={!name.trim()}>
          Save & pick tasks <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
