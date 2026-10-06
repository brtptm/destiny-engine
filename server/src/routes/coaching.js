import { Router } from 'express';
import { db, json, uid } from '../db.js';
import { requireAuth, HttpError } from '../lib/auth.js';
import { getActiveDream, getRoadmapForDream, getProgress, computeStats, statsOut, requireProfile } from '../lib/state.js';
import { generateDailyCoaching, requestAdvice, previewAdaptation, ISSUE_TYPES } from '../ai/index.js';

const r = Router();
r.use(requireAuth);

const out = (m) => ({
  id: m.id, date: m.date, type: m.type, message: m.message, actionSuggested: m.action_suggested, resource: m.resource,
  emoji: m.emoji, relevanceScore: m.relevance, read: !!m.read, archived: !!m.archived, feedback: m.feedback, source: m.source, timestamp: m.created_at,
});

function context(userId) {
  const dream = getActiveDream(userId);
  const roadmap = dream && getRoadmapForDream(dream.id);
  if (!roadmap) throw new HttpError(404, 'Generate a roadmap to unlock coaching.');
  const progress = getProgress(roadmap.id, userId);
  return { dream, roadmap, progress, stats: computeStats(roadmap, progress), profile: requireProfile(userId).data };
}

export async function createDailyMessage(userId, { force = false } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  if (!force) {
    const existing = db.prepare("SELECT * FROM coaching_messages WHERE user_id = ? AND date = ? AND type != 'advice' ORDER BY created_at DESC LIMIT 1").get(userId, today);
    if (existing) return out(existing);
  }
  const ctx = context(userId);
  const history = db.prepare('SELECT type FROM coaching_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
  const { data, source } = await generateDailyCoaching({ profile: ctx.profile, roadmap: ctx.roadmap, stats: ctx.stats, today: new Date().toISOString(), history });
  const id = uid();
  db.prepare('INSERT INTO coaching_messages (id, user_id, date, type, message, action_suggested, resource, emoji, relevance, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, userId, today, data.type, data.message, data.actionSuggested || '', data.resource || '', data.emoji || '', data.relevanceScore ?? 0.9, source);
  return out(db.prepare('SELECT * FROM coaching_messages WHERE id = ?').get(id));
}

r.get('/daily-message', async (req, res) => res.json({ message: await createDailyMessage(req.user.id, { force: req.query.refresh === '1' }) }));

r.get('/history', (req, res) => {
  const archived = req.query.archived === '1' ? 1 : 0;
  const rows = db.prepare('SELECT * FROM coaching_messages WHERE user_id = ? AND archived = ? ORDER BY created_at DESC LIMIT 100').all(req.user.id, archived);
  res.json({ messages: rows.map(out) });
});

r.post('/feedback', (req, res) => {
  const { messageId, feedback, read, archived } = req.body || {};
  const m = db.prepare('SELECT * FROM coaching_messages WHERE id = ? AND user_id = ?').get(messageId, req.user.id);
  if (!m) throw new HttpError(404, 'Message not found.');
  if (feedback !== undefined) db.prepare('UPDATE coaching_messages SET feedback = ? WHERE id = ?').run(['helpful', 'not-helpful'].includes(feedback) ? feedback : null, m.id);
  if (read !== undefined) db.prepare('UPDATE coaching_messages SET read = ? WHERE id = ?').run(read ? 1 : 0, m.id);
  if (archived !== undefined) db.prepare('UPDATE coaching_messages SET archived = ? WHERE id = ?').run(archived ? 1 : 0, m.id);
  res.json({ message: out(db.prepare('SELECT * FROM coaching_messages WHERE id = ?').get(m.id)) });
});

r.get('/issues', (_req, res) => res.json({ issues: ISSUE_TYPES }));

r.post('/request-advice', async (req, res) => {
  const { issue, details } = req.body || {};
  if (!issue) throw new HttpError(400, 'Pick what is blocking you.');
  if (details && details.length > 1000) throw new HttpError(400, 'Keep the description under 1000 characters.');
  const ctx = context(req.user.id);
  const { data: advice, source } = await requestAdvice({ issue, details, roadmap: ctx.roadmap, stats: statsOut(ctx.stats), profile: ctx.profile });
  // Show exactly what applying would change before the user decides; the stored advice carries the
  // re-scored feasibility, so applying it later lands on the same numbers the user saw.
  const preview = previewAdaptation({ roadmap: ctx.roadmap, advice, profile: ctx.profile, dream: ctx.dream.description, feasibility: ctx.dream.feasibility, currentWeek: ctx.stats.currentWeek });
  advice.feasibility = preview.feasibility;
  advice.preview = { milestoneShifts: preview.milestoneShifts, lockedWeeks: preview.lockedWeeks, fromMonths: preview.fromMonths, toMonths: preview.toMonths };
  const id = uid();
  db.prepare('INSERT INTO adaptations (id, user_id, roadmap_id, issue, details, advice) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.id, ctx.roadmap.id, issue, details || '', json.str(advice));
  res.status(201).json({ adaptationId: id, roadmapId: ctx.roadmap.id, advice, source });
});

export default r;
