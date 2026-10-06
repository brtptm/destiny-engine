import { Router } from 'express';
import { db, json } from '../db.js';
import { requireAuth, HttpError } from '../lib/auth.js';
import { requireProfile, getDream, getActiveDream, getRoadmap, getRoadmapForDream, saveRoadmap, getProgress, saveProgress, computeStats, statsOut } from '../lib/state.js';
import { generateRoadmap, generateWeeklyPlan, adaptRoadmap } from '../ai/index.js';

const r = Router();
r.use(requireAuth);

r.post('/generate', async (req, res) => {
  const dream = req.body?.dreamId ? getDream(req.body.dreamId, req.user.id) : getActiveDream(req.user.id);
  if (!dream) throw new HttpError(400, 'Add a dream before generating a roadmap.');
  const existing = getRoadmapForDream(dream.id);
  if (existing && !req.body?.force) return res.json({ roadmap: existing });
  const profile = requireProfile(req.user.id);
  const { data, source } = await generateRoadmap(profile.data, dream.description, dream.feasibility);
  const id = saveRoadmap(data, { userId: req.user.id, dreamId: dream.id, source });
  getProgress(id, req.user.id);
  res.status(201).json({ roadmap: getRoadmap(id, req.user.id) });
});

r.get('/current', (req, res) => {
  const dream = getActiveDream(req.user.id);
  const roadmap = dream && getRoadmapForDream(dream.id);
  if (!roadmap) throw new HttpError(404, 'No roadmap yet.');
  res.json({ roadmap });
});

r.get('/:roadmapId', (req, res) => res.json({ roadmap: getRoadmap(req.params.roadmapId, req.user.id) }));

/** Lazily personalise a month's weekly plans with AI. */
r.post('/:roadmapId/months/:month/plan', async (req, res) => {
  const roadmap = getRoadmap(req.params.roadmapId, req.user.id);
  const m = Number(req.params.month);
  const profile = requireProfile(req.user.id);
  const progress = getProgress(roadmap.id, req.user.id);
  const s = statsOut(computeStats(roadmap, progress));
  const { data: weeks, source } = await generateWeeklyPlan(roadmap, m, profile.data, { week: s.currentWeek, percent: s.percent, incomeLogged: s.incomeTotal, onTrack: s.onTrack });
  roadmap.months = roadmap.months.map((x) => (x.month === m ? { ...x, weeks, weeksSource: source } : x));
  saveRoadmap(roadmap, { id: roadmap.id, source: roadmap.source });
  res.json({ roadmap: getRoadmap(roadmap.id, req.user.id), source });
});

async function applyAdaptation(req, roadmapId, adaptationId) {
  const roadmap = getRoadmap(roadmapId, req.user.id);
  const row = db.prepare('SELECT * FROM adaptations WHERE id = ? AND roadmap_id = ?').get(adaptationId, roadmap.id);
  if (!row) throw new HttpError(404, 'Course correction not found.');
  if (row.applied) throw new HttpError(409, 'This course correction is already applied.');
  const profile = requireProfile(req.user.id);
  const dream = getDream(roadmap.dreamId, req.user.id);
  const progress = getProgress(roadmap.id, req.user.id);
  const { data, source } = await adaptRoadmap({
    roadmap, advice: json.parse(row.advice), profile: profile.data, dream: dream.description,
    feasibility: dream.feasibility, currentWeek: progress.currentWeek, roadmapSource: roadmap.source,
  });
  saveRoadmap(data, { id: roadmap.id, source: roadmap.source === 'claude' ? 'claude' : source });
  db.prepare('UPDATE adaptations SET applied = 1 WHERE id = ?').run(row.id);
  progress.completedWeeks = progress.completedWeeks.filter((w) => w <= data.totalMonths * 4);
  saveProgress(roadmap.id, progress);
  return getRoadmap(roadmap.id, req.user.id);
}

// Adaptive planning: apply a course correction produced by /api/coaching/request-advice
r.put('/:roadmapId', async (req, res) => {
  if (!req.body?.adaptationId) throw new HttpError(400, 'Choose a course correction to apply.');
  res.json({ roadmap: await applyAdaptation(req, req.params.roadmapId, req.body.adaptationId) });
});

r.post('/regenerate', async (req, res) => {
  const { roadmapId, adaptationId } = req.body || {};
  if (adaptationId) return res.json({ roadmap: await applyAdaptation(req, roadmapId, adaptationId) });
  const old = getRoadmap(roadmapId, req.user.id);
  const dream = getDream(old.dreamId, req.user.id);
  const profile = requireProfile(req.user.id);
  const { data, source } = await generateRoadmap(profile.data, dream.description, dream.feasibility);
  data.startDate = old.startDate;
  data.adaptations = old.adaptations || [];
  saveRoadmap(data, { id: old.id, source });
  res.json({ roadmap: getRoadmap(old.id, req.user.id) });
});

export default r;
