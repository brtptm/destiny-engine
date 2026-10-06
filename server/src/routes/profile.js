import { Router } from 'express';
import { db, json, uid } from '../db.js';
import { requireAuth, selfOnly, HttpError } from '../lib/auth.js';
import { getProfileRow } from '../lib/state.js';
import { analyzeLifeProfile, normalizeProfile } from '../ai/index.js';

const r = Router();
r.use(requireAuth);

async function upsert(userId, data) {
  if (!data || typeof data !== 'object') throw new HttpError(400, 'Send your profile answers as JSON.');
  const profile = normalizeProfile(data);
  const { data: analysis, source } = await analyzeLifeProfile(profile);
  const existing = getProfileRow(userId);
  if (existing) {
    db.prepare("UPDATE life_profiles SET data = ?, analysis = ?, updated_at = datetime('now') WHERE user_id = ?").run(json.str(profile), json.str({ ...analysis, source }), userId);
  } else {
    db.prepare('INSERT INTO life_profiles (id, user_id, data, analysis) VALUES (?, ?, ?, ?)').run(uid(), userId, json.str(profile), json.str({ ...analysis, source }));
  }
  return getProfileRow(userId);
}

r.post('/create', async (req, res) => res.status(201).json({ profile: await upsert(req.user.id, req.body?.profile ?? req.body) }));

r.get('/:userId', selfOnly(), (req, res) => {
  const p = getProfileRow(req.user.id);
  if (!p) throw new HttpError(404, 'No life profile yet.');
  res.json({ profile: p });
});

r.put('/:userId', selfOnly(), async (req, res) => res.json({ profile: await upsert(req.user.id, req.body?.profile ?? req.body) }));

r.post('/skills-analysis', async (req, res) => {
  const p = getProfileRow(req.user.id);
  if (!p) throw new HttpError(404, 'No life profile yet.');
  const { data } = await analyzeLifeProfile(p.data);
  res.json({ skillsAssessment: data.skillsAssessment, keyStrengths: data.keyStrengths });
});

export default r;
