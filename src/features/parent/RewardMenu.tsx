import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Plus, Target, X } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import {
  ageFitGoalMax,
  ageFitSuggestedGoal,
  HEALTHY_ALTERNATIVES,
  isLessHealthyReward,
  rewardsForChild,
} from '@/domain'
import type { RewardTag } from '@/domain/types'
import { t } from '@/i18n'

const TAG_OPTIONS: { tag: RewardTag; key: string; emoji: string }[] = [
  { tag: 'outing', key: 'reward.tag.outing', emoji: '🌳' },
  { tag: 'toy', key: 'reward.tag.toy', emoji: '🧸' },
  { tag: 'experience', key: 'reward.tag.experience', emoji: '✨' },
  { tag: 'treat', key: 'reward.tag.treat', emoji: '🎈' },
  { tag: 'screen', key: 'reward.tag.screen', emoji: '📺' },
  { tag: 'sweet', key: 'reward.tag.sweet', emoji: '🍬' },
]

const EMOJI_CHOICES = ['🎁', '🦁', '🍦', '🌟', '📚', '📺', '🎈', '🧸', '🚲', '🎨', '🍫', '⚽']

export function RewardMenu() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const addReward = useStore((s) => s.addReward)
  const setGoal = useStore((s) => s.setGoal)

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('🎁')
  const [cost, setCost] = useState(activeChild ? ageFitSuggestedGoal(activeChild.age) : 50)
  const [tags, setTags] = useState<RewardTag[]>([])

  const showNudge = isLessHealthyReward(tags)
  // Age-fit: a 3-year-old's goal ceiling is days away, not weeks.
  const maxCost = activeChild ? ageFitGoalMax(activeChild.age) : 400
  const visible = activeChild ? rewardsForChild(data.rewards, activeChild.id) : data.rewards

  function toggleTag(tag: RewardTag) {
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : [...cur, tag]))
  }

  function save() {
    if (!title.trim()) return
    addReward({
      title: title.trim(),
      emoji,
      cost: Math.min(cost, maxCost),
      tags,
      childId: activeChild?.id ?? null,
    })
    setOpen(false)
    setTitle('')
    setEmoji('🎁')
    setTags([])
  }

  // The suggestion is our copy, so it is translated; once accepted it becomes
  // the parent's own reward title and is stored exactly as they see it.
  function useAlternative(alt: (typeof HEALTHY_ALTERNATIVES)[number]) {
    setTitle(t(alt.titleKey))
    setEmoji(alt.emoji)
    setTags(alt.tags)
  }

  return (
    <div className="pb-8">
      <PageHeader
        title={t('rewards.title')}
        subtitle={
          activeChild ? t('rewards.subtitleFor', { name: activeChild.name }) : t('rewards.subtitle')
        }
        right={
          <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
            <Plus size={16} /> {t('common.new')}
          </button>
        }
      />

      <div className="space-y-2 px-5">
        {visible.map((r) => {
          const isGoal = activeChild?.goalId === r.id
          return (
            <div key={r.id} className="card flex items-center gap-3 p-4">
              <span className="text-2xl">{r.emoji}</span>
              <div className="flex-1">
                <div className="font-bold">{r.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {t('common.pts', { n: r.cost })}
                  {isLessHealthyReward(r.tags) && (
                    <span className="chip bg-berry/10 text-berry">
                      <Heart size={11} /> {t('reward.treatChip')}
                    </span>
                  )}
                  {r.redeemed && (
                    <span className="chip bg-gold/15 text-gold">{t('reward.redeemedChip')}</span>
                  )}
                </div>
              </div>
              {/* A redeemed reward is no longer a goal to pick — it is a thing
                  owed, so the row leads to the fulfilment screen instead. */}
              {r.redeemed ? (
                <Link to={`/parent/reward/${r.id}`} className="btn-ghost px-3 py-2 text-sm">
                  {r.fulfilled ? t('fulfil.given') : t('reward.openFulfil')}
                </Link>
              ) : (
                activeChild &&
                (isGoal ? (
                  <span className="chip bg-sprout/15 text-sprout">
                    <Target size={14} /> {t('reward.goalChip')}
                  </span>
                ) : (
                  <button
                    onClick={() => setGoal(activeChild.id, r.id)}
                    className="btn-ghost px-3 py-2 text-sm"
                  >
                    {t('reward.setGoal')}
                  </button>
                ))
              )}
            </div>
          )
        })}
      </div>

      {/* Add-reward sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-paper p-5 pb-8 animate-rise"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold">{t('reward.new')}</h2>
              <button onClick={() => setOpen(false)} aria-label={t('common.close')}>
                <X size={22} className="text-muted" />
              </button>
            </div>

            <label htmlFor="reward-name" className="text-sm font-semibold text-muted">
              {t('common.name')}
            </label>
            <input
              id="reward-name"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('reward.namePlaceholder')}
              className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 font-semibold outline-none focus:border-sprout"
            />

            <label className="mt-4 block text-sm font-semibold text-muted">
              {t('reward.icon')}
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${
                    emoji === e ? 'bg-sprout/15 ring-2 ring-sprout' : 'bg-white border border-line'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-sm font-semibold text-muted">
              {t('reward.cost', { n: Math.min(cost, maxCost) })}
            </label>
            <input
              type="range"
              min={10}
              max={maxCost}
              step={5}
              value={Math.min(cost, maxCost)}
              onChange={(e) => setCost(Number(e.target.value))}
              className="mt-2 w-full accent-sprout"
            />
            {activeChild && (
              <p className="mt-1 text-xs text-muted">
                {t('reward.ageFitHint', { age: activeChild.age, max: maxCost })}
              </p>
            )}

            <label className="mt-4 block text-sm font-semibold text-muted">
              {t('reward.tags')}
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              {TAG_OPTIONS.map((opt) => (
                <button
                  key={opt.tag}
                  onClick={() => toggleTag(opt.tag)}
                  className={`chip border ${
                    tags.includes(opt.tag)
                      ? 'border-sprout bg-sprout/10 text-sprout'
                      : 'border-line bg-white text-muted'
                  }`}
                >
                  {opt.emoji} {t(opt.key)}
                </button>
              ))}
            </div>

            {/* Healthy nudge: suggests, never blocks. "Add anyway" is always right there. */}
            {showNudge && (
              <div className="mt-4 rounded-2xl bg-berry/10 p-3 text-sm text-berry">
                <div className="flex gap-2">
                  <Heart size={18} className="mt-0.5 shrink-0" />
                  <p>{t('reward.nudge')}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {HEALTHY_ALTERNATIVES.slice(0, 3).map((alt) => (
                    <button
                      key={alt.titleKey}
                      onClick={() => useAlternative(alt)}
                      className="chip border border-berry/30 bg-white text-berry"
                    >
                      {alt.emoji} {t(alt.titleKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-primary mt-5 w-full" onClick={save} disabled={!title.trim()}>
              {showNudge ? t('reward.addAnyway') : t('reward.add')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
