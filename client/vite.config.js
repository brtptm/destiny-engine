import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The demo build is served from a sub-path on GitHub Pages (e.g. /destiny-engine/).
  base: process.env.VITE_BASE || '/',
  // The browser-only demo reuses the server's pure planning code (engine, stats, templates, demo journey).
  resolve: { alias: { '@server': path.resolve(here, '../server/src') } },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
    fs: { allow: [path.resolve(here, '..')] },
  },
});
