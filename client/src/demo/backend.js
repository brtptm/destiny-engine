// Browser-only backend for the demo build (VITE_DEMO=1). It implements the same API as the Node server,
// on top of the same planning engine, progress maths and demo journey (imported from server/src), and keeps
// everything in localStorage. No network, no keys — the AI tier is the built-in engine.
import * as engine from '@server/ai/engine.js';
import { computeStats, statsOut, emptyProgress } from '@server/lib/stats.js';
import { TEMPLATES, getTemplate } from '@server/data/templates.js';
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME, buildDemoJourney } from '@server/data/demo.js';

const KEY = 'de-demo-db-v2';
const DEFAULT_SETTINGS = { theme: 'dark', coachingTime: 'morning', emailNotifications: true, pushNotifications: true, weeklySummary: true };
const blank = () => ({ users: {}, profiles: {}, dreams: [], roadmaps: [], progress: {}, messages: [], adaptations: {} });

function load() {
  try { return { ...blank(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return blank(); }
}
let db = null; // loaded on first call, so importing this module has no side effects (and tree-shakes away)
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked: keep working in memory */ } };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const now = () => new Date().toISOString();
const clone = (v) => (v === undefined ? v : structuredClone(v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const emailOk = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Same response shapes as the server (lib/auth.js publicUser, lib/state.js *Out).
const publicUser = (u) => u && { id: u.id, email: u.email, name: u.name, settings: u.settings, createdAt: u.createdAt };
const dreamOut = (d) => d && { id: d.id, userId: d.userId, description: d.description, dreamType: d.dreamType, templateId: d.templateId, status: d.status, feasibility: d.feasibility, createdAt: d.createdAt };
const roadmapOut = (r) => r && { id: r.id, dreamId: r.dreamId, version: r.version, source: r.source, createdAt: r.createdAt, updatedAt: r.updatedAt, ...r.data };
const messageOut = (m) => ({ ...m });

/** Wraps a handler: realistic latency, the signed-in user, deep copies out, and a save after writes. */
function handler(fn, { ms = 220, auth = true, write = false } = {}) {
  return async (...args) => {
    await wait(ms);
    db = load(); // other tabs may have written
    let user = null;
    if (auth) {
      const token = getToken();
      user = token?.startsWith('demo.') && db.users[token.slice(5)];
      if (!user) {
        if (token) { setToken(null); location.assign(`${import.meta.env.BASE_URL}signin`); }
        fail(401, 'Sign in to continue.');
      }
    }
    const out = await fn(user, ...args);
    if (write) save();
    return clone(out);
  };
}

let getToken = () => null, setToken = () => {};

// ---------------------------------------------------------------- state helpers (mirror lib/state.js)

const profileOf = (userId) => db.profiles[userId] || null;
const requireProfile = (userId) => profileOf(userId) || fail(400, 'Complete your life profile first.');
const activeDream = (userId) => db.dreams.filter((d) => d.userId === userId && d.status === 'active').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
const getDream = (id, userId) => db.dreams.find((d) => d.id === id && d.userId === userId) || fail(404, 'Dream not found.');
const roadmapRow = (id, userId) => db.roadmaps.find((r) => r.id === id && r.userId === userId) || fail(404, 'Roadmap not found.');
const roadmapForDream = (dreamId) => db.roadmaps.filter((r) => r.dreamId === dreamId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;

function saveRoadmap(roadmap, { userId, dreamId, source, id }) {
  const { id: _i, dreamId: _d, version: _v, source: _s, createdAt: _c, updatedAt: _u, ...data } = roadmap;
  if (id) {
    const r = db.roadmaps.find((x) => x.id === id);
    Object.assign(r, { data, source, version: r.version + 1, updatedAt: now() });
    return id;
  }
  const row = { id: uid(), dreamId, userId, data, source, version: 1, createdAt: now(), updatedAt: now() };
  db.roadmaps.push(row);
  return row.id;
}
function getProgress(roadmapId) {
  if (!db.progress[roadmapId]) db.progress[roadmapId] = { id: uid(), ...emptyProgress(), updatedAt: now() };
  return { ...emptyProgress(), ...db.progress[roadmapId] };
}
const saveProgress = (roadmapId, p) => { db.progress[roadmapId] = { ...p, updatedAt: now() }; };

function current(user) {
  const dream = activeDream(user.id);
  const row = dream && roadmapForDream(dream.id);
  if (!row) fail(404, 'Generate a roadmap to start tracking progress.');
  const roadmap = roadmapOut(row);
  return { dream, roadmap, progress: getProgress(row.id), profile: requireProfile(user.id).data };
}
const payload = ({ roadmap, progress }) => ({ progress, stats: statsOut(computeStats(roadmap, progress)) });

// ---------------------------------------------------------------- demo account

function seedDemo() {
  const old = Object.values(db.users).find((u) => u.email === DEMO_EMAIL);
  if (old) removeUser(old.id);
  const j = buildDemoJourney();
  const user = { id: uid(), email: DEMO_EMAIL, name: DEMO_NAME, password: DEMO_PASSWORD, settings: { ...DEFAULT_SETTINGS }, createdAt: now() };
  db.users[user.id] = user;
  db.profiles[user.id] = { id: uid(), userId: user.id, data: j.profile, analysis: j.analysis, updatedAt: now() };
  const dream = { id: uid(), userId: user.id, description: j.dream, dreamType: j.feasibility.archetype, templateId: j.templateId, status: 'active', feasibility: j.feasibility, createdAt: now() };
  db.dreams.push(dream);
  const rid = saveRoadmap(j.roadmap, { userId: user.id, dreamId: dream.id, source: 'engine' });
  db.progress[rid] = { id: uid(), ...j.progress, updatedAt: now() };
  for (const m of j.messages) {
    db.messages.push({ id: uid(), userId: user.id, date: m.at.toISOString().slice(0, 10), type: m.type, message: m.message, actionSuggested: m.action, resource: '', emoji: m.emoji, relevanceScore: 0.9, read: true, archived: false, feedback: null, source: 'engine', timestamp: m.at.toISOString() });
  }
  return user;
}
function removeUser(userId) {
  const roadmapIds = db.roadmaps.filter((r) => r.userId === userId).map((r) => r.id);
  delete db.users[userId]; delete db.profiles[userId];
  db.dreams = db.dreams.filter((d) => d.userId !== userId);
  db.roadmaps = db.roadmaps.filter((r) => r.userId !== userId);
  roadmapIds.forEach((id) => delete db.progress[id]);
  db.messages = db.messages.filter((m) => m.userId !== userId);
  for (const [id, a] of Object.entries(db.adaptations)) if (a.userId === userId) delete db.adaptations[id];
}

// ---------------------------------------------------------------- coaching (mirror routes/coaching.js)

function dailyMessage(user, { force = false } = {}) {
  const today = now().slice(0, 10);
  if (!force) {
    const existing = db.messages.filter((m) => m.userId === user.id && m.date === today && m.type !== 'advice').sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    if (existing) return messageOut(existing);
  }
  const ctx = current(user);
  const stats = computeStats(ctx.roadmap, ctx.progress);
  const history = db.messages.filter((m) => m.userId === user.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 5).map((m) => ({ type: m.type }));
  const data = engine.generateDailyCoaching({ profile: ctx.profile, roadmap: ctx.roadmap, stats, today: now(), history });
  const m = { id: uid(), userId: user.id, date: today, type: data.type, message: data.message, actionSuggested: data.actionSuggested || '', resource: data.resource || '', emoji: data.emoji || '', relevanceScore: data.relevanceScore ?? 0.9, read: false, archived: false, feedback: null, source: 'engine', timestamp: now() };
  db.messages.push(m);
  return messageOut(m);
}

async function applyAdaptation(user, roadmapId, adaptationId) {
  const row = roadmapRow(roadmapId, user.id);
  const roadmap = roadmapOut(row);
  const a = db.adaptations[adaptationId];
  if (!a || a.roadmapId !== row.id) fail(404, 'Course correction not found.');
  if (a.applied) fail(409, 'This course correction is already applied.');
  const dream = getDream(roadmap.dreamId, user.id);
  const progress = getProgress(row.id);
  const data = engine.adaptRoadmap({ roadmap, advice: a.advice, profile: requireProfile(user.id).data, dream: dream.description, feasibility: dream.feasibility, currentWeek: progress.currentWeek });
  saveRoadmap(data, { id: row.id, source: row.source });
  a.applied = true;
  progress.completedWeeks = progress.completedWeeks.filter((w) => w <= data.totalMonths * 4);
  saveProgress(row.id, progress);
  return { roadmap: roadmapOut(roadmapRow(row.id, user.id)) };
}

// ---------------------------------------------------------------- the API (same method names as lib/api.js)

export function createDemoApi(tokens) {
  getToken = tokens.get; setToken = tokens.set;
  const open = { auth: false };
  const w = { write: true };

  return {
    health: handler(() => ({ ok: true, demo: true, ai: { enabled: false, provider: 'engine', model: null } }), open),

    register: handler((_, { email, password, name } = {}) => {
      if (!emailOk(email)) fail(400, 'Enter a valid email address.');
      if (!password || password.length < 8) fail(400, 'Use a password with at least 8 characters.');
      if (!name?.trim()) fail(400, 'Tell us your name.');
      if (Object.values(db.users).some((u) => u.email === email.toLowerCase())) fail(409, 'An account with this email already exists. Sign in instead.');
      const user = { id: uid(), email: email.toLowerCase(), name: name.trim(), password, settings: { ...DEFAULT_SETTINGS }, createdAt: now() };
      db.users[user.id] = user;
      return { token: `demo.${user.id}`, user: publicUser(user) };
    }, { ...open, ...w, ms: 400 }),

    login: handler((_, { email, password } = {}) => {
      let user = emailOk(email) && Object.values(db.users).find((u) => u.email === email.toLowerCase());
      if (!user && email?.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) user = seedDemo();
      if (!user || user.password !== password) fail(401, 'Email or password is incorrect.');
      return { token: `demo.${user.id}`, user: publicUser(user) };
    }, { ...open, ...w, ms: 400 }),

    demo: handler(() => {
      const user = Object.values(db.users).find((u) => u.email === DEMO_EMAIL) || seedDemo();
      return { token: `demo.${user.id}`, user: publicUser(user) };
    }, { ...open, ...w, ms: 400 }),

    logout: handler(() => ({ ok: true }), open),

    updateSettings: handler((user, body = {}) => {
      for (const k of ['theme', 'coachingTime', 'emailNotifications', 'pushNotifications', 'weeklySummary']) if (k in body) user.settings[k] = body[k];
      if (typeof body.name === 'string' && body.name.trim()) user.name = body.name.trim();
      return { user: publicUser(user) };
    }, w),

    exportData: handler((user) => ({
      exportedAt: now(), user: publicUser(user), profile: profileOf(user.id),
      dreams: db.dreams.filter((d) => d.userId === user.id), roadmaps: db.roadmaps.filter((r) => r.userId === user.id),
      progress: db.roadmaps.filter((r) => r.userId === user.id).map((r) => db.progress[r.id]).filter(Boolean),
      coaching: db.messages.filter((m) => m.userId === user.id),
    })),

    deleteAccount: handler((user) => {
      if (user.email === DEMO_EMAIL) fail(400, 'The demo account can be reset, not deleted.');
      removeUser(user.id);
      return { ok: true };
    }, w),

    dashboard: handler((user) => {
      const profile = profileOf(user.id);
      const dream = activeDream(user.id);
      const row = dream ? roadmapForDream(dream.id) : null;
      const roadmap = roadmapOut(row);
      const progress = row ? getProgress(row.id) : null;
      const stage = !profile ? 'profile' : !dream ? 'dream' : !roadmap ? 'roadmap' : 'active';
      return { user: publicUser(user), stage, profile, dream: dreamOut(dream), roadmap, progress, stats: roadmap ? statsOut(computeStats(roadmap, progress)) : null };
    }, { ms: 120 }),

    saveProfile: handler((user, data) => {
      if (!data || typeof data !== 'object') fail(400, 'Send your profile answers as JSON.');
      const profile = engine.normalizeProfile(data);
      const analysis = { ...engine.analyzeLifeProfile(profile), source: 'engine' };
      db.profiles[user.id] = { id: db.profiles[user.id]?.id || uid(), userId: user.id, data: profile, analysis, updatedAt: now() };
      return { profile: db.profiles[user.id] };
    }, { ...w, ms: 600 }),

    createDream: handler((user, { description, templateId } = {}) => {
      const tpl = templateId ? getTemplate(templateId) : null;
      const text = (description || tpl?.dream || '').trim();
      if (text.length < 8) fail(400, 'Describe your dream in a sentence or pick a template.');
      if (text.length > 600) fail(400, 'Keep your dream under 600 characters.');
      const profile = requireProfile(user.id);
      const type = tpl && text === tpl.dream ? tpl.archetype : engine.classifyDream(text);
      const feasibility = { ...engine.analyzeDreamFeasibility(profile.data, text, type), source: 'engine' };
      db.dreams.forEach((d) => { if (d.userId === user.id && d.status === 'active') d.status = 'archived'; });
      const dream = { id: uid(), userId: user.id, description: text, dreamType: feasibility.archetype, templateId: tpl?.id || null, status: 'active', feasibility, createdAt: now() };
      db.dreams.push(dream);
      return { dream: dreamOut(dream) };
    }, { ...w, ms: 900 }),

    templates: handler((_, params = {}) => {
      const q = (params.q || '').toString().toLowerCase();
      const cat = (params.category || '').toString();
      const list = TEMPLATES.filter((t) => (!cat || t.archetype === cat) && (!q || `${t.title} ${t.dream} ${t.category}`.toLowerCase().includes(q)));
      return { templates: list, total: list.length };
    }, { ...open, ms: 80 }),

    generateRoadmap: handler((user, dreamId, force) => {
      const dream = dreamId ? getDream(dreamId, user.id) : activeDream(user.id);
      if (!dream) fail(400, 'Add a dream before generating a roadmap.');
      const existing = roadmapForDream(dream.id);
      if (existing && !force) return { roadmap: roadmapOut(existing) };
      const data = engine.generateRoadmap(requireProfile(user.id).data, dream.description, dream.feasibility);
      const id = saveRoadmap(data, { userId: user.id, dreamId: dream.id, source: 'engine' });
      getProgress(id);
      return { roadmap: roadmapOut(roadmapRow(id, user.id)) };
    }, { ...w, ms: 1400 }),

    // Personalising a month needs Claude; the demo build's engine plan is already complete.
    planMonth: handler((user, roadmapId) => ({ roadmap: roadmapOut(roadmapRow(roadmapId, user.id)), source: 'engine' })),

    applyAdaptation: handler((user, roadmapId, adaptationId) => applyAdaptation(user, roadmapId, adaptationId), { ...w, ms: 900 }),

    toggleAction: handler((user, actionId, done = true) => {
      const ctx = current(user);
      const exists = ctx.roadmap.months.some((m) => (m.weeks || []).some((wk) => wk.actions.some((a) => a.id === actionId)));
      if (!exists) fail(404, 'Action not found in your roadmap.');
      if (done) ctx.progress.completedActions[actionId] = { completedAt: now(), note: '' };
      else delete ctx.progress.completedActions[actionId];
      saveProgress(ctx.roadmap.id, ctx.progress);
      return payload(ctx);
    }, { ...w, ms: 90 }),

    completeWeek: handler((user) => {
      const ctx = current(user);
      const total = ctx.roadmap.totalMonths * 4;
      const wk = ctx.progress.currentWeek;
      if (!ctx.progress.completedWeeks.includes(wk)) ctx.progress.completedWeeks.push(wk);
      ctx.progress.currentWeek = Math.min(total, wk + 1);
      saveProgress(ctx.roadmap.id, ctx.progress);
      const after = computeStats(ctx.roadmap, ctx.progress);
      return { ...payload(ctx), milestoneUnlocked: after.justHitMilestone ? after.achievedMilestones.at(-1) : null, finished: ctx.progress.completedWeeks.length >= total };
    }, w),

    celebrate: handler((user, month) => {
      const ctx = current(user);
      const m = Number(month);
      if (m && !ctx.progress.celebrated.includes(m)) ctx.progress.celebrated.push(m);
      saveProgress(ctx.roadmap.id, ctx.progress);
      return payload(ctx);
    }, w),

    logProgress: handler((user, { incomeAmount, incomeSource, savingsAmount, date, note } = {}) => {
      const ctx = current(user);
      const d = (date || now()).slice(0, 10);
      if (incomeAmount != null) {
        const amt = Number(incomeAmount);
        if (!Number.isFinite(amt) || amt <= 0) fail(400, 'Enter an income amount greater than zero.');
        ctx.progress.incomeLog.push({ date: d, amount: amt, source: incomeSource || 'dream income', note: note || '' });
      }
      if (savingsAmount != null) {
        const amt = Number(savingsAmount);
        if (!Number.isFinite(amt)) fail(400, 'Enter a valid savings amount.');
        ctx.progress.savingsLog.push({ date: d, amount: amt, note: note || '' });
      }
      saveProgress(ctx.roadmap.id, ctx.progress);
      return payload(ctx);
    }, w),

    statistics: handler((user) => {
      const ctx = current(user);
      const s = statsOut(computeStats(ctx.roadmap, ctx.progress));
      const incomeByMonth = {};
      for (const x of ctx.progress.incomeLog) { const k = x.date.slice(0, 7); incomeByMonth[k] = (incomeByMonth[k] || 0) + x.amount; }
      const weekly = ctx.roadmap.months.flatMap((m) => m.weeks || []).filter((wk) => wk.weekNumber <= s.currentWeek)
        .map((wk) => ({ week: wk.weekNumber, done: wk.actions.filter((a) => ctx.progress.completedActions[a.id]).length, total: wk.actions.length }));
      return { stats: s, incomeByMonth, weekly };
    }, { ms: 120 }),

    dailyMessage: handler((user, refresh) => ({ message: dailyMessage(user, { force: !!refresh }) }), { ...w, ms: 500 }),

    coachingHistory: handler((user, archived) => ({
      messages: db.messages.filter((m) => m.userId === user.id && !!m.archived === !!archived).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100).map(messageOut),
    }), { ms: 120 }),

    coachingFeedback: handler((user, { messageId, feedback, read, archived } = {}) => {
      const m = db.messages.find((x) => x.id === messageId && x.userId === user.id) || fail(404, 'Message not found.');
      if (feedback !== undefined) m.feedback = ['helpful', 'not-helpful'].includes(feedback) ? feedback : null;
      if (read !== undefined) m.read = !!read;
      if (archived !== undefined) m.archived = !!archived;
      return { message: messageOut(m) };
    }, w),

    issues: handler(() => ({ issues: engine.ISSUE_TYPES }), { ...open, ms: 60 }),

    requestAdvice: handler((user, { issue, details } = {}) => {
      if (!issue) fail(400, 'Pick what is blocking you.');
      if (details && details.length > 1000) fail(400, 'Keep the description under 1000 characters.');
      const ctx = current(user);
      const stats = statsOut(computeStats(ctx.roadmap, ctx.progress));
      const advice = engine.requestAdvice({ issue, details, roadmap: ctx.roadmap, stats });
      const preview = engine.previewAdaptation({ roadmap: ctx.roadmap, advice, profile: ctx.profile, dream: ctx.dream.description, feasibility: ctx.dream.feasibility, currentWeek: stats.currentWeek });
      advice.feasibility = preview.feasibility;
      advice.preview = { milestoneShifts: preview.milestoneShifts, lockedWeeks: preview.lockedWeeks, fromMonths: preview.fromMonths, toMonths: preview.toMonths };
      const id = uid();
      db.adaptations[id] = { userId: user.id, roadmapId: ctx.roadmap.id, issue, details: details || '', advice, applied: false };
      return { adaptationId: id, roadmapId: ctx.roadmap.id, advice, source: 'engine' };
    }, { ...w, ms: 1200 }),

    /** Demo-only: put Bharat's journey back to day one of the demo. */
    resetDemo: handler(() => {
      const user = seedDemo();
      return { token: `demo.${user.id}`, user: publicUser(user) };
    }, { ...open, ...w, ms: 300 }),
  };
}
