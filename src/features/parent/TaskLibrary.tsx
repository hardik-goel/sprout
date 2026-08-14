import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, Plus, Repeat, Trash2, X } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { ConfirmSheet } from '@/ui/ConfirmSheet'
import {
  ageFitDailyTaskCap,
  ageFitSuggestedTaskPoints,
  CUSTOM_TASK_MAX_POINTS,
  CUSTOM_TASK_MIN_POINTS,
  isAgeAppropriate,
  taskPointsFor,
  todayKey,
} from '@/domain'
import type { TaskCategory, TaskTemplate } from '@/domain/types'
import { t, taskTitle } from '@/i18n'

const CATEGORIES: TaskCategory[] = ['chore', 'learning', 'health', 'kindness', 'festival']

const EMOJI_CHOICES = ['⭐', '🪥', '🧸', '📖', '🥦', '🧼', '🎨', '🎵', '🐶', '🚿', '🙏', '🧹']

export function TaskLibrary() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const assignTask = useStore((s) => s.assignTask)
  const addCustomTask = useStore((s) => s.addCustomTask)
  const setDailyRoutine = useStore((s) => s.setDailyRoutine)
  const removeCustomTask = useStore((s) => s.removeCustomTask)
  const can = useStore((s) => s.can)
  const [justAdded, setJustAdded] = useState<string | null>(null)

  // New-task sheet
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('⭐')
  const [category, setCategory] = useState<TaskCategory>('chore')
  const [points, setPoints] = useState(activeChild ? ageFitSuggestedTaskPoints(activeChild.age) : 8)
  const [deleting, setDeleting] = useState<TaskTemplate | null>(null)

  const todaysTasks = useMemo(() => {
    const today = todayKey()
    return data.tasks.filter((task) => task.childId === activeChild?.id && task.date === today)
  }, [data.tasks, activeChild?.id])
  const assignedTplToday = useMemo(
    () => new Set(todaysTasks.map((task) => task.templateId)),
    [todaysTasks],
  )

  // Only age-appropriate templates are offered — a 2-year-old shouldn't be
  // shown "finish homework". Custom tasks are exempt: the parent wrote them
  // for this family and knows who they suit.
  const packs = useMemo(() => {
    const map = new Map<string, { pack: TaskTemplate['pack']; items: TaskTemplate[] }>()
    for (const tpl of data.templates) {
      if (tpl.pack !== 'custom' && activeChild && !isAgeAppropriate(tpl, activeChild.age)) continue
      if (!map.has(tpl.packKey)) map.set(tpl.packKey, { pack: tpl.pack, items: [] })
      map.get(tpl.packKey)!.items.push(tpl)
    }
    // The family's own tasks sit at the top — they are the ones being looked for.
    return [...map.entries()].sort(([, a], [, b]) =>
      a.pack === b.pack ? 0 : a.pack === 'custom' ? -1 : b.pack === 'custom' ? 1 : 0,
    )
  }, [data.templates, activeChild])

  function add(tpl: TaskTemplate) {
    if (!activeChild) return
    assignTask(activeChild.id, tpl)
    setJustAdded(tpl.id)
    setTimeout(() => setJustAdded((v) => (v === tpl.id ? null : v)), 1200)
  }

  function openComposer() {
    setTitle('')
    setEmoji('⭐')
    setCategory('chore')
    setPoints(activeChild ? ageFitSuggestedTaskPoints(activeChild.age) : 8)
    setComposing(true)
  }

  function saveCustom() {
    const tpl = addCustomTask({ title, emoji, category, points })
    if (!tpl) return
    setComposing(false)
    // Written *now* means wanted *today* — saving it to the library and then
    // making them find it again would be a second job for no reason.
    if (activeChild) add(tpl)
  }

  if (!activeChild)
    return (
      <div className="px-5 pt-20 text-center text-muted">
        {t('tasks.needChild')}{' '}
        <Link to="/parent/add-child" className="text-sprout font-semibold">
          {t('child.add')}
        </Link>
      </div>
    )

  const dailyCap = ageFitDailyTaskCap(activeChild.age)
  const overCap = todaysTasks.length >= dailyCap

  return (
    <div className="pb-8">
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle', { name: activeChild.name })}
        right={
          <button
            onClick={openComposer}
            className="btn-primary px-4 py-2 text-sm"
            aria-label={t('tasks.custom.new')}
          >
            <Plus size={16} /> {t('common.new')}
          </button>
        }
      />
      {overCap && (
        <p className="mx-5 mb-3 rounded-2xl bg-gold/10 p-3 text-xs text-gold">
          {t('tasks.capHint', { n: dailyCap, age: activeChild.age })}
        </p>
      )}
      <div className="space-y-6 px-5">
        {packs.map(([packKey, { pack, items }]) => {
          const locked = pack === 'plus' && !can.can('indiaPacks')
          return (
            <section key={packKey}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{t(packKey)}</h2>
                {pack === 'plus' && <PlusBadge />}
              </div>
              <div className="space-y-2">
                {items.map((tpl) => {
                  const added = assignedTplToday.has(tpl.id)
                  const isRoutine = (activeChild.dailyTemplateIds ?? []).includes(tpl.id)
                  const pts = taskPointsFor(tpl, activeChild.age)
                  return (
                    <div
                      key={tpl.id}
                      className={`card flex flex-wrap items-center gap-2 p-4 ${
                        locked ? 'opacity-55' : ''
                      }`}
                    >
                      <span className="text-2xl">{tpl.emoji}</span>
                      <div className="min-w-[45%] flex-1">
                        <div className="font-bold">{taskTitle(tpl.id, tpl.title)}</div>
                        <div className="text-xs text-muted">
                          {t(`task.category.${tpl.category}`)} · {t('common.plusPts', { n: pts })}
                        </div>
                      </div>
                      {/* A routine is why this app is opened on day 30. Without
                          it a parent re-assigns "brush teeth" every morning
                          and stops by Thursday. */}
                      {!locked && (
                        <button
                          onClick={() => setDailyRoutine(activeChild.id, tpl.id, !isRoutine)}
                          aria-pressed={isRoutine}
                          aria-label={t('tasks.everyDay')}
                          className={`chip border ${
                            isRoutine
                              ? 'border-sprout bg-sprout/10 text-sprout'
                              : 'border-line bg-white text-muted'
                          }`}
                        >
                          <Repeat size={13} /> {t('tasks.everyDay')}
                        </button>
                      )}
                      {tpl.pack === 'custom' && (
                        <button
                          onClick={() => setDeleting(tpl)}
                          className="rounded-full p-2 text-muted"
                          aria-label={t('tasks.custom.remove')}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {locked ? (
                        <span className="chip bg-line text-muted">
                          <Lock size={14} /> {t('plus.label')}
                        </span>
                      ) : added || justAdded === tpl.id ? (
                        <span className="chip bg-sprout/15 text-sprout">
                          <Check size={14} /> {t('tasks.added')}
                        </span>
                      ) : (
                        <button onClick={() => add(tpl)} className="btn-primary px-4 py-2 text-sm">
                          <Plus size={16} /> {t('tasks.assign')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {locked && (
                <Link
                  to="/parent/upgrade"
                  className="mt-2 block text-center text-sm font-semibold text-gold"
                >
                  {t('tasks.unlockPack')}
                </Link>
              )}
            </section>
          )
        })}
      </div>

      {/* Write your own task. Free — the library is our content, but the family's
          routine is theirs, and a chart that can't hold "feed the dog" is a
          chart they stop opening. */}
      {composing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-paper p-5 pb-8 animate-rise"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t('tasks.custom.new')}</h2>
              <button onClick={() => setComposing(false)} aria-label={t('common.close')}>
                <X size={22} className="text-muted" />
              </button>
            </div>

            <label htmlFor="task-name" className="text-sm font-semibold text-muted">
              {t('common.name')}
            </label>
            <input
              id="task-name"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('tasks.custom.namePlaceholder')}
              className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 font-semibold outline-none focus:border-sprout"
            />

            <label className="mt-4 block text-sm font-semibold text-muted">
              {t('tasks.custom.icon')}
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  aria-label={t('child.avatar.aria', { emoji: e })}
                  aria-pressed={emoji === e}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
                    emoji === e ? 'bg-sprout/15 ring-2 ring-sprout' : 'bg-white border border-line'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-sm font-semibold text-muted">
              {t('tasks.custom.category')}
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`chip border ${
                    category === c
                      ? 'border-sprout bg-sprout/10 text-sprout'
                      : 'border-line bg-white text-muted'
                  }`}
                >
                  {t(`task.category.${c}`)}
                </button>
              ))}
            </div>

            <label htmlFor="task-points" className="mt-4 block text-sm font-semibold text-muted">
              {t('tasks.custom.points', { n: points })}
            </label>
            <input
              id="task-points"
              type="range"
              min={CUSTOM_TASK_MIN_POINTS}
              max={CUSTOM_TASK_MAX_POINTS}
              step={2}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="mt-2 w-full accent-sprout"
            />
            <p className="mt-1 text-xs text-muted">
              {t('tasks.custom.pointsHint', { name: activeChild.name })}
            </p>

            <button className="btn-primary mt-5 w-full" onClick={saveCustom} disabled={!title.trim()}>
              <Plus size={18} /> {t('tasks.custom.save')}
            </button>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={deleting !== null}
        title={t('tasks.custom.removeTitle', { title: deleting?.title ?? '' })}
        body={t('tasks.custom.removeBody')}
        confirmLabel={t('tasks.custom.remove')}
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) removeCustomTask(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
