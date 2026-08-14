// A backup is the only copy a family has — there is no server behind it. So
// the two things that matter are that a round trip loses nothing, and that a
// file we don't fully recognise is refused rather than half-restored over a
// year of history.

import { describe, expect, it } from 'vitest'
import { buildSeed, SEED_VERSION } from '@/lib/seed'
import {
  applyBackupMedia,
  backupFilename,
  BACKUP_KIND,
  buildBackup,
  formatBytes,
  parseBackup,
} from '../backup'

const roundTrip = (data = buildSeed()) =>
  parseBackup(JSON.stringify(buildBackup(data, new Date('2026-03-08T10:00:00Z'))))

describe('backup', () => {
  it('round-trips the whole family without losing anything', () => {
    const data = buildSeed()
    const result = roundTrip(data)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.backup.data.children.map((c) => c.name)).toEqual(['Vir', 'Ira'])
    expect(result.backup.data.ledger.length).toBe(data.ledger.length)
    expect(result.backup.data.tasks.length).toBe(data.tasks.length)
    expect(result.backup.kind).toBe(BACKUP_KIND)
    expect(result.backup.exportedAt).toBe('2026-03-08T10:00:00.000Z')
  })

  it('refuses anything that is not one of ours', () => {
    expect(parseBackup('not json at all')).toMatchObject({ ok: false, reason: 'notJson' })
    expect(parseBackup('{"hello":"world"}')).toMatchObject({ ok: false, reason: 'notSprout' })
    expect(parseBackup('null')).toMatchObject({ ok: false, reason: 'notSprout' })
  })

  it('refuses a backup written by a newer Sprout rather than guessing', () => {
    const file = { ...buildBackup(buildSeed()), backupVersion: 99 }
    expect(parseBackup(JSON.stringify(file))).toMatchObject({ ok: false, reason: 'tooNew' })
  })

  it('refuses a file that is missing the parts that matter', () => {
    const file = buildBackup(buildSeed())
    const gutted = { ...file, data: { ...file.data, ledger: undefined } }
    expect(parseBackup(JSON.stringify(gutted))).toMatchObject({ ok: false, reason: 'incomplete' })
  })

  it('stamps an older backup forward so a restore is not re-seeded away', () => {
    const file = buildBackup(buildSeed())
    const old = { ...file, data: { ...file.data, version: 1 } }
    expect(applyBackupMedia(old).version).toBe(SEED_VERSION)
  })

  it('names the file after the family and the day', () => {
    const name = backupFilename(buildSeed(), new Date('2026-03-08T10:00:00Z'))
    expect(name).toBe('sprout-backup-aanya-2026-03-08.json')
  })

  it('formats sizes a parent can read', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2 KB')
    expect(formatBytes(3_500_000)).toBe('3.3 MB')
  })
})
