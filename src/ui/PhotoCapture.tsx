import { useRef, useState } from 'react'
import { Camera, RefreshCw } from 'lucide-react'
import { compressImage } from '@/lib/photoStore'
import { t } from '@/i18n'

// Photo proof capture. A file input with `capture` opens the camera directly on
// mobile web, and the picked image is downscaled + re-encoded before it ever
// reaches storage — a 4MB phone photo lands as ~100KB.
export function PhotoCapture({
  value,
  onChange,
}: {
  value: string | null
  onChange: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)

  async function pick(file: File) {
    setReading(true)
    try {
      onChange(await compressImage(file))
    } finally {
      setReading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void pick(f)
        }}
      />
      {value ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="relative block w-full overflow-hidden rounded-kid border-2 border-white/30"
        >
          <img src={value} alt={t('photo.alt')} className="h-56 w-full object-cover" />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">
            <RefreshCw size={13} /> {t('photo.retake')}
          </span>
        </button>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-kid border-2 border-dashed border-white/30 bg-white/5 text-white/80"
        >
          <Camera size={40} className="text-glow" />
          <span className="font-bold">{reading ? t('photo.loading') : t('photo.take')}</span>
          <span className="text-xs text-white/50">{t('photo.hint')}</span>
        </button>
      )}
    </div>
  )
}
