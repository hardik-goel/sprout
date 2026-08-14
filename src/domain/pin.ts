// Screen locks.
//
// READ THIS BEFORE TRUSTING IT: a 4-digit PIN stored on the device it guards
// is a child lock, not security. It stops a six-year-old wandering into the
// parent screens and awarding themselves 400 points. It does not stop an adult
// with the phone, and it is not a login — there is no account to log in to.
//
// The digits are hashed rather than written in plain text, which only means a
// glance at devtools doesn't hand the PIN over. Four digits is 10,000 guesses;
// anyone who wants it can have it. Phase 2's real answer is a server-side
// parent account, and this interface is what that would slot behind.

export const PIN_LENGTH = 4

export function isValidPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)
}

/** FNV-1a, salted. Obfuscation — see the note above. */
export function hashPin(pin: string): string {
  let h = 0x811c9dc5
  for (const ch of `sprout.pin.v1:${pin}`) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** No PIN set means no lock — an absent lock is open, not shut. */
export function verifyPin(pin: string, hash: string | null | undefined): boolean {
  if (!hash) return true
  return hashPin(pin) === hash
}

export function hasPin(hash: string | null | undefined): boolean {
  return typeof hash === 'string' && hash.length > 0
}
