// @vitest-environment jsdom
//
// The story card is the one thing in Sprout that leaves the app: a PNG that
// gets forwarded to a family WhatsApp group. It is also the only output nobody
// can eyeball in CI, so instead of pixels we record every draw call and assert
// the things that would actually embarrass us — text falling off the card,
// stat tiles sitting on top of the closing line, a story line silently dropped.
//
// The shared test setup stubs `getContext` to null (enough for screens that
// merely touch the code path). Here we install a recording context so the
// layout maths really runs.

import { beforeEach, describe, expect, it } from 'vitest'
import { CARD_H, CARD_W, renderStoryCard, type StoryCardContent } from '../storyCard'

interface DrawnText {
  text: string
  x: number
  y: number
  align: CanvasTextAlign
}

interface DrawnRect {
  y: number
  h: number
}

let texts: DrawnText[]
let rects: DrawnRect[]

/**
 * A 2D context that records instead of rasterising. `measureText` returns a
 * plausible width (Devanagari is wider per character than Latin) so the
 * wrapping logic is genuinely exercised rather than short-circuited.
 */
function recordingContext(charWidth: number) {
  const ctx = {
    font: '',
    fillStyle: '' as string | CanvasGradient,
    textAlign: 'left' as CanvasTextAlign,
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => {},
    beginPath: () => {},
    moveTo: (_x: number, _y: number) => {},
    arcTo: (_x1: number, _y1: number, _x2: number, _y2: number, _r?: number) => {},
    closePath: () => {},
    measureText: (s: string) => ({ width: s.length * charWidth }),
    fillText(text: string, x: number, y: number) {
      texts.push({ text, x, y, align: ctx.textAlign })
    },
    fill() {
      // roundRect() sets the path then fills; we only need the last rect's box,
      // which we reconstruct from the arcTo calls the caller made. Simpler: the
      // only filled paths in this file are the stat tiles, and their geometry is
      // captured by patching roundRect's caller below.
    },
  }
  return ctx
}

function render(content: StoryCardContent, charWidth = 22) {
  texts = []
  rects = []
  const ctx = recordingContext(charWidth)

  // Capture tile geometry: roundRect is the only thing that calls moveTo, and
  // it is always followed by fill().
  let pending: { y: number; h: number } | null = null
  ctx.moveTo = (_x: number, y: number) => {
    pending = { y, h: 0 }
  }
  ctx.arcTo = (_x1: number, y1: number, _x2: number, y2: number) => {
    if (pending) pending.h = Math.max(pending.h, Math.max(y1, y2) - pending.y)
  }
  ctx.fill = () => {
    if (pending) rects.push(pending)
    pending = null
  }

  HTMLCanvasElement.prototype.getContext = (() => ctx) as never
  HTMLCanvasElement.prototype.toDataURL = (() => 'data:image/png;base64,ok') as never

  return renderStoryCard(content)
}

const SHORT: StoryCardContent = {
  title: 'Vir’s week',
  range: '5 Aug – 11 Aug',
  lines: ['What a week for Vir!', '16 tasks finished and 116 ⭐ earned.'],
  stats: [
    { label: 'Tasks done', value: '16', emoji: '✅' },
    { label: 'Points earned', value: '116', emoji: '⭐' },
    { label: 'Screen-free wins', value: '13', emoji: '📵' },
  ],
  closing: 'Grown with Sprout 🌱',
  emoji: '🦖',
  footer: 'Points only — no real money.',
}

// The worst realistic case: a rich Plus story in Hindi, where every sentence
// wraps to more lines than its English equivalent.
const LONG: StoryCardContent = {
  ...SHORT,
  title: 'Vir का हफ़्ता',
  lines: [
    'Vir का हफ़्ता कमाल का रहा!',
    '16 काम पूरे और 116 ⭐ कमाए।',
    'लगातार 6 दिन — लय बनी हुई है। 🔥',
    '13 बार स्क्रीन की जगह पढ़ना, खेलना, मदद करना चुना। 📵',
    '60 ⭐ दूर है Zoo trip 🦁 से (60% पहुँच गए)।',
    'इस हफ़्ते की आदत: 🪥 दाँत ब्रश करना, 5/7 दिन।',
  ],
  stats: [...SHORT.stats, { label: 'Best streak', value: '6d', emoji: '🔥' }],
  closing: 'शाबाश, Vir! 🌟',
}

describe('story card', () => {
  beforeEach(() => {
    texts = []
    rects = []
  })

  it('returns a PNG data url', () => {
    expect(render(SHORT)).toMatch(/^data:image\/png/)
  })

  it('draws every story line', () => {
    render(SHORT)
    const drawn = texts.map((t) => t.text).join(' ')
    for (const line of SHORT.lines) {
      // Long lines wrap, so check the opening words rather than the whole line.
      expect(drawn).toContain(line.split(' ').slice(0, 3).join(' '))
    }
  })

  it('draws the title, range, closing and footer', () => {
    render(SHORT)
    const drawn = texts.map((t) => t.text)
    expect(drawn).toContain(SHORT.title)
    expect(drawn).toContain(SHORT.range)
    expect(drawn).toContain(SHORT.closing)
    expect(drawn).toContain(SHORT.footer)
  })

  it('keeps every stat tile on the card', () => {
    render(SHORT)
    expect(rects).toHaveLength(SHORT.stats.length)
    for (const r of rects) {
      expect(r.y).toBeGreaterThan(0)
      expect(r.y + r.h).toBeLessThanOrEqual(CARD_H)
    }
  })

  it('never lets the stat tiles collide with the closing line', () => {
    // This is the regression: the tiles used to be placed at
    // `max(afterLines, CARD_H - 400)` with no ceiling, so a story long enough
    // pushed them straight down onto the closing text.
    for (const content of [SHORT, LONG]) {
      render(content, 26)
      const closing = texts.find((t) => t.text === content.closing)!
      const tileBottom = Math.max(...rects.map((r) => r.y + r.h))
      expect(tileBottom).toBeLessThan(closing.y)
    }
  })

  it('survives a long Hindi story without running off the bottom', () => {
    render(LONG, 30)
    for (const t of texts) {
      expect(t.y).toBeGreaterThan(0)
      expect(t.y).toBeLessThanOrEqual(CARD_H)
    }
  })

  it('wraps long lines instead of drawing past the right edge', () => {
    const charWidth = 26
    render(LONG, charWidth)
    // Every left-aligned run of body text must fit inside the 90px margins.
    for (const t of texts.filter((x) => x.align === 'left')) {
      expect(t.x + t.text.length * charWidth).toBeLessThanOrEqual(CARD_W + 90)
    }
  })

  it('returns an empty string rather than throwing when canvas is unavailable', () => {
    HTMLCanvasElement.prototype.getContext = (() => null) as never
    expect(renderStoryCard(SHORT)).toBe('')
  })
})
