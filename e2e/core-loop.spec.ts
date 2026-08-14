// The loop, in a real browser, against the real build.

import { test, expect, type Page } from '@playwright/test'

/** Points as the parent home shows them, read back from the ledger's own UI. */
async function balance(page: Page): Promise<number> {
  const text = await page.locator('main').getByText(/^\d+$/).first().innerText()
  return Number(text)
}

test.beforeEach(async ({ page }) => {
  // A fresh seed per test: these run in parallel against one origin, so they
  // must not inherit each other's localStorage.
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/parent')
})

test('the seeded family is on screen', async ({ page }) => {
  await expect(page.getByText('Hi, Aanya')).toBeVisible()
  await expect(page.getByText('Zoo trip')).toBeVisible()
  await expect(page.getByText('5 days')).toBeVisible()
  await expect(page.getByText('90', { exact: true }).first()).toBeVisible()
})

test('kid marks a task done, parent approves, points and garden move', async ({ page }) => {
  const before = await balance(page)

  // Kid: open the task and say it's done. No photo — the loop must not require
  // one, and a headless camera is not a real camera.
  await page.goto('/kid')
  await page.getByRole('button', { name: /🪥 Brush teeth/ }).click()
  await page.getByRole('button', { name: /I did it!/ }).click()
  await expect(page).toHaveURL(/\/kid$/)
  await expect(page.getByText(/Waiting for a grown-up|grown-up/i).first()).toBeVisible()

  // Parent: approve it.
  await page.goto('/parent')
  await page.getByRole('button', { name: /Brush teeth/ }).click()
  await page.getByRole('button', { name: /Approve · \+\d+ pts/ }).click()
  await expect(page.getByText('Approved!')).toBeVisible()

  await page.goto('/parent')
  expect(await balance(page)).toBeGreaterThan(before)
  await expect(page.getByText('6 days')).toBeVisible()
})

test('the celebration screen fires and its button is not covered', async ({ page }) => {
  await page.goto('/kid')
  await page.getByRole('button', { name: /🪥 Brush teeth/ }).click()
  await page.getByRole('button', { name: /I did it!/ }).click()

  await page.goto('/parent')
  await page.getByRole('button', { name: /Brush teeth/ }).click()
  await page.getByRole('button', { name: /Approve · \+\d+ pts/ }).click()
  await page.getByRole('button', { name: /See .*celebration/ }).click()

  await expect(page).toHaveURL(/\/kid\/celebrate/)
  await expect(page.getByText(/Woohoo/)).toBeVisible()

  // The regression that jsdom cannot see: the persona pill used to sit exactly
  // on top of this button. `click()` fails if another element would receive
  // the event, so this asserts the CTA is genuinely reachable.
  await page.getByRole('button', { name: /Keep going/ }).click()
  await expect(page).toHaveURL(/\/kid$/)
})

test('undo puts the points back without erasing history', async ({ page }) => {
  const before = await balance(page)

  await page.goto('/kid')
  await page.getByRole('button', { name: /🪥 Brush teeth/ }).click()
  await page.getByRole('button', { name: /I did it!/ }).click()
  await page.goto('/parent')
  await page.getByRole('button', { name: /Brush teeth/ }).click()
  await page.getByRole('button', { name: /Approve · \+\d+ pts/ }).click()
  await page.getByRole('button', { name: /Undo this approval/ }).click()

  await page.goto('/parent')
  expect(await balance(page)).toBe(before)

  // The reversal is its own row; the original approval is still there.
  await page.goto('/parent/history')
  await expect(page.getByText(/Adjustment/).first()).toBeVisible()
  await expect(page.getByText(/Task approved/).first()).toBeVisible()
})

test('one tap on the tick finishes a task, no photo screen in the way', async ({ page }) => {
  await page.goto('/kid')
  // The tick is its own target, beside the card that opens the photo flow.
  await page.getByRole('button', { name: 'I did Brush teeth' }).click()
  await expect(page.getByText(/Waiting for a grown-up|grown-up/i).first()).toBeVisible()
  await expect(page).toHaveURL(/\/kid$/)
})

test('a child signs in to their own day, and cannot open the parent screens', async ({ page }) => {
  // Set both locks the way a parent would, then reload as the child.
  await page.goto('/parent/access')
  await page.getByRole('button', { name: /Set a PIN/ }).first().click()
  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
  // The pad asks for it twice; wait for the second ask before typing again.
  await expect(page.getByText(/Type them once more/)).toBeVisible()
  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
  await expect(page.getByText(/Change PIN/).first()).toBeVisible()
  await page.goto('/kid')

  // Coming back up asks for the parent PIN instead of showing the home screen.
  await page.getByRole('button', { name: /Parent view|to Parent/ }).click()
  await expect(page.getByText(/Grown-ups only/)).toBeVisible()
  await expect(page.getByText('Hi, Aanya')).toBeHidden()

  for (const digit of ['1', '2', '3', '4']) {
    await page.getByRole('button', { name: digit, exact: true }).click()
  }
  await expect(page.getByText('Hi, Aanya')).toBeVisible()
})

test('the points history never opens underwater', async ({ page }) => {
  await page.goto('/parent/history')
  const balances = await page.getByText(/balance -?\d+/).allInnerTexts()
  expect(balances.length).toBeGreaterThan(5)
  for (const line of balances) {
    expect(Number(/balance (-?\d+)/.exec(line)![1])).toBeGreaterThanOrEqual(0)
  }
})
