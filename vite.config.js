/**
 * Vite config. The service worker (offline caching and push) is src/sw.js.
 */

import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { contentSecurityPolicy } from './build/contentSecurityPolicy.js';

const CSP_HEADER = 'Content-Security-Policy-Report-Only';

/**
 * Adds the CSP to the built _headers file (public/_headers, which Sevalla applies at the edge) as
 * a rule for every path. Sevalla matches the requested path, so deep links answered by the SPA
 * fallback in _redirects get it too. See documentation/CONTENT-SECURITY-POLICY.md.
 */
function contentSecurityPolicyHeader(policy) {
  const header = `${CSP_HEADER}: ${policy}`;
  return {
    name: 'content-security-policy-header',
    apply: 'build',
    // An installed app's worker serves every page from its precached index.html, with the headers it
    // was fetched with. A fingerprint of the header makes index.html change with it, so the worker
    // fetches it again, with the new header, whenever the policy (or report-only/enforcing) changes.
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: { name: 'cincin-csp', content: createHash('sha256').update(header).digest('base64') },
      injectTo: 'head',
    }],
    writeBundle({ dir }) {
      const headersFile = path.join(dir, '_headers');
      const rules = fs.readFileSync(headersFile, 'utf8'); // public/_headers, copied in
      fs.writeFileSync(headersFile, `${rules.trimEnd()}\n\n/*\n  ${header}\n`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // The critical CSS inlined in index.html, allowed by its hash
  const inlineStyles = [...fs.readFileSync('index.html', 'utf8').matchAll(/<style>([\s\S]*?)<\/style>/g)].map(([, css]) => css);
  const policy = contentSecurityPolicy({ apiUrl: env.VITE_API_URL, wsUrl: env.VITE_WS_URL, inlineStyles });
  return {
    plugins: [
      react(),
      contentSecurityPolicyHeader(policy),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'brand/*.svg'],
        manifest: {
          name: 'CinCin — play your palate',
          short_name: 'CinCin',
          description: 'Turn any bottle into a multiplayer guessing game.',
          theme_color: '#241C18',
          background_color: '#241C18',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        // One service worker for offline caching and push: src/sw.js, built by Vite so it
        // can read the VITE_FIREBASE_* build variables
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      }),
    ],
    // vite preview serves the built app under the same policy as Sevalla, so the pwa tests run under it
    preview: { headers: { [CSP_HEADER]: policy } },
    server: {
      port: 3000,
      proxy: {
        '/api': { target: 'http://localhost:4000', changeOrigin: true },
        '/socket.io': { target: 'http://localhost:4000', changeOrigin: true, ws: true },
      },
    },
    resolve: { alias: { '@': '/src' } },
  };
});
