import { Router } from 'express';
import { requireAuth, publicUser } from '../lib/auth.js';
import { getProfileRow, getActiveDream, getRoadmapForDream, getProgress, computeStats, statsOut } from '../lib/state.js';

const r = Router();

/** One call that tells the client where the user is in the journey. */
r.get('/', requireAuth, (req, res) => {
  const profile = getProfileRow(req.user.id);
  const dream = getActiveDream(req.user.id);
  const roadmap = dream ? getRoadmapForDream(dream.id) : null;
  const progress = roadmap ? getProgress(roadmap.id, req.user.id) : null;
  const stage = !profile ? 'profile' : !dream ? 'dream' : !roadmap ? 'roadmap' : 'active';
  res.json({ user: publicUser(req.user), stage, profile, dream, roadmap, progress, stats: roadmap ? statsOut(computeStats(roadmap, progress)) : null });
});

export default r;
