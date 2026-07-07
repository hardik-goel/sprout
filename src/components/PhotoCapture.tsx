import { useRef, useState } from 'react'
import { Camera, RefreshCw } from 'lucide-react'

// Photo "upload" — uses a file input with capture hint on mobile (opens camera),
// reads the file to a base64 data URL. NO cloud storage; the data URL is stored
// locally. Swap seam for real storage lives in dataStore.savePhoto().
export function PhotoCapture({
  value,
  onChange,
}: {
  value: string | null
  onChange: (dataUrl: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)

  function pick(file: File) {
    setReading(true)
    const reader = new FileReader()
    reader.onload = () => {
      onChange(reader.result as string)
      setReading(false)
    }
    reader.onerror = () => setReading(false)
    reader.readAsDataURL(file)
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
          if (f) pick(f)
        }}
      />
      {value ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="relative block w-full overflow-hidden rounded-kid border-2 border-white/30"
        >
          <img src={value} alt="Task proof" className="h-56 w-full object-cover" />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white">
            <RefreshCw size={13} /> Retake
          </span>
        </button>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={reading}
          className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-kid border-2 border-dashed border-white/30 bg-white/5 text-white/80"
        >
          <Camera size={40} className="text-glow" />
          <span className="font-bold">{reading ? 'Loading…' : 'Take or pick a photo'}</span>
          <span className="text-xs text-white/50">Show what you did!</span>
        </button>
      )}
    </div>
  )
}
