import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { AvatarPicker } from '@/ui/AvatarPicker'
import { ageFitGoalMax } from '@/domain'
import { t } from '@/i18n'

export function AddChild() {
  const nav = useNavigate()
  const addChild = useStore((s) => s.addChild)
  const childCount = useStore((s) => s.data.children.length)
  const can = useStore((s) => s.can)
  const [name, setName] = useState('')
  const [age, setAge] = useState(4)
  const [avatar, setAvatar] = useState('🦄')

  // The Children screen hides the button on a free account, but the route is
  // reachable directly. Entitlements have to be checked where the write happens,
  // not only where the button is drawn.
  if (!can.canAddChild(childCount)) {
    return (
      <div className="app-frame bg-paper text-ink min-h-screen">
        <PageHeader title={t('child.add')} back="/parent/children" />
        <div className="px-5">
          <div className="card flex flex-col items-center gap-3 p-8 text-center">
            <Lock size={28} className="text-gold" />
            <p className="text-sm text-muted">{t('children.gate.blurb')}</p>
            <Link to="/parent/upgrade" className="btn-gold mt-1">
              {t('children.addWithPlus')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
          <label htmlFor="child-name" className="text-sm font-semibold text-muted">
            {t('common.name')}
          </label>
          <input
            id="child-name"
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
