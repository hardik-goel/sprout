// Client-generated ids. Every ledger event carries one, which is what makes
// replaying a queued/offline event idempotent instead of double-counting.

export function uuid(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16))
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const hex = Array.from(b, (n) => n.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  // Last resort (old browsers / test envs without WebCrypto).
  let out = ''
  for (let i = 0; i < 32; i++) out += Math.floor(Math.random() * 16).toString(16)
  return out
}

/** Prefixed id for non-ledger entities — readable in devtools/localStorage. */
export function newId(prefix: string): string {
  return `${prefix}_${uuid().slice(0, 8)}`
}
