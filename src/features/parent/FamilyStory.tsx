// A2 — the Sunday Family Story.
//
// Free tier gets the core story; Plus adds the goal countdown and habit
// spotlight. Either way it renders to a WhatsApp-sized image, because in India
// that share to the family group is both the emotional payoff and our cheapest
// distribution. The domain hands us keys; this screen speaks the language.

import { useMemo, useState } from 'react'
import { Copy, Download, Share2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { buildFamilyStory, storyToText } from '@/domain'
import { downloadDataUrl, renderStoryCard } from '@/lib/storyCard'
import { formatRange } from '@/i18n/format'
import { t } from '@/i18n'

export function FamilyStory() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const can = useStore((s) => s.can)
  const [toast, setToast] = useState<string | null>(null)

  const story = useMemo(
    () => (activeChild ? buildFamilyStory(data, activeChild, { rich: can.can('richStory') }) : null),
    [data, activeChild, can],
  )

  if (!activeChild || !story)
    return <p className="px-5 pt-20 text-center text-muted">{t('common.noChildSelected')}</p>

  const title = t(story.title.key, story.title.vars)
  const range = formatRange(story.from, story.to)
  const lines = story.lines.map((l) => t(l.key, l.vars))
  const closing = t(story.closing.key, story.closing.vars)
  const stats = story.stats.map((s) => ({ ...s, label: t(s.labelKey) }))

  function flash(key: string) {
    setToast(t(key))
    setTimeout(() => setToast(null), 2200)
  }

  function saveImage() {
    const dataUrl = renderStoryCard({
      title,
      range,
      lines,
      stats,
      closing,
      emoji: story!.emoji,
      footer: t('gift.pointsOnlyNote'),
    })
    if (!dataUrl) return flash('story.imageFailed')
    downloadDataUrl(dataUrl, `sprout-${activeChild!.name.toLowerCase()}-week.png`)
    flash('story.saved')
  }

  async function copyText() {
    const text = storyToText(story!, t, range)
    try {
      await navigator.clipboard.writeText(text)
      flash('story.copied')
    } catch {
      flash('story.copyFailed')
    }
  }

  async function share() {
    const text = storyToText(story!, t, range)
    if (navigator.share) {
      try {
        await navigator.share({ title, text })
        return
      } catch {
        // user dismissed the sheet — fall through to copy
      }
    }
    await copyText()
  }

  return (
    <div className="pb-10">
      <PageHeader
        title={t('story.title')}
        subtitle={t('story.subtitle')}
        right={story.rich ? <PlusBadge /> : undefined}
      />

      <div className="px-5">
        {/* The card, rendered in DOM — the PNG export mirrors this layout. */}
        <div
          className="rounded-card p-6 text-white shadow-card"
          style={{ background: 'linear-gradient(150deg, #114438, #0C342B)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-extrabold tracking-widest text-glow">🌱 SPROUT</div>
              <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>
              <p className="text-sm text-white/60">{range}</p>
            </div>
            <span className="text-5xl">{story.emoji}</span>
          </div>

          <div className="mt-5 space-y-2 text-[15px] leading-snug">
            {lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {stats.slice(0, 3).map((s) => (
              <div key={s.labelKey} className="rounded-2xl bg-white/10 p-3 text-center">
                <div className="text-lg">{s.emoji}</div>
                <div className="text-xl font-extrabold text-glow">{s.value}</div>
                <div className="text-[10px] text-white/60">{s.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center font-extrabold text-gold">{closing}</p>
        </div>

        <div className="mt-5 space-y-2">
          <button className="btn-primary w-full" onClick={share}>
            <Share2 size={18} /> {t('story.share')}
          </button>
          <button className="btn-ghost w-full" onClick={saveImage}>
            <Download size={18} /> {t('story.saveImage')}
          </button>
          <button className="btn-ghost w-full" onClick={copyText}>
            <Copy size={18} /> {t('story.copyText')}
          </button>
        </div>

        {!story.rich && (
          <Link to="/parent/upgrade" className="btn-gold mt-4 w-full">
            <Sparkles size={18} /> {t('story.upsell')}
          </Link>
        )}

        {toast && (
          <div className="mt-4 rounded-2xl bg-sprout/10 p-3 text-center text-sm font-semibold text-sprout">
            {toast}
          </div>
        )}
      </div>
    </div>
  )
}
