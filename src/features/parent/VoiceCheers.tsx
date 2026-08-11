// A3 — Voice cheers.
//
// Free, deliberately, for the same reason the Growth Album is: this is the part
// a parent shows someone else. Dadi records three seconds of "shabaash beta"
// and it plays when the child's task is approved. No animation we could draw
// competes with a grandmother's actual voice, and no competitor can copy it.

import { useRef, useState } from 'react'
import { Mic, Play, Trash2, Users } from 'lucide-react'
import { useStore } from '@/store'
import { PageHeader } from '@/ui/PageHeader'
import { VoiceRecorder } from '@/ui/VoiceRecorder'
import { audioStore } from '@/lib/audioStore'
import { canAddCheer, MAX_CHEERS } from '@/domain'
import { formatShortDate } from '@/i18n/format'
import { t } from '@/i18n'

export function VoiceCheers() {
  const data = useStore((s) => s.data)
  const activeChild = useStore((s) => s.activeChild())
  const addCheer = useStore((s) => s.addCheer)
  const removeCheer = useStore((s) => s.removeCheer)

  const [memberId, setMemberId] = useState(data.members[0]?.id ?? '')
  // null = everyone. A cheer from Dadi usually suits any of her grandchildren.
  const [forChildId, setForChildId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const full = !canAddCheer(data.cheers)

  async function handleRecorded(dataUrl: string, durationMs: number) {
    const ok = await addCheer(memberId, forChildId, dataUrl, durationMs)
    flash(ok ? t('cheers.added') : t('cheers.tooBig'))
  }

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }

  function play(audioId: string) {
    const src = audioStore.url(audioId)
    if (!src) return flash(t('cheers.missing'))
    // One element, reused: overlapping playback of two cheers is noise.
    audioRef.current?.pause()
    const el = new Audio(src)
    audioRef.current = el
    void el.play().catch(() => flash(t('cheers.playFailed')))
  }

  return (
    <div className="pb-8">
      <PageHeader title={t('cheers.title')} subtitle={t('cheers.subtitle')} back="/parent/more" />

      <div className="space-y-5 px-5">
        <div className="card space-y-4 p-5">
          <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-muted">
              {t('cheers.whoseVoice')}
            </label>
            <div className="flex flex-wrap gap-2">
              {data.members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMemberId(m.id)}
                  className={`chip border ${
                    memberId === m.id
                      ? 'border-sprout bg-sprout/10 text-sprout'
                      : 'border-line bg-white'
                  }`}
                >
                  {m.avatar} {m.name}
                </button>
              ))}
            </div>
          </div>

          {data.children.length > 1 && (
            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-muted">
                {t('cheers.forWhom')}
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setForChildId(null)}
                  className={`chip border ${
                    forChildId === null
                      ? 'border-sprout bg-sprout/10 text-sprout'
                      : 'border-line bg-white'
                  }`}
                >
                  <Users size={13} /> {t('cheers.everyone')}
                </button>
                {data.children.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setForChildId(c.id)}
                    className={`chip border ${
                      forChildId === c.id
                        ? 'border-sprout bg-sprout/10 text-sprout'
                        : 'border-line bg-white'
                    }`}
                  >
                    {c.avatar} {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <VoiceRecorder onRecorded={handleRecorded} disabled={full} />
          {full && <p className="text-xs text-berry">{t('cheers.full', { n: MAX_CHEERS })}</p>}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
            {t('cheers.recorded', { n: data.cheers.length })}
          </h2>

          {data.cheers.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-8 text-center text-muted">
              <Mic size={28} />
              <p className="text-sm">{t('cheers.empty')}</p>
            </div>
          ) : (
            <div className="card divide-y divide-line">
              {data.cheers.map((cheer) => {
                const who = data.members.find((m) => m.id === cheer.memberId)
                const forWho = data.children.find((c) => c.id === cheer.childId)
                return (
                  <div key={cheer.id} className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => play(cheer.audioId)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sprout/10 text-sprout"
                      aria-label={t('cheers.play')}
                    >
                      <Play size={17} fill="currentColor" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">
                        {who?.avatar} {who?.name ?? t('cheers.someone')}
                      </div>
                      <div className="text-xs text-muted">
                        {forWho ? t('cheers.forChild', { name: forWho.name }) : t('cheers.everyone')}{' '}
                        · {(cheer.durationMs / 1000).toFixed(1)}s ·{' '}
                        {formatShortDate(cheer.createdAt.slice(0, 10))}
                      </div>
                    </div>
                    <button
                      onClick={() => removeCheer(cheer.id)}
                      className="shrink-0 text-muted"
                      aria-label={t('cheers.delete')}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-muted">
          {activeChild
            ? t('cheers.note', { name: activeChild.name })
            : t('common.noChildSelected')}
        </p>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-28 z-50 mx-auto w-[90%] max-w-[400px] rounded-2xl bg-ink px-4 py-3 text-center font-bold text-white">
          {toast}
        </div>
      )}
    </div>
  )
}
