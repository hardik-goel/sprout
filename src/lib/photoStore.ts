// ============================================================================
// photoStore — the photo seam (kept separate from dataStore on purpose).
//
// Phase 1: photos are compressed client-side and kept in localStorage under
// their own keys, so the main app blob stays small and fast to parse.
// Phase 2: swap `put()` for a Supabase Storage upload and `url()` for the
// public URL. Tasks store a photoId, never the bytes — so nothing else changes.
// ============================================================================

const PREFIX = 'sprout.photo.'

export interface PhotoStore {
  put(id: string, dataUrl: string): Promise<string>
  url(id: string | null): string | null
  remove(id: string): void
  /** Drop every stored photo. Called when the app data is reset. */
  clear(): void
}

/** Longest edge in px after compression — plenty for a proof-of-chore photo. */
export const MAX_EDGE = 720
export const JPEG_QUALITY = 0.72

/**
 * Downscale + re-encode to JPEG in the browser. A 4MB phone photo becomes
 * ~60-120KB, which is what makes localStorage (and later, India-speed uploads)
 * viable at all.
 */
export function compressImage(
  file: File | Blob,
  maxEdge = MAX_EDGE,
  quality = JPEG_QUALITY,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the photo'))
    reader.onload = () => {
      const src = String(reader.result)
      const img = new Image()
      img.onerror = () => resolve(src) // non-image or decode failure: keep as-is
      img.onload = () => {
        try {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scale))
          const h = Math.max(1, Math.round(img.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(src)
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch {
          resolve(src)
        }
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  })
}

/** False in non-browser contexts (unit tests, SSR) — then photos are simply skipped. */
function hasStorage(): boolean {
  return typeof localStorage !== 'undefined'
}

class LocalPhotoStore implements PhotoStore {
  async put(id: string, dataUrl: string): Promise<string> {
    if (!hasStorage()) return id
    try {
      localStorage.setItem(PREFIX + id, dataUrl)
    } catch (e) {
      // Quota exceeded / private mode. The photo is lost but the approval flow
      // must not break — a missing photo is degraded, a crash is broken.
      console.warn('[photoStore] could not persist photo', e)
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
      // Every reset re-seeds a fresh set of photos under new ids. Without this
      // the old ones stay behind forever, and a handful of resets is enough to
      // walk into the localStorage quota.
      const stale = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX))
      for (const k of stale) localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

export const photoStore: PhotoStore = new LocalPhotoStore()
