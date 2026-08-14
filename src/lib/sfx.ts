// ============================================================================
// sfx — the two sounds this app makes.
//
// Synthesised with WebAudio rather than shipped as files, for three reasons:
// nothing to download on an India-speed connection, nothing to cache-bust, and
// no licence to track. A whoosh is filtered noise and a chime is two sine
// waves; both are a few lines here and a few hundred KB as MP3s.
//
// Every call is best-effort and silent on failure. Audio is decoration: a
// browser that blocks it (no gesture yet, autoplay policy, an old WebView)
// must lose the sound and nothing else.
// ============================================================================

let ctx: AudioContext | null = null
let muted = false

/** Sound follows the app's own setting; see `soundOn` in the account screen. */
export function setMuted(value: boolean) {
  muted = value
}

function audio(): AudioContext | null {
  if (muted) return null
  try {
    type WithWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    const Ctor = globalThis.AudioContext ?? (globalThis as WithWebkit).webkitAudioContext
    if (!Ctor) return null
    ctx ??= new Ctor()
    // Safari suspends the context until a gesture; every one of our sounds is
    // fired by a tap, so resuming here is always inside one.
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/**
 * The "done!" whoosh — a band of noise sweeping upward, like something being
 * swept off the list. Short on purpose: 300ms, so a child doing five tasks in a
 * row doesn't get five overlapping noises.
 */
export function playWhoosh() {
  const ac = audio()
  if (!ac) return
  try {
    const duration = 0.32
    const frames = Math.floor(ac.sampleRate * duration)
    const buffer = ac.createBuffer(1, frames, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) {
      // Noise that fades as it goes, so the tail doesn't hiss.
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
    }

    const source = ac.createBufferSource()
    source.buffer = buffer

    const filter = ac.createBiquadFilter()
    filter.type = 'bandpass'
    filter.Q.value = 1.2
    filter.frequency.setValueAtTime(420, ac.currentTime)
    filter.frequency.exponentialRampToValueAtTime(2600, ac.currentTime + duration)

    const gain = ac.createGain()
    gain.gain.setValueAtTime(0.0001, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + 0.06)
    gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration)

    source.connect(filter).connect(gain).connect(ac.destination)
    source.start()
    source.stop(ac.currentTime + duration)
  } catch {
    /* decoration only */
  }
}

/** Two rising notes for the celebration — a small "ta-da", not a fanfare. */
export function playChime() {
  const ac = audio()
  if (!ac) return
  try {
    ;[
      { freq: 660, at: 0 },
      { freq: 990, at: 0.13 },
    ].forEach(({ freq, at }) => {
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = ac.currentTime + at
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
      osc.connect(gain).connect(ac.destination)
      osc.start(start)
      osc.stop(start + 0.5)
    })
  } catch {
    /* decoration only */
  }
}
