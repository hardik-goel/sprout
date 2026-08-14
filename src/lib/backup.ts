// ============================================================================
// backup — the answer to the one real risk of having no account.
//
// There is no sign-in and no server, which is the point: nothing to remember,
// nothing to leak. The cost is that clearing site data is a factory reset and
// a new phone starts empty. A backup file closes that gap without inventing an
// account: the family's whole history, photos and cheers included, in one file
// they own.
//
// Phase 2 (a real backend) does not delete this — "export my data" is the
// thing you still want on the day you decide to leave.
// ============================================================================

import type { AppData } from '@/domain/types'
import { photoStore } from './photoStore'
import { audioStore } from './audioStore'
import { SEED_VERSION } from './seed'

export const BACKUP_KIND = 'sprout.backup'
export const BACKUP_VERSION = 1

export interface BackupFile {
  kind: typeof BACKUP_KIND
  /** Format of the wrapper. Bumped only if this envelope changes. */
  backupVersion: number
  /** The app data version the file was written from. */
  appVersion: number
  exportedAt: string // ISO
  data: AppData
  /** photoId -> dataUrl, cheerAudioId -> dataUrl. Kept out of `data` for the
   *  same reason they are out of localStorage's main blob: size. */
  photos: Record<string, string>
  cheers: Record<string, string>
}

export function buildBackup(data: AppData, now: Date = new Date()): BackupFile {
  return {
    kind: BACKUP_KIND,
    backupVersion: BACKUP_VERSION,
    appVersion: data.version ?? SEED_VERSION,
    exportedAt: now.toISOString(),
    data,
    photos: photoStore.entries(),
    cheers: audioStore.entries(),
  }
}

export type ParseResult =
  | { ok: true; backup: BackupFile }
  | { ok: false; reason: 'notJson' | 'notSprout' | 'tooNew' | 'incomplete' }

/**
 * Validate a file the user picked. Deliberately strict: restoring replaces
 * everything, so a half-recognised file must be refused rather than half-read.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'notJson' }
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, reason: 'notSprout' }
  const file = raw as Partial<BackupFile>
  if (file.kind !== BACKUP_KIND) return { ok: false, reason: 'notSprout' }
  if (typeof file.backupVersion !== 'number' || file.backupVersion > BACKUP_VERSION) {
    // Written by a newer build than this one. Refuse rather than guess — a
    // silent partial restore of a family's history is worse than a clear no.
    return { ok: false, reason: 'tooNew' }
  }
  const data = file.data
  if (
    !data ||
    !Array.isArray(data.ledger) ||
    !Array.isArray(data.children) ||
    !Array.isArray(data.tasks) ||
    !Array.isArray(data.rewards) ||
    !Array.isArray(data.templates)
  ) {
    return { ok: false, reason: 'incomplete' }
  }
  return {
    ok: true,
    backup: {
      kind: BACKUP_KIND,
      backupVersion: file.backupVersion,
      appVersion: typeof file.appVersion === 'number' ? file.appVersion : SEED_VERSION,
      exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : new Date().toISOString(),
      data,
      photos: file.photos ?? {},
      cheers: file.cheers ?? {},
    },
  }
}

/**
 * The AppData a restore should install. Media is written as a side effect
 * (they are separate seams); the caller persists the returned data.
 */
export function applyBackupMedia(backup: BackupFile): AppData {
  photoStore.restore(backup.photos)
  audioStore.restore(backup.cheers)
  // `version` is what dataStore checks on load. A backup from an older seed
  // would be re-seeded away on the next reload, so it is stamped forward: the
  // family's own history is worth keeping even when our demo content moved on.
  return { ...backup.data, version: Math.max(backup.data.version ?? 0, SEED_VERSION) }
}

/** A filename a parent can recognise a year later. */
export function backupFilename(data: AppData, now: Date = new Date()): string {
  const who = (data.parentName || 'family').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `sprout-backup-${who}-${now.toISOString().slice(0, 10)}.json`
}

/** Roughly how much of this browser's storage the family is using, in bytes. */
export function storageBytes(): number {
  if (typeof localStorage === 'undefined') return 0
  let total = 0
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('sprout.')) continue
      total += k.length + (localStorage.getItem(k)?.length ?? 0)
    }
  } catch {
    return 0
  }
  // localStorage stores UTF-16; two bytes per code unit is the honest estimate.
  return total * 2
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
