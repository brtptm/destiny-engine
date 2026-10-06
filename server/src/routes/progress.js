import { Router } from 'express';
import { requireAuth, selfOnly, HttpError } from '../lib/auth.js';
import { getActiveDream, getRoadmapForDream, getProgress, saveProgress, computeStats, statsOut } from '../lib/state.js';

const r = Router();
r.use(requireAuth);

function current(userId) {
  const dream = getActiveDream(userId);
  const roadmap = dream && getRoadmapForDream(dream.id);
  if (!roadmap) throw new HttpError(404, 'Generate a roadmap to start tracking progress.');
  return { dream, roadmap, progress: getProgress(roadmap.id, userId) };
}
const payload = ({ roadmap, progress }) => ({ progress, stats: statsOut(computeStats(roadmap, progress)) });

r.post('/update', (req, res) => {
  const ctx = current(req.user.id);
  const { incomeAmount, incomeSource, savingsAmount, date, note } = req.body || {};
  const d = (date || new Date().toISOString()).slice(0, 10);
  if (incomeAmount != null) {
    const amt = Number(incomeAmount);
    if (!Number.isFinite(amt) || amt <= 0) throw new HttpError(400, 'Enter an income amount greater than zero.');
    ctx.progress.incomeLog.push({ date: d, amount: amt, source: incomeSource || 'dream income', note: note || '' });
  }
  if (savingsAmount != null) {
    const amt = Number(savingsAmount);
    if (!Number.isFinite(amt)) throw new HttpError(400, 'Enter a valid savings amount.');
    ctx.progress.savingsLog.push({ date: d, amount: amt, note: note || '' });
  }
  saveProgress(ctx.roadmap.id, ctx.progress);
  res.json(payload(ctx));
});

r.post('/checklist-complete', (req, res) => {
  const ctx = current(req.user.id);
  const { actionId, done = true, note } = req.body || {};
  const exists = ctx.roadmap.months.some((m) => (m.weeks || []).some((w) => w.actions.some((a) => a.id === actionId)));
  if (!exists) throw new HttpError(404, 'Action not found in your roadmap.');
  if (done) ctx.progress.completedActions[actionId] = { completedAt: new Date().toISOString(), note: note || '' };
  else delete ctx.progress.completedActions[actionId];
  saveProgress(ctx.roadmap.id, ctx.progress);
  res.json(payload(ctx));
});

r.post('/complete-week', (req, res) => {
  const ctx = current(req.user.id);
  const total = ctx.roadmap.totalMonths * 4;
  const wk = ctx.progress.currentWeek;
  if (!ctx.progress.completedWeeks.includes(wk)) ctx.progress.completedWeeks.push(wk);
  ctx.progress.currentWeek = Math.min(total, wk + 1);
  saveProgress(ctx.roadmap.id, ctx.progress);
  const after = computeStats(ctx.roadmap, ctx.progress);
  const unlocked = after.justHitMilestone ? after.achievedMilestones.at(-1) : null;
  res.json({ ...payload(ctx), milestoneUnlocked: unlocked, finished: ctx.progress.completedWeeks.length >= total });
});

r.post('/celebrate', (req, res) => {
  const ctx = current(req.user.id);
  const m = Number(req.body?.month);
  if (m && !ctx.progress.celebrated.includes(m)) ctx.progress.celebrated.push(m);
  saveProgress(ctx.roadmap.id, ctx.progress);
  res.json(payload(ctx));
});

r.get('/statistics', (req, res) => {
  const ctx = current(req.user.id);
  const s = statsOut(computeStats(ctx.roadmap, ctx.progress));
  const byMonth = {};
  for (const x of ctx.progress.incomeLog) { const k = x.date.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + x.amount; }
  const weekly = ctx.roadmap.months.flatMap((m) => m.weeks || []).filter((w) => w.weekNumber <= s.currentWeek).map((w) => ({
    week: w.weekNumber, done: w.actions.filter((a) => ctx.progress.completedActions[a.id]).length, total: w.actions.length,
  }));
  res.json({ stats: s, incomeByMonth: byMonth, weekly });
});

r.get('/:userId', selfOnly(), (req, res) => res.json(payload(current(req.user.id))));

export default r;
