// ============================================================================
// dataStore — THE SWAP SEAM.
//
// Everything in the app reads/writes data through this single module. Today it
// is backed by localStorage with seed data. To go from prototype -> real, you
// implement this SAME interface against Supabase (or any backend) and the rest
// of the app should not need to change.
//
// Photos are stored as base64 strings inline (NO cloud storage). The seam for
// real storage is `savePhoto()` — swap it to upload to Supabase Storage and
// return the public URL instead of the data URL.
// ============================================================================

import type { AppData } from '@/types'
import { buildSeed } from './seed'

const STORAGE_KEY = 'sprout.appData.v1'

export interface DataStore {
  load(): AppData
  save(data: AppData): void
  reset(): AppData
  // Photo seam — currently returns the data URL unchanged (local only).
  // TODO(real): upload `dataUrl` to Supabase Storage, return the public URL.
  savePhoto(dataUrl: string): Promise<string>
}

class LocalDataStore implements DataStore {
  load(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const seed = buildSeed()
        this.save(seed)
        return seed
      }
      return JSON.parse(raw) as AppData
    } catch {
      const seed = buildSeed()
      this.save(seed)
      return seed
    }
  }

  save(data: AppData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      // localStorage can throw (quota / private mode). Fail soft — the in-memory
      // store (zustand) is still the source of truth for the session.
      console.warn('[dataStore] save failed, continuing in-memory only', e)
    }
  }

  reset(): AppData {
    const seed = buildSeed()
    this.save(seed)
    return seed
  }

  async savePhoto(dataUrl: string): Promise<string> {
    // Local stub: keep the base64 data URL as-is.
    // TODO(real): replace with Supabase Storage upload returning a public URL.
    return dataUrl
  }
}

export const dataStore: DataStore = new LocalDataStore()
