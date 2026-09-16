import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Kizen — Hábitos con intención',
        short_name: 'Kizen',
        description: 'Hábitos con intención, constancia y progreso diario.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f6f4ed',
        theme_color: '#1f2e27',
        categories: ['lifestyle', 'productivity'],
        icons: [
          {
            src: 'kizen-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'kizen-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,woff2}'],
      },
      includeAssets: ['apple-touch-icon.png'],
    }),
  ],
})
