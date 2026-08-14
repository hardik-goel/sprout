import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Lock, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useStore, type ChildView } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { StreakFlame } from '@/ui/StreakFlame'
import { ConfirmSheet } from '@/ui/ConfirmSheet'
import { AvatarPicker } from '@/ui/AvatarPicker'
import { ageFitGoalMax } from '@/domain'
import { t } from '@/i18n'

export function Children() {
  const nav = useNavigate()
  const data = useStore((s) => s.data)
  const children = useStore((s) => s.childViews())
  const activeChild = useStore((s) => s.activeChild())
  const setActiveChild = useStore((s) => s.setActiveChild)
  const removeChild = useStore((s) => s.removeChild)
  const updateChild = useStore((s) => s.updateChild)
  const can = useStore((s) => s.can)
  const [removing, setRemoving] = useState<ChildView | null>(null)

  // Editing, rather than deleting and re-adding — the app ships with a seeded
  // family, and a real parent's first move is usually "this is my kid, with my
  // kid's name" and not "burn it down".
  const [editing, setEditing] = useState<ChildView | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState(4)
  const [avatar, setAvatar] = useState('🦄')

  function openEdit(c: ChildView) {
    setName(c.name)
    setAge(c.age)
    setAvatar(c.avatar)
    setEditing(c)
  }

  function saveEdit() {
    if (!editing || !name.trim()) return
    updateChild(editing.id, { name, age, avatar })
    setEditing(null)
  }

  // First child is free; additional children are a Plus feature.
  const canAddMore = can.canAddChild(data.children.length)

  return (
    <div className="pb-8">
      <PageHeader
        title={t('children.title')}
        subtitle={t('children.subtitle')}
        right={data.children.length > 1 ? <PlusBadge /> : undefined}
      />
      <div className="space-y-3 px-5">
        {children.map((c) => {
          const isActive = c.id === activeChild?.id
          return (
            <div
              key={c.id}
              className={`card flex items-center gap-2 p-2 pr-3 ${
                isActive ? 'ring-2 ring-sprout' : ''
              }`}
            >
              <button
                onClick={() => setActiveChild(c.id)}
                className="flex flex-1 items-center gap-3 p-2 text-left"
              >
                <span className="text-3xl">{c.avatar}</span>
                <div className="flex-1">
                  <div className="font-bold">
                    {c.name}{' '}
                    <span className="text-sm font-normal text-muted">
                      {t('child.age', { age: c.age })}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StreakFlame count={c.streak} size={14} />
                    <span className="text-xs text-muted">{t('common.pts', { n: c.points })}</span>
                  </div>
                </div>
                {isActive && <Check className="text-sprout" size={20} />}
              </button>
              <button
                onClick={() => openEdit(c)}
                className="rounded-full p-2 text-muted"
                aria-label={t('child.edit.aria', { name: c.name })}
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => setRemoving(c)}
                className="rounded-full p-2 text-muted"
                aria-label={t('child.remove.aria', { name: c.name })}
              >
                <Trash2 size={18} />
              </button>
            </div>
          )
        })}

        {canAddMore ? (
          <button className="btn-primary w-full" onClick={() => nav('/parent/add-child')}>
            <Plus size={18} /> {t('child.add')}
          </button>
        ) : (
          <>
            <Link to="/parent/upgrade" className="btn-gold w-full">
              <Lock size={18} /> {t('children.addWithPlus')}
            </Link>
            {/* On a free account the way to a different child is to remove this
                one, so say so rather than leaving the gate looking like a dead
                end. */}
            <p className="text-center text-xs text-muted">{t('children.swapHint')}</p>
          </>
        )}
      </div>

      {/* Edit sheet */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-paper p-5 pb-8 animate-rise"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t('child.edit.title')}</h2>
              <button onClick={() => setEditing(null)} aria-label={t('common.close')}>
                <X size={22} className="text-muted" />
              </button>
            </div>

            <label htmlFor="edit-child-name" className="text-sm font-semibold text-muted">
              {t('common.name')}
            </label>
            <input
              id="edit-child-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 text-lg font-semibold outline-none focus:border-sprout"
            />

            <label className="mt-5 block text-sm font-semibold text-muted">
              {t('child.ageLabel', { age })}
            </label>
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
            <p className="mt-2 text-xs text-muted">{t('child.ageFitHint', { max: ageFitGoalMax(age) })}</p>
            {editing.age !== age && (
              // Points already earned are history and are never rescaled — only
              // what happens from here on moves.
              <p className="mt-2 rounded-2xl bg-gold/10 p-3 text-xs text-gold">
                {t('child.edit.ageWarning')}
              </p>
            )}

            <label className="mt-5 block text-sm font-semibold text-muted">{t('child.avatar')}</label>
            <div className="mt-2">
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>

            <button className="btn-primary mt-6 w-full" onClick={saveEdit} disabled={!name.trim()}>
              {t('child.edit.save')}
            </button>
          </div>
        </div>
      )}

      {/* The only delete in the app that touches the ledger — so it spells out
          exactly what goes, per child, before it goes. */}
      <ConfirmSheet
        open={removing !== null}
        title={t('child.remove.title', { name: removing?.name ?? '' })}
        body={t('child.remove.body', {
          name: removing?.name ?? '',
          points: removing?.points ?? 0,
          tasks: data.tasks.filter((task) => task.childId === removing?.id).length,
        })}
        confirmLabel={t('child.remove.cta', { name: removing?.name ?? '' })}
        destructive
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) removeChild(removing.id)
          setRemoving(null)
        }}
      />
    </div>
  )
}
