// Renders the Sunday Family Story to a WhatsApp-sized PNG on a canvas.
// Canvas (not a screenshot library) keeps it dependency-free and offline —
// and the output is a plain image the parent can forward anywhere.

import type { FamilyStory } from '@/domain'

export const CARD_W = 1080
export const CARD_H = 1350

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export function renderStoryCard(story: FamilyStory): string {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const font = (size: number, weight = '700') =>
    `${weight} ${size}px Inter, system-ui, -apple-system, "Segoe UI", sans-serif`

  // Background — the deep kid-world green, so the card is unmistakably Sprout.
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bg.addColorStop(0, '#114438')
  bg.addColorStop(1, '#0C342B')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Header
  ctx.textAlign = 'left'
  ctx.fillStyle = '#43D6A0'
  ctx.font = font(40, '800')
  ctx.fillText('🌱 SPROUT', 90, 130)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = font(84, '800')
  ctx.fillText(story.title, 90, 250)

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = font(38, '600')
  ctx.fillText(story.subtitle, 90, 310)

  // Avatar bubble
  ctx.font = font(120, '400')
  ctx.textAlign = 'right'
  ctx.fillText(story.emoji, CARD_W - 90, 260)
  ctx.textAlign = 'left'

  // Story lines
  let y = 430
  ctx.font = font(46, '600')
  for (const line of story.lines) {
    ctx.fillStyle = '#FFFFFF'
    for (const wrapped of wrap(ctx, line, CARD_W - 180)) {
      ctx.fillText(wrapped, 90, y)
      y += 64
    }
    y += 18
  }

  // Stat tiles
  const tileY = Math.max(y + 30, CARD_H - 400)
  const gap = 24
  const tileW = (CARD_W - 180 - gap * (story.stats.length - 1)) / story.stats.length
  story.stats.forEach((stat, i) => {
    const x = 90 + i * (tileW + gap)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, x, tileY, tileW, 190, 36)
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.font = font(46, '400')
    ctx.fillText(stat.emoji, x + tileW / 2, tileY + 66)
    ctx.fillStyle = '#43D6A0'
    ctx.font = font(56, '800')
    ctx.fillText(stat.value, x + tileW / 2, tileY + 130)
    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = font(24, '600')
    ctx.fillText(stat.label, x + tileW / 2, tileY + 168)
    ctx.textAlign = 'left'
  })

  // Closing
  ctx.textAlign = 'center'
  ctx.fillStyle = '#F0A92E'
  ctx.font = font(48, '800')
  ctx.fillText(story.closing, CARD_W / 2, CARD_H - 130)
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = font(28, '600')
  ctx.fillText('Points only. No real money. sprout.app', CARD_W / 2, CARD_H - 70)

  return canvas.toDataURL('image/png')
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
