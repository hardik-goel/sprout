// The things only a real browser and a real build can tell us: deep links
// resolve, state survives a reload, the language switch reaches every corner,
// and the PWA is actually installable.

import { test, expect } from '@playwright/test'

const ROUTES = [
  ['/parent', /Hi, Aanya/],
  ['/parent/tasks', /Task library/],
  ['/parent/rewards', /Reward menu/],
  ['/parent/history', /Points history/],
  ['/parent/album', /Growth album/],
  ['/parent/story', /Sunday family story/],
  ['/parent/cheers', /Voice cheers/],
  ['/parent/language', /Language/],
  ['/parent/more', /Everything else/],
  ['/kid', /Today’s tasks/],
  ['/kid/jar', /My Jar/],
  ['/kid/garden', /My Garden/],
  ['/kid/rewards', /Rewards Shelf/],
] as const

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
})

for (const [route, expected] of ROUTES) {
  test(`${route} loads directly, not just by in-app navigation`, async ({ page }) => {
    // Typed in, refreshed, or opened from a shared link. Without the SPA
    // rewrite in vercel.json this is a 404 in production.
    const response = await page.goto(route)
    expect(response?.status()).toBe(200)
    await expect(page.getByText(expected).first()).toBeVisible()
  })
}

test('an unknown route lands somewhere real instead of a blank page', async ({ page }) => {
  await page.goto('/parent/does-not-exist')
  await expect(page).toHaveURL(/\/(parent)?$/)
})

test('state survives a reload, because it is persisted not remembered', async ({ page }) => {
  await page.goto('/parent/language')
  await page.getByRole('button', { name: /हिंदी/ }).click()
  // Match the heading, not any text containing the word — the subtitle
  // ('…किस भाषा में बात करे') contains it too.
  await expect(page.getByRole('heading', { name: 'भाषा' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'भाषा' })).toBeVisible()

  // And it reaches the content, not just the chrome: task names are ours, so
  // they translate too.
  await page.goto('/kid')
  await expect(page.getByText('दाँत ब्रश करना')).toBeVisible()
  await expect(page.getByText('Brush teeth')).toHaveCount(0)
})

test('a reward the parent typed is never translated', async ({ page }) => {
  await page.goto('/parent/language')
  await page.getByRole('button', { name: /हिंदी/ }).click()
  await page.goto('/kid/rewards')
  // Their words, shown back exactly as written, in any language.
  await expect(page.getByText('Zoo trip')).toBeVisible()
})

test('ships an installable manifest with real raster icons', async ({ page, request }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()

  const manifest = await (await request.get(href!)).json()
  expect(manifest.name).toBe('Sprout')
  expect(manifest.display).toBe('standalone')

  // Installability needs a 512 PNG, and Android needs a *separate* maskable
  // one — the same file tagged twice gets the artwork cropped.
  const png512 = manifest.icons.find(
    (i: { sizes: string; type: string }) => i.sizes === '512x512' && i.type === 'image/png',
  )
  const maskable = manifest.icons.find((i: { purpose?: string }) => i.purpose === 'maskable')
  expect(png512).toBeTruthy()
  expect(maskable).toBeTruthy()
  expect(maskable.src).not.toBe(png512.src)

  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src.replace(/^\//, '')}`)).status()).toBe(200)
  }
  expect((await request.get('/apple-touch-icon.png')).status()).toBe(200)
})

test('renders without a single console error', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))

  for (const [route] of ROUTES) {
    await page.goto(route)
  }
  expect(errors).toEqual([])
})
