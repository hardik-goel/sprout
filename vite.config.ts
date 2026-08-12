import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sprout',
        short_name: 'Sprout',
        description: 'Kids earn points for real-world tasks, grow a garden, fill a saving jar.',
        theme_color: '#2FAE73',
        background_color: '#FCFAF5',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        // Real PNGs, generated from icon.svg by `npm run icons`. Android and
        // the app stores want raster; the SVG stays first for browsers that
        // prefer it and scales better than any of these.
        //
        // `maskable` is a genuinely different image, not the same file tagged
        // twice: Android crops icons to the launcher's shape, so the mark is
        // inset into the safe zone there. Tagging an edge-to-edge icon as
        // maskable is how the leaf ends up sliced off.
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true }, // expose on LAN so phone can reach it over Wi-Fi
  test: {
    // The Playwright specs are also `*.spec.ts`; without this Vitest picks them
    // up and fails on an API that only exists inside a Playwright runner.
    // `npm test` is the unit/screen suite, `npm run e2e` is the browser one.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // Domain tests run in plain node; screen smoke tests need a DOM.
    environment: 'node',
    environmentMatchGlobs: [['src/features/**', 'jsdom'], ['src/ui/**', 'jsdom']],
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
})
