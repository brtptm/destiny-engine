import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './db.js';
import { aiStatus } from './ai/index.js';
import { ensureDemoUser } from './seed.js';
import auth from './routes/auth.js';
import profile from './routes/profile.js';
import dreams from './routes/dreams.js';
import roadmap from './routes/roadmap.js';
import progress from './routes/progress.js';
import coaching from './routes/coaching.js';
import templates from './routes/templates.js';
import dashboard from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 4000);

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || true }));
app.use(express.json({ limit: '200kb' }));

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false }));
// AI-backed endpoints get a tighter budget.
const aiLimit = rateLimit({ windowMs: 60 * 1000, limit: 20, message: { error: 'Too many AI requests. Wait a minute and try again.' } });
app.use(['/api/profile/create', '/api/dreams/create', '/api/roadmap/generate', '/api/roadmap/regenerate', '/api/coaching/request-advice', '/api/templates/use-template'], aiLimit);

app.get('/api/health', (_req, res) => res.json({ ok: true, ai: aiStatus() }));
app.use('/api/auth', auth);
app.use('/api/profile', profile);
app.use('/api/dreams', dreams);
app.use('/api/roadmap', roadmap);
app.use('/api/progress', progress);
app.use('/api/coaching', coaching);
app.use('/api/templates', templates);
app.use('/api/dashboard', dashboard);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// Serve the built client in production (single-port deploy).
const dist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side. Try again in a moment.' : err.message });
});

await ensureDemoUser();
app.listen(PORT, () => {
  const ai = aiStatus();
  console.log(`✦ Destiny Engine API on http://localhost:${PORT}`);
  console.log(ai.enabled ? `  AI: Claude (${ai.model})` : '  AI: built-in engine (set ANTHROPIC_API_KEY to enable Claude)');
});
