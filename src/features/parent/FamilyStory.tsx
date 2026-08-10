// A2 — the Sunday Family Story.
//
// Free tier gets the core story; Plus adds the goal countdown and habit
// spotlight. Either way it renders to a WhatsApp-sized image, because in India
// that share to the family group is both the emotional payoff and our cheapest
// distribution.

import { useMemo, useState } from 'react'
import { Copy, Download, Share2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { PlusBadge } from '@/ui/PlusBadge'
import { buildFamilyStory, storyToText } from '@/domain'
import { downloadDataUrl, renderStoryCard } from '@/lib/storyCard'
import { t } from '@/i18n'

export function FamilyStory() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const can = useStore((s) => s.can)
  const [toast, setToast] = useState<string | null>(null)

  const story = useMemo(
    () =>
      activeChild
        ? buildFamilyStory(data, activeChild, { rich: can.can('richStory') })
        : null,
    [data, activeChild, can],
  )

  if (!activeChild || !story)
    return <p className="px-5 pt-20 text-center text-muted">{t('common.noChildSelected')}</p>

  function flash(key: string) {
    setToast(t(key))
    setTimeout(() => setToast(null), 2200)
  }

  function saveImage() {
    const dataUrl = renderStoryCard(story!)
    if (!dataUrl) return flash('story.imageFailed')
    downloadDataUrl(dataUrl, `sprout-${activeChild!.name.toLowerCase()}-week.png`)
    flash('story.saved')
  }

  async function share() {
    const text = storyToText(story!)
    if (navigator.share) {
      try {
        await navigator.share({ title: story!.title, text })
        return
      } catch {
        // user dismissed the sheet — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      flash('story.copied')
    } catch {
      flash('story.copyFailed')
    }
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
              <h2 className="mt-2 text-2xl font-extrabold">{story.title}</h2>
              <p className="text-sm text-white/60">{story.subtitle}</p>
            </div>
            <span className="text-5xl">{story.emoji}</span>
          </div>

          <div className="mt-5 space-y-2 text-[15px] leading-snug">
            {story.lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {story.stats.slice(0, 3).map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 p-3 text-center">
                <div className="text-lg">{s.emoji}</div>
                <div className="text-xl font-extrabold text-glow">{s.value}</div>
                <div className="text-[10px] text-white/60">{s.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center font-extrabold text-gold">{story.closing}</p>
        </div>

        <div className="mt-5 space-y-2">
          <button className="btn-primary w-full" onClick={share}>
            <Share2 size={18} /> {t('story.share')}
          </button>
          <button className="btn-ghost w-full" onClick={saveImage}>
            <Download size={18} /> {t('story.saveImage')}
          </button>
          <button
            className="btn-ghost w-full"
            onClick={async () => {
              await navigator.clipboard?.writeText(storyToText(story))
              flash('story.copied')
            }}
          >
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
