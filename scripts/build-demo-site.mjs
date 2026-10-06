// Builds the static demo site (no backend): the app at index.html, the pitch deck at slides.html.
//   VITE_BASE=/destiny-engine/ node scripts/build-demo-site.mjs   → ./site
// The app is built with VITE_DEMO=1, so it runs the planning engine in the browser and stores data locally.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'site');
const base = process.env.VITE_BASE || '/';

execSync('pnpm --filter ./client exec vite build --outDir ../site --emptyOutDir', {
  cwd: root, stdio: 'inherit', env: { ...process.env, VITE_DEMO: '1', VITE_BASE: base },
});

// GitHub Pages serves 404.html for unknown paths, so deep links (/today, /roadmap…) still boot the app.
fs.copyFileSync(path.join(out, 'index.html'), path.join(out, '404.html'));

// Pitch deck + its screenshots (Vite's hashed bundles share assets/ without clashing).
for (const f of fs.readdirSync(path.join(root, 'demo/assets'))) fs.copyFileSync(path.join(root, 'demo/assets', f), path.join(out, 'assets', f));
const backToApp = `<a href="./" style="position:fixed;top:18px;right:22px;z-index:50;font:600 15px Figtree,system-ui,sans-serif;color:#09090b;background:#e9bf6b;padding:9px 16px;border-radius:999px;text-decoration:none">Open the live demo →</a>`;
const slides = fs.readFileSync(path.join(root, 'demo/slides.html'), 'utf8')
  .replace(/\.\.\/client\/public\/star\.svg/g, 'star.svg')
  .replace('</body>', `  ${backToApp}\n</body>`);
fs.writeFileSync(path.join(out, 'slides.html'), slides);
fs.writeFileSync(path.join(out, 'slide.html'), '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=slides.html"><title>Destiny Engine — Pitch</title><a href="slides.html">Pitch slides</a>\n');

console.log(`\nDemo site ready in ./site (base ${base}): index.html = app, slides.html = pitch deck`);
