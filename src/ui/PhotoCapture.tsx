// Photo proof, with a live camera preview.
//
// The file input with `capture` still exists and is still the fallback, because
// it is genuinely the better path in several cases: a desktop with no camera, a
// permission the parent has already denied, a photo taken earlier in the day.
// But shooting blind — tap, hand the phone over, hope — was the weak part of
// the loop, and it is a four-year-old holding the thing.
//
// So: preview if we can, file input if we can't, and the file input is never
// hidden behind an error state.

import { useEffect, useRef, useState } from 'react'
import { Camera, Images, RefreshCw, SwitchCamera, X } from 'lucide-react'
import { compressImage } from '@/lib/photoStore'
import { t } from '@/i18n'

type Facing = 'environment' | 'user'

function canUseCamera(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export function PhotoCapture({
  value,
  onChange,
}: {
  value: string | null
  onChange: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [live, setLive] = useState(false)
  const [facing, setFacing] = useState<Facing>('environment')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Stop the camera. Idempotent, and the light must go off. */
  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  // Never leave the camera running because a screen unmounted.
  useEffect(() => stopStream, [])

  async function startCamera(next: Facing = facing) {
    setError(null)
    stopStream()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next },
        audio: false,
      })
      streamRef.current = stream
      setFacing(next)
      setLive(true)
      // The element only exists once `live` is true, so attach on the next
      // frame rather than guessing at render order.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
      })
    } catch {
      // Denied, no camera, or an insecure origin. Say so, and leave the file
      // input right there — this is a fallback, not a dead end.
      stopStream()
      setLive(false)
      setError(t('photo.cameraDenied'))
    }
  }

  async function shoot() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    setBusy(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      // Go through the same compression path as a picked file, so a captured
      // frame and an uploaded photo cost the same in storage.
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92),
      )
      onChange(blob ? await compressImage(blob) : canvas.toDataURL('image/jpeg', 0.72))
      closeCamera()
    } catch {
      setError(t('photo.captureFailed'))
    } finally {
      setBusy(false)
    }
  }

  function closeCamera() {
    stopStream()
    setLive(false)
  }

  async function pick(file: File) {
    setBusy(true)
    setError(null)
    try {
      onChange(await compressImage(file))
    } finally {
      setBusy(false)
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      data-testid="photo-file-input"
      onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) void pick(f)
      }}
    />
  )

  // --- Live preview -------------------------------------------------------
  if (live) {
    return (
      <div>
        {fileInput}
        <div className="relative overflow-hidden rounded-kid border-2 border-white/30 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-64 w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`}
          />
          <button
            onClick={closeCamera}
            aria-label={t('common.close')}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <X size={18} />
          </button>
          <button
            onClick={() => startCamera(facing === 'environment' ? 'user' : 'environment')}
            aria-label={t('photo.flip')}
            className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white"
          >
            <SwitchCamera size={18} />
          </button>
        </div>
        <button
          onClick={shoot}
          disabled={busy}
          className="btn mt-3 w-full bg-glow py-4 text-lg text-kidbg1 shadow-glow disabled:opacity-50"
        >
          <Camera size={20} /> {busy ? t('photo.loading') : t('photo.snap')}
        </button>
      </div>
    )
  }

  // --- Taken -------------------------------------------------------------
  if (value) {
    return (
      <div>
        {fileInput}
        <div className="relative block w-full overflow-hidden rounded-kid border-2 border-white/30">
          <img src={value} alt={t('photo.alt')} className="h-56 w-full object-cover" />
        </div>
        <div className="mt-2 flex gap-2">
          {canUseCamera() && (
            <button onClick={() => startCamera()} className="btn-ghost flex-1 text-sm">
              <RefreshCw size={15} /> {t('photo.retake')}
            </button>
          )}
          <button onClick={() => inputRef.current?.click()} className="btn-ghost flex-1 text-sm">
            <Images size={15} /> {t('photo.choose')}
          </button>
        </div>
      </div>
    )
  }

  // --- Nothing yet --------------------------------------------------------
  return (
    <div>
      {fileInput}
      <button
        onClick={() => (canUseCamera() ? startCamera() : inputRef.current?.click())}
        disabled={busy}
        className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-kid border-2 border-dashed border-white/30 bg-white/5 text-white/80"
      >
        <Camera size={40} className="text-glow" />
        <span className="font-bold">{busy ? t('photo.loading') : t('photo.take')}</span>
        <span className="text-xs text-white/50">{t('photo.hint')}</span>
      </button>

      {/* Always reachable, never behind an error. */}
      {canUseCamera() && (
        <button
          onClick={() => inputRef.current?.click()}
          className="btn-ghost mt-2 w-full text-sm"
        >
          <Images size={15} /> {t('photo.choose')}
        </button>
      )}

      {error && <p className="mt-2 text-center text-xs text-gold">{error}</p>}
    </div>
  )
}
