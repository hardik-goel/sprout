import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { AvatarPicker } from '@/ui/AvatarPicker'
import { ageFitGoalMax } from '@/domain'
import { t } from '@/i18n'

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
      <PageHeader title={t('child.add')} subtitle={t('child.ageRange')} back="/parent" />
      <div className="px-5 pb-12">
        <div className="card p-5">
          <label className="text-sm font-semibold text-muted">{t('common.name')}</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('child.namePlaceholder')}
            className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-sprout"
          />

          <label className="mt-5 block text-sm font-semibold text-muted">{t('child.ageLabel', { age })}</label>
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
            {t('child.ageFitHint', { max: ageFitGoalMax(age) })}
          </p>

          <label className="mt-5 block text-sm font-semibold text-muted">{t('child.avatar')}</label>
          <div className="mt-2">
            <AvatarPicker value={avatar} onChange={setAvatar} />
          </div>
        </div>

        <button className="btn-primary mt-6 w-full" onClick={save} disabled={!name.trim()}>
          {t('child.saveAndPick')} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
