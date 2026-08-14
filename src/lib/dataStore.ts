// ============================================================================
// dataStore — THE SWAP SEAM.
//
// Everything in the app reads/writes data through this single module. Today it
// is backed by localStorage with seed data. To go from prototype -> real you
// implement this SAME interface against Supabase and nothing else changes.
//
// Writes are also mirrored into an outbox of ledger events. In Phase 1 nothing
// drains it, but it means going offline-first in Phase 2 is "drain the outbox
// and merge by event id" rather than a rewrite. See src/domain/ledger.ts.
// ============================================================================

import type { AppData, LedgerEvent } from '@/domain/types'
import { buildSeed, SEED_VERSION } from './seed'
import { photoStore } from './photoStore'
import { audioStore } from './audioStore'

const STORAGE_KEY = 'sprout.appData.v2'
const OUTBOX_KEY = 'sprout.outbox.v1'

export interface DataStore {
  load(): AppData
  save(data: AppData): void
  reset(): AppData
  /** Events not yet pushed to a server. Phase 2 drains this on reconnect. */
  queue(events: LedgerEvent[]): void
  outbox(): LedgerEvent[]
  clearOutbox(): void
  /**
   * Drop queued events that must never be sent — their subject was deleted
   * outright (a removed child), so pushing them in Phase 2 would resurrect a
   * record the parent asked us to forget.
   */
  unqueue(predicate: (e: LedgerEvent) => boolean): void
}

class LocalDataStore implements DataStore {
  load(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return this.reset()
      const parsed = JSON.parse(raw) as AppData
      // A prototype-grade migration: the shape changed, so start from a fresh
      // seed rather than pretending we can upgrade old demo data.
      if (!parsed.version || parsed.version < SEED_VERSION || !Array.isArray(parsed.ledger)) {
        return this.reset()
      }
      return parsed
    } catch {
      return this.reset()
    }
  }

  save(data: AppData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e) {
      // localStorage can throw (quota / private mode). Fail soft — the
      // in-memory store is still the source of truth for this session.
      console.warn('[dataStore] save failed, continuing in-memory only', e)
    }
  }

  reset(): AppData {
    // Drop the previous run's media first: the seed is about to write a fresh
    // set under new ids, and nothing would ever reference the old ones again.
    photoStore.clear()
    audioStore.clear()
    const seed = buildSeed()
    this.save(seed)
    this.clearOutbox()
    return seed
  }

  queue(events: LedgerEvent[]): void {
    if (events.length === 0) return
    try {
      const existing = this.outbox()
      const seen = new Set(existing.map((e) => e.id))
      const next = [...existing, ...events.filter((e) => !seen.has(e.id))]
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(next))
    } catch {
      /* outbox is best-effort in Phase 1 */
    }
  }

  outbox(): LedgerEvent[] {
    try {
      const raw = localStorage.getItem(OUTBOX_KEY)
      return raw ? (JSON.parse(raw) as LedgerEvent[]) : []
    } catch {
      return []
    }
  }

  clearOutbox(): void {
    try {
      localStorage.removeItem(OUTBOX_KEY)
    } catch {
      /* ignore */
    }
  }

  unqueue(predicate: (e: LedgerEvent) => boolean): void {
    try {
      const kept = this.outbox().filter((e) => !predicate(e))
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(kept))
    } catch {
      /* outbox is best-effort in Phase 1 */
    }
  }
}

export const dataStore: DataStore = new LocalDataStore()
