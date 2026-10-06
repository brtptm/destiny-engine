import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, json, uid } from '../db.js';
import { signToken, publicUser, requireAuth, HttpError } from '../lib/auth.js';
import { DEMO_EMAIL, ensureDemoUser } from '../seed.js';

const r = Router();
const emailOk = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const DEFAULT_SETTINGS = { theme: 'dark', coachingTime: 'morning', emailNotifications: true, pushNotifications: true, weeklySummary: true };

r.post('/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!emailOk(email)) throw new HttpError(400, 'Enter a valid email address.');
  if (!password || password.length < 8) throw new HttpError(400, 'Use a password with at least 8 characters.');
  if (!name?.trim()) throw new HttpError(400, 'Tell us your name.');
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
  const id = uid();
  db.prepare('INSERT INTO users (id, email, name, password_hash, settings) VALUES (?, ?, ?, ?, ?)')
    .run(id, email.toLowerCase(), name.trim(), await bcrypt.hash(password, 10), json.str(DEFAULT_SETTINGS));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = emailOk(email) && db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) throw new HttpError(401, 'Email or password is incorrect.');
  res.json({ token: signToken(user), user: publicUser(user) });
});

r.post('/demo', async (_req, res) => {
  await ensureDemoUser();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(DEMO_EMAIL);
  res.json({ token: signToken(user), user: publicUser(user) });
});

// Tokens are stateless; the client drops the token. Endpoint kept for API completeness.
r.post('/logout', (_req, res) => res.json({ ok: true }));

r.get('/profile', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

r.put('/settings', requireAuth, (req, res) => {
  const current = json.parse(req.user.settings, {});
  const allowed = ['theme', 'coachingTime', 'emailNotifications', 'pushNotifications', 'weeklySummary'];
  const next = { ...DEFAULT_SETTINGS, ...current };
  for (const k of allowed) if (k in (req.body || {})) next[k] = req.body[k];
  if (typeof req.body?.name === 'string' && req.body.name.trim()) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(req.body.name.trim(), req.user.id);
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(json.str(next), req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

r.get('/export', requireAuth, (req, res) => {
  const u = req.user.id;
  const rows = (sql) => db.prepare(sql).all(u);
  const parseAll = (list, fields) => list.map((x) => { const o = { ...x }; for (const f of fields) o[f] = json.parse(o[f]); return o; });
  res.setHeader('Content-Disposition', 'attachment; filename="destiny-engine-export.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    user: publicUser(req.user),
    profile: parseAll(rows('SELECT * FROM life_profiles WHERE user_id = ?'), ['data', 'analysis']),
    dreams: parseAll(rows('SELECT * FROM dreams WHERE user_id = ?'), ['feasibility']),
    roadmaps: parseAll(rows('SELECT * FROM roadmaps WHERE user_id = ?'), ['data']),
    progress: parseAll(rows('SELECT * FROM progress WHERE user_id = ?'), ['data']),
    coaching: rows('SELECT * FROM coaching_messages WHERE user_id = ?'),
  });
});

r.delete('/account', requireAuth, (req, res) => {
  if (req.user.email === DEMO_EMAIL) throw new HttpError(400, 'The demo account can be reset, not deleted.');
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

export default r;
