// Records a short cheer with MediaRecorder and hands back a data URL.
//
// Everything here is defensive on purpose: microphone permission can be denied,
// MediaRecorder does not exist on every browser we care about, and a stream
// that is not stopped leaves the recording indicator on — which, in an app used
// around children, is not a small bug.

import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { blobToDataUrl, canRecordAudio } from '@/lib/audioStore'
import { MAX_CHEER_MS } from '@/domain'
import { t } from '@/i18n'

type State = 'idle' | 'recording' | 'saving'

export function VoiceRecorder({
  onRecorded,
  disabled = false,
}: {
  onRecorded: (dataUrl: string, durationMs: number) => void
  disabled?: boolean
}) {
  const [state, setState] = useState<State>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startedAtRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Release the mic and every timer. Safe to call twice. */
  function teardown() {
    if (tickRef.current) clearInterval(tickRef.current)
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    tickRef.current = null
    stopTimerRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  // Leaving the screen mid-recording must not leave the microphone open.
  useEffect(() => teardown, [])

  if (!canRecordAudio()) {
    return <p className="text-sm text-muted">{t('cheers.unsupported')}</p>
  }

  async function start() {
    setError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError(t('cheers.micDenied'))
      return
    }

    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream)
    streamRef.current = stream
    recorderRef.current = recorder
    startedAtRef.current = Date.now()

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = async () => {
      const durationMs = Date.now() - startedAtRef.current
      teardown()
      setState('saving')
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
        onRecorded(await blobToDataUrl(blob), durationMs)
      } catch {
        setError(t('cheers.saveFailed'))
      } finally {
        setState('idle')
        setElapsed(0)
      }
    }

    recorder.start()
    setState('recording')
    setElapsed(0)
    tickRef.current = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 100)
    // Hard stop at the cap, so a forgotten recording can't fill localStorage.
    stopTimerRef.current = setTimeout(stop, MAX_CHEER_MS)
  }

  function stop() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const seconds = (elapsed / 1000).toFixed(1)
  const pct = Math.min(100, (elapsed / MAX_CHEER_MS) * 100)

  return (
    <div>
      {state === 'recording' ? (
        <button className="btn-primary w-full bg-berry" onClick={stop}>
          <Square size={16} fill="currentColor" /> {t('cheers.stop', { s: seconds })}
        </button>
      ) : (
        <button className="btn-primary w-full" onClick={start} disabled={disabled || state === 'saving'}>
          <Mic size={18} /> {state === 'saving' ? t('cheers.saving') : t('cheers.record')}
        </button>
      )}

      {state === 'recording' && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-berry transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      <p className="mt-2 text-xs text-muted">
        {error ?? t('cheers.hint', { s: MAX_CHEER_MS / 1000 })}
      </p>
    </div>
  )
}
