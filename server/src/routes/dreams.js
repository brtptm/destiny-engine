import { Router } from 'express';
import { db, json, uid } from '../db.js';
import { requireAuth, HttpError } from '../lib/auth.js';
import { requireProfile, getDream } from '../lib/state.js';
import { analyzeDreamFeasibility, classifyDream } from '../ai/index.js';
import { getTemplate } from '../data/templates.js';

const r = Router();
r.use(requireAuth);

export async function createDream(userId, { description, templateId }) {
  const tpl = templateId ? getTemplate(templateId) : null;
  const text = (description || tpl?.dream || '').trim();
  if (text.length < 8) throw new HttpError(400, 'Describe your dream in a sentence or pick a template.');
  if (text.length > 600) throw new HttpError(400, 'Keep your dream under 600 characters.');
  const profile = requireProfile(userId);
  const type = tpl && text === tpl.dream ? tpl.archetype : classifyDream(text);
  const { data: feasibility, source } = await analyzeDreamFeasibility(profile.data, text, type);
  const id = uid();
  db.prepare("UPDATE dreams SET status = 'archived' WHERE user_id = ? AND status = 'active'").run(userId);
  db.prepare('INSERT INTO dreams (id, user_id, description, dream_type, template_id, feasibility) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, text, feasibility.archetype, tpl?.id || null, json.str({ ...feasibility, source }));
  return getDream(id, userId);
}

r.post('/create', async (req, res) => res.status(201).json({ dream: await createDream(req.user.id, req.body || {}) }));

r.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, description, dream_type, status, created_at FROM dreams WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ dreams: rows.map((d) => ({ id: d.id, description: d.description, dreamType: d.dream_type, status: d.status, createdAt: d.created_at })) });
});

r.get('/:dreamId', (req, res) => res.json({ dream: getDream(req.params.dreamId, req.user.id) }));

r.put('/:dreamId', async (req, res) => {
  const dream = getDream(req.params.dreamId, req.user.id);
  const text = (req.body?.description || '').trim();
  if (text.length < 8) throw new HttpError(400, 'Describe your dream in a sentence.');
  const profile = requireProfile(req.user.id);
  const { data: feasibility, source } = await analyzeDreamFeasibility(profile.data, text, classifyDream(text));
  db.prepare('UPDATE dreams SET description = ?, dream_type = ?, feasibility = ? WHERE id = ?').run(text, feasibility.archetype, json.str({ ...feasibility, source }), dream.id);
  res.json({ dream: getDream(dream.id, req.user.id) });
});

r.delete('/:dreamId', (req, res) => {
  const dream = getDream(req.params.dreamId, req.user.id);
  db.prepare('DELETE FROM dreams WHERE id = ?').run(dream.id);
  res.json({ ok: true });
});

export default r;
