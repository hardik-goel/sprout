// Rasterises public/icon.svg into the PNGs a real install needs.
//
// Why a script rather than committed binaries someone hand-exported: the SVG
// stays the single source of truth, so changing the mark means editing one file
// and re-running this — not opening a design tool and remembering six export
// sizes. Run it with `npm run icons`; the output is committed so a plain
// `npm install && npm run build` never needs a browser.
//
// It renders through Playwright's Chromium, which is already a dev dependency
// for the E2E suite, so this adds no new tooling.
//
// Two shapes are produced, and the difference matters:
//   - `any`      the mark on its own, edge to edge.
//   - `maskable` the same mark shrunk into the safe zone, because Android
//                crops icons to whatever shape the launcher wants. Shipping an
//                `any` icon as maskable is how you get the leaf sliced off.

import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

/** Android's maskable safe zone is the middle 80%; keep art inside it. */
const SAFE_ZONE = 0.8

const TARGETS = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  // iOS ignores the manifest and reads this one from a <link> tag. It also
  // ignores transparency, so it gets the opaque background either way.
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
]

/** The brand green, so a maskable icon's padding matches the mark's own field. */
const BACKGROUND = '#2FAE73'

function page(svg, size, maskable) {
  const inset = maskable ? ((1 - SAFE_ZONE) / 2) * 100 : 0
  return `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  body { width: ${size}px; height: ${size}px; background: ${BACKGROUND}; }
  .art {
    position: absolute;
    inset: ${inset}%;
    display: block;
  }
  .art svg { width: 100%; height: 100%; display: block; }
</style>
<div class="art">${svg}</div>`
}

const browser = await chromium.launch()
const svg = await readFile(join(publicDir, 'icon.svg'), 'utf8')
await mkdir(publicDir, { recursive: true })

for (const { file, size, maskable } of TARGETS) {
  const tab = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  await tab.setContent(page(svg, size, maskable), { waitUntil: 'load' })
  const png = await tab.screenshot({ type: 'png', omitBackground: false })
  await writeFile(join(publicDir, file), png)
  await tab.close()
  console.log(`${file.padEnd(26)} ${size}x${size}${maskable ? ' (maskable)' : ''}`)
}

await browser.close()
