/**
 * Vite Config — Priority 5 Update
 * 
 * Priority 5 changes:
 * - Added StaleWhileRevalidate caching strategy for /api/taxonomy endpoint.
 *   Taxonomy data changes rarely, so serving from cache with background 
 *   revalidation gives instant offline access without stale data risk.
 * - Added CacheFirst strategy for /api/bottles/:id/cache endpoint to
 *   ensure cached bottles are served instantly for offline game play.
 * - Increased api-cache maxEntries from 50 to 100 for better offline coverage.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'CinCin — AI Tasting Game',
        short_name: 'CinCin',
        description: 'Scan. Taste. Compete. The AI-powered blind tasting game.',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Priority 5: Taxonomy data — changes rarely, serve from cache
          // with background revalidation for instant offline access.
          {
            urlPattern: /\/api\/scan\/taxonomy/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'taxonomy-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 604800 }, // 7 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Priority 5: Bottle cache data — bottles fetched for offline play.
          // CacheFirst because these are explicitly requested for offline use
          // and the data (tasting notes) doesn't change once published.
          {
            urlPattern: /\/api\/bottles\/[^/]+\/cache/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bottle-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 2592000 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Priority 5: User profile and palate profile — cache for offline viewing.
          // NetworkFirst so fresh data is preferred, but cached data serves when offline.
          {
            urlPattern: /\/api\/(palate|users\/me)/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'profile-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 86400 }, // 24 hours
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // General API — NetworkFirst with increased capacity
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
              networkTimeoutSeconds: 5,
            },
          },
          // Static images — CacheFirst (unchanged)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', changeOrigin: true, ws: true },
    },
  },
  resolve: { alias: { '@': '/src' } },
});
