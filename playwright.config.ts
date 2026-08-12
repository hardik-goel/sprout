import { defineConfig, devices } from '@playwright/test'

// E2E runs against the PRODUCTION build, not the dev server.
//
// That is the point of having it at all: the jsdom suite already proves the
// components behave. What it cannot prove is that the thing we actually ship
// works — the built bundle, the real router, the service worker, localStorage
// persisting across a reload, and a real layout where one element can sit on
// top of another. (A floating button covering the primary CTA is a bug this
// project has already shipped once; jsdom will never catch it.)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // Grant up front: photo proof and voice cheers both need them, and a
    // permission prompt in a headless run just hangs.
    permissions: ['camera', 'microphone'],
  },
  projects: [
    {
      name: 'mobile-chrome',
      // This is a mobile-first app; testing it at desktop width would test a
      // layout almost nobody sees.
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
