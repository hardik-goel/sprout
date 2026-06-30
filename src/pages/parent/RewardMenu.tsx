import { useState } from 'react'
import { Heart, Plus, Target, X } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/components/PageHeader'
import { isLessHealthyReward } from '@/lib/game'
import type { RewardTag } from '@/types'

const TAG_OPTIONS: { tag: RewardTag; label: string; emoji: string }[] = [
  { tag: 'outing', label: 'Outing', emoji: '🌳' },
  { tag: 'toy', label: 'Toy', emoji: '🧸' },
  { tag: 'experience', label: 'Experience', emoji: '✨' },
  { tag: 'treat', label: 'Treat', emoji: '🎈' },
  { tag: 'screen', label: 'Screen time', emoji: '📺' },
  { tag: 'sweet', label: 'Sweet', emoji: '🍬' },
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
  const [cost, setCost] = useState(50)
  const [tags, setTags] = useState<RewardTag[]>([])

  const showNudge = isLessHealthyReward(tags)

  function toggleTag(t: RewardTag) {
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  }

  function save() {
    if (!title.trim()) return
    addReward({ title: title.trim(), emoji, cost, tags })
    setOpen(false)
    setTitle('')
    setEmoji('🎁')
    setCost(50)
    setTags([])
  }

  return (
    <div className="pb-8">
      <PageHeader
        title="Reward menu"
        subtitle="What points are saved toward"
        right={
          <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
            <Plus size={16} /> New
          </button>
        }
      />

      <div className="space-y-2 px-5">
        {data.rewards.map((r) => {
          const isGoal = activeChild?.goalId === r.id
          return (
            <div key={r.id} className="card flex items-center gap-3 p-4">
              <span className="text-2xl">{r.emoji}</span>
              <div className="flex-1">
                <div className="font-bold">{r.title}</div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {r.cost} pts
                  {isLessHealthyReward(r.tags) && (
                    <span className="chip bg-berry/10 text-berry">
                      <Heart size={11} /> treat
                    </span>
                  )}
                </div>
              </div>
              {activeChild &&
                (isGoal ? (
                  <span className="chip bg-sprout/15 text-sprout">
                    <Target size={14} /> Goal
                  </span>
                ) : (
                  <button
                    onClick={() => setGoal(activeChild.id, r.id)}
                    className="btn-ghost px-3 py-2 text-sm"
                  >
                    Set goal
                  </button>
                ))}
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
              <h2 className="text-lg font-extrabold">New reward</h2>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={22} className="text-muted" />
              </button>
            </div>

            <label className="text-sm font-semibold text-muted">Name</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New cricket bat"
              className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 font-semibold outline-none focus:border-sprout"
            />

            <label className="mt-4 block text-sm font-semibold text-muted">Icon</label>
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

            <label className="mt-4 block text-sm font-semibold text-muted">Cost: {cost} pts</label>
            <input
              type="range"
              min={10}
              max={400}
              step={5}
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="mt-2 w-full accent-sprout"
            />

            <label className="mt-4 block text-sm font-semibold text-muted">Tags</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.tag}
                  onClick={() => toggleTag(t.tag)}
                  className={`chip border ${
                    tags.includes(t.tag)
                      ? 'border-sprout bg-sprout/10 text-sprout'
                      : 'border-line bg-white text-muted'
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {showNudge && (
              <div className="mt-4 flex gap-2 rounded-2xl bg-berry/10 p-3 text-sm text-berry">
                <Heart size={18} className="mt-0.5 shrink-0" />
                <p>
                  Gentle nudge: screen-time and sweets make great <em>occasional</em> treats. Maybe
                  balance with an outing or a book reward too? (You can still add this.)
                </p>
              </div>
            )}

            <button className="btn-primary mt-5 w-full" onClick={save} disabled={!title.trim()}>
              Add reward
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
