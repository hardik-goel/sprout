// ============================================================================
// audioStore — the voice-cheer seam (A3).
//
// Deliberately a sibling of photoStore rather than a generalised "blobStore":
// the two have different lifetimes and different Phase 2 destinations, and one
// abstraction over both would have to be un-picked the moment cheers get their
// own bucket and retention rules.
//
// Phase 1: a short recording, base64 in localStorage under its own key.
// Phase 2: swap `put()` for a Supabase Storage upload and `url()` for the
// public URL. Nothing above this file changes — a cheer record only ever holds
// an `audioId`.
// ============================================================================

const PREFIX = 'sprout.cheer.'

export interface AudioStore {
  put(id: string, dataUrl: string): Promise<string>
  url(id: string | null): string | null
  remove(id: string): void
  clear(): void
}

/**
 * Refuse anything bigger than this. At the bitrate a phone mic produces, six
 * seconds of Opus is comfortably under 100KB — a recording that arrives much
 * larger means something is wrong, and localStorage is not the place to find
 * out.
 */
export const MAX_CHEER_BYTES = 400_000

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

/** True when this browser can actually record. Checked before offering to. */
export function canRecordAudio(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'
  )
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the recording'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

class LocalAudioStore implements AudioStore {
  async put(id: string, dataUrl: string): Promise<string> {
    if (!hasStorage()) return id
    try {
      localStorage.setItem(PREFIX + id, dataUrl)
    } catch (e) {
      // Same bargain as photos: a lost cheer is degraded, a crash is broken.
      console.warn('[audioStore] could not persist cheer', e)
    }
    return id
  }

  url(id: string | null): string | null {
    if (!id || !hasStorage()) return null
    try {
      return localStorage.getItem(PREFIX + id)
    } catch {
      return null
    }
  }

  remove(id: string): void {
    if (!hasStorage()) return
    try {
      localStorage.removeItem(PREFIX + id)
    } catch {
      /* ignore */
    }
  }

  clear(): void {
    if (!hasStorage()) return
    try {
      for (const k of Object.keys(localStorage).filter((x) => x.startsWith(PREFIX))) {
        localStorage.removeItem(k)
      }
    } catch {
      /* ignore */
    }
  }
}

export const audioStore: AudioStore = new LocalAudioStore()
