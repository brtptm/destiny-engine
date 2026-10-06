// Seeds a ready-to-explore demo account (the "Move to Goa" story from the brief).
// The journey itself is built in data/demo.js, which the browser-only demo build shares.
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { db, json, uid } from './db.js';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME, buildDemoJourney } from './data/demo.js';

export { DEMO_EMAIL, DEMO_PASSWORD };

export async function ensureDemoUser({ reset = false } = {}) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL);
  if (existing && !reset) return existing.id;
  if (existing) db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);

  const j = buildDemoJourney();
  const userId = uid();
  db.prepare('INSERT INTO users (id, email, name, password_hash, settings) VALUES (?, ?, ?, ?, ?)').run(
    userId, DEMO_EMAIL, DEMO_NAME, await bcrypt.hash(DEMO_PASSWORD, 10),
    json.str({ theme: 'dark', coachingTime: 'morning', emailNotifications: true, pushNotifications: true, weeklySummary: true }),
  );
  db.prepare('INSERT INTO life_profiles (id, user_id, data, analysis) VALUES (?, ?, ?, ?)').run(uid(), userId, json.str(j.profile), json.str(j.analysis));

  const dreamId = uid();
  db.prepare('INSERT INTO dreams (id, user_id, description, dream_type, template_id, feasibility) VALUES (?, ?, ?, ?, ?, ?)')
    .run(dreamId, userId, j.dream, j.feasibility.archetype, j.templateId, json.str(j.feasibility));

  const roadmapId = uid();
  db.prepare('INSERT INTO roadmaps (id, dream_id, user_id, data, source) VALUES (?, ?, ?, ?, ?)').run(roadmapId, dreamId, userId, json.str(j.roadmap), 'engine');
  db.prepare('INSERT INTO progress (id, user_id, roadmap_id, data) VALUES (?, ?, ?, ?)').run(uid(), userId, roadmapId, json.str(j.progress));

  for (const m of j.messages) {
    db.prepare('INSERT INTO coaching_messages (id, user_id, date, type, message, action_suggested, emoji, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)')
      .run(uid(), userId, m.at.toISOString().slice(0, 10), m.type, m.message, m.action, m.emoji, m.at.toISOString().replace('T', ' ').slice(0, 19));
  }
  return userId;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await ensureDemoUser({ reset: true });
  console.log(`Demo account ready → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}
