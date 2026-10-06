import { db, json, uid } from '../db.js';
import { HttpError } from './auth.js';
import { emptyProgress } from './stats.js';

// Pure progress maths lives in stats.js so the browser-only demo can share it.
export { emptyProgress, computeStats, statsOut } from './stats.js';

export function getProfileRow(userId) {
  const r = db.prepare('SELECT * FROM life_profiles WHERE user_id = ?').get(userId);
  return r ? { id: r.id, userId: r.user_id, data: json.parse(r.data, {}), analysis: json.parse(r.analysis), updatedAt: r.updated_at } : null;
}

export function requireProfile(userId) {
  const p = getProfileRow(userId);
  if (!p) throw new HttpError(400, 'Complete your life profile first.');
  return p;
}

export const dreamOut = (d) => d && ({
  id: d.id, userId: d.user_id, description: d.description, dreamType: d.dream_type, templateId: d.template_id,
  status: d.status, feasibility: json.parse(d.feasibility), createdAt: d.created_at,
});

export function getDream(id, userId) {
  const d = db.prepare('SELECT * FROM dreams WHERE id = ? AND user_id = ?').get(id, userId);
  if (!d) throw new HttpError(404, 'Dream not found.');
  return dreamOut(d);
}

export const getActiveDream = (userId) =>
  dreamOut(db.prepare("SELECT * FROM dreams WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1").get(userId));

const roadmapOut = (r) => r && ({ id: r.id, dreamId: r.dream_id, version: r.version, source: r.source, createdAt: r.created_at, updatedAt: r.updated_at, ...json.parse(r.data, {}) });

export function getRoadmap(id, userId) {
  const r = db.prepare('SELECT * FROM roadmaps WHERE id = ? AND user_id = ?').get(id, userId);
  if (!r) throw new HttpError(404, 'Roadmap not found.');
  return roadmapOut(r);
}
export const getRoadmapForDream = (dreamId) =>
  roadmapOut(db.prepare('SELECT * FROM roadmaps WHERE dream_id = ? ORDER BY created_at DESC LIMIT 1').get(dreamId));

export function saveRoadmap(roadmap, { userId, dreamId, source, id }) {
  const { id: _i, dreamId: _d, version: _v, source: _s, createdAt: _c, updatedAt: _u, ...data } = roadmap;
  if (id) {
    db.prepare("UPDATE roadmaps SET data = ?, version = version + 1, source = ?, updated_at = datetime('now') WHERE id = ?").run(json.str(data), source, id);
    return id;
  }
  const newId = uid();
  db.prepare('INSERT INTO roadmaps (id, dream_id, user_id, data, source) VALUES (?, ?, ?, ?, ?)').run(newId, dreamId, userId, json.str(data), source);
  return newId;
}

export function getProgress(roadmapId, userId) {
  const r = db.prepare('SELECT * FROM progress WHERE roadmap_id = ?').get(roadmapId);
  if (r) return { id: r.id, ...emptyProgress(), ...json.parse(r.data, {}), updatedAt: r.updated_at };
  const p = emptyProgress();
  const id = uid();
  db.prepare('INSERT INTO progress (id, user_id, roadmap_id, data) VALUES (?, ?, ?, ?)').run(id, userId, roadmapId, json.str(p));
  return { id, ...p };
}

export function saveProgress(roadmapId, progress) {
  const { id, updatedAt, ...data } = progress;
  db.prepare("UPDATE progress SET data = ?, updated_at = datetime('now') WHERE roadmap_id = ?").run(json.str(data), roadmapId);
}
