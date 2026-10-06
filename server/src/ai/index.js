// AI orchestration: every function computes a grounded baseline with the
// engine, then (if Claude is configured) asks Claude to personalise it.
// Any Claude failure falls back to the engine result — the app never breaks.
import crypto from 'node:crypto';
import * as engine from './engine.js';
import { askJSON, cached, aiStatus } from './claude.js';

export { aiStatus };
export const { classifyDream, normalizeProfile, ISSUE_TYPES } = engine;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const hash = (...parts) => crypto.createHash('sha1').update(JSON.stringify(parts)).digest('hex');
const J = (v) => JSON.stringify(v, null, 1);
const isNum = (v) => Number.isFinite(Number(v));
const score = (v, fb) => (isNum(v) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : fb);
const arr = (v, fb) => (Array.isArray(v) && v.length ? v.filter((x) => typeof x === 'string' && x.trim()) : fb);
const str = (v, fb) => (typeof v === 'string' && v.trim() ? v.trim() : fb);

async function withAI(label, base, fn) {
  if (!aiStatus().enabled) return { data: base, source: 'engine' };
  try {
    const data = await fn();
    return { data, source: 'claude' };
  } catch (err) {
    console.warn(`[ai] ${label} fell back to engine: ${err.message}`);
    return { data: base, source: 'engine' };
  }
}

// ------------------------------------------------------------ life profile

export async function analyzeLifeProfile(profile) {
  const p = engine.normalizeProfile(profile);
  const base = engine.analyzeLifeProfile(p);
  return withAI('analyzeLifeProfile', base, () => cached(hash('profile', p), async () => {
    const r = await askJSON(`Analyse this person's current life situation.

User profile:
${J(p)}

Pre-computed metrics (trust these numbers): ${J(base.metrics)}
Baseline scores: financialHealth=${base.financialHealth}, overallReadiness=${base.overallReadiness}

Return JSON:
{"financialHealth": 0-100, "financialAnalysis": "2-3 sentences using their numbers",
 "skillsAssessment": {"summary": "1-2 sentences", "marketValue": "high|solid|developing", "skillScores": [{"skill": "", "value": 0-100, "demand": "high|steady"}]},
 "timeAvailability": "1 sentence", "familySituation": "1 sentence", "overallReadiness": 0-100,
 "keyStrengths": ["3-5 short items"], "areasToImprove": ["2-4 short items"], "recommendations": ["3-4 specific actions"]}`);
    const fh = score(r.financialHealth, base.financialHealth);
    const rd = score(r.overallReadiness, base.overallReadiness);
    return {
      ...base,
      financialHealth: fh,
      overallReadiness: rd,
      feasibilityIndex: Math.round((fh + rd) / 2),
      financialAnalysis: str(r.financialAnalysis, base.financialAnalysis),
      skillsAssessment: {
        summary: str(r.skillsAssessment?.summary, base.skillsAssessment.summary),
        marketValue: str(r.skillsAssessment?.marketValue, base.skillsAssessment.marketValue),
        skillScores: Array.isArray(r.skillsAssessment?.skillScores) && r.skillsAssessment.skillScores.length
          ? r.skillsAssessment.skillScores.slice(0, 8).map((s) => ({ skill: String(s.skill), value: score(s.value, 60), demand: s.demand === 'high' ? 'high' : 'steady' }))
          : base.skillsAssessment.skillScores,
      },
      timeAvailability: str(r.timeAvailability, base.timeAvailability),
      familySituation: str(r.familySituation, base.familySituation),
      keyStrengths: arr(r.keyStrengths, base.keyStrengths).slice(0, 5),
      areasToImprove: arr(r.areasToImprove, base.areasToImprove).slice(0, 4),
      recommendations: arr(r.recommendations, base.recommendations).slice(0, 4),
    };
  }));
}

// ------------------------------------------------------------ feasibility

export async function analyzeDreamFeasibility(profile, dream, archetype) {
  const p = engine.normalizeProfile(profile);
  const base = engine.analyzeDreamFeasibility(p, dream, archetype);
  return withAI('analyzeDreamFeasibility', base, () => cached(hash('feas', p, dream, archetype), async () => {
    const r = await askJSON(`Evaluate whether this person can achieve their dream.

User profile:
${J(p)}

Dream: "${dream}"
Dream category: ${base.archetypeLabel}

A deterministic model computed this baseline (use as grounding, adjust with judgement):
${J({ percent: base.feasibilityPercent, components: Object.fromEntries(Object.entries(base.components).map(([k, v]) => [k, v.score])), timeline: base.components.timeline, fundingGap: base.components.financial.fundingGap })}

Return JSON:
{"feasibilityPercent": 0-100, "confidenceLevel": "low|medium|high|very-high",
 "components": {
   "financial": {"score": 0-100, "explanation": "1-2 sentences with numbers"},
   "skills": {"score": 0-100, "explanation": ""},
   "family": {"score": 0-100, "explanation": ""},
   "location": {"score": 0-100, "explanation": ""},
   "market": {"score": 0-100, "explanation": ""},
   "timeline": {"score": 0-100, "explanation": "", "minMonths": int, "recommendedMonths": int, "maxMonths": int}
 },
 "keyObstacles": ["3-4 specific obstacles"], "successFactors": ["3-4"], "recommendations": ["3 specific next steps"],
 "verdict": "one encouraging, honest sentence",
 "successStory": {"name": "first name + initial", "age": int, "from": "city", "outcome": "1 sentence anonymised story of someone with a similar profile achieving a similar dream", "quote": "short quote"}}
Keep recommendedMonths between 3 and 18.`);
    const comps = {};
    for (const [k, v] of Object.entries(base.components)) {
      const c = r.components?.[k] || {};
      const s = score(c.score, v.score);
      comps[k] = { ...v, score: s, viable: s >= 55, explanation: str(c.explanation, v.explanation) };
    }
    const t = r.components?.timeline || {};
    const rec = isNum(t.recommendedMonths) ? Math.max(3, Math.min(18, Math.round(t.recommendedMonths))) : base.components.timeline.recommendedMonths;
    comps.timeline = {
      ...comps.timeline,
      recommendedMonths: rec,
      minMonths: isNum(t.minMonths) ? Math.min(rec, Math.round(t.minMonths)) : Math.min(rec, base.components.timeline.minMonths),
      maxMonths: isNum(t.maxMonths) ? Math.max(rec, Math.round(t.maxMonths)) : Math.max(rec, base.components.timeline.maxMonths),
    };
    const pct = score(r.feasibilityPercent, base.feasibilityPercent);
    const story = r.successStory && r.successStory.outcome ? { ...base.successStory, ...r.successStory } : base.successStory;
    return {
      ...base,
      feasibilityPercent: pct,
      overallFeasibility: +(pct / 100).toFixed(2),
      confidenceLevel: ['low', 'medium', 'high', 'very-high'].includes(r.confidenceLevel) ? r.confidenceLevel : base.confidenceLevel,
      components: comps,
      keyObstacles: arr(r.keyObstacles, base.keyObstacles).slice(0, 4),
      successFactors: arr(r.successFactors, base.successFactors).slice(0, 4),
      recommendations: arr(r.recommendations, base.recommendations).slice(0, 4),
      estimatedTimeline: rec,
      verdict: str(r.verdict, base.verdict),
      successStory: story,
    };
  }));
}

// ------------------------------------------------------------ roadmap

function normalizeWeeks(weeks, month, fallback) {
  if (!Array.isArray(weeks) || weeks.length < 1) return fallback;
  return fallback.map((fw, wi) => {
    const w = weeks[wi];
    if (!w || !Array.isArray(w.actions) || !w.actions.length) return fw;
    const actions = DAYS.map((day, d) => {
      const a = w.actions.find((x) => x.day === day) || w.actions[d];
      if (!a || !a.action) return fw.actions[d];
      return {
        id: `m${month}w${wi + 1}d${d}`,
        day,
        action: String(a.action),
        timeEstimate: str(String(a.timeEstimate ?? ''), fw.actions[d].timeEstimate),
        resource: str(a.resource, ''),
        successMetric: str(a.successMetric, fw.actions[d].successMetric),
        importance: ['critical', 'important', 'helpful'].includes(a.importance) ? a.importance : 'important',
      };
    });
    return { ...fw, weeklyGoal: str(w.weeklyGoal, fw.weeklyGoal), expectedOutcome: str(w.expectedOutcome, fw.expectedOutcome), actions };
  });
}

const WEEK_SCHEMA = `{"weeklyGoal": "", "expectedOutcome": "", "actions": [7 items, Monday..Sunday: {"day": "Monday", "action": "specific task", "timeEstimate": "1.5h", "resource": "tool/template/link", "successMetric": "how to know it's done", "importance": "critical|important|helpful"}]}`;

export async function generateRoadmap(profile, dream, feasibility) {
  const p = engine.normalizeProfile(profile);
  const base = engine.generateRoadmap(p, dream, feasibility);
  return withAI('generateRoadmap', base, async () => {
    const r = await askJSON(`Create a personalised roadmap for this dream.

User profile:
${J(p)}

Dream: "${dream}"
Feasibility: ${feasibility?.feasibilityPercent}% — obstacles: ${J(feasibility?.keyObstacles || [])}
Total months: ${base.totalMonths} (fixed). Phase skeleton: ${J(base.phases.map((x) => ({ name: x.name, months: x.months })))}
Daily time available: ${p.personal.availableHours}h.

Return JSON:
{"dreamSummary": "1 sentence",
 "phases": [{"name": "", "description": "", "goal": ""}]  (same count and order as the skeleton),
 "months": [{"month": 1, "title": "short evocative title", "focus": "1 sentence", "goal": "measurable goal", "milestone": {"title": "", "significance": ""} or null}]  (exactly ${base.totalMonths} items),
 "month1Weeks": [4 items of ${WEEK_SCHEMA}],
 "financialProjection": {"targetMonthlyIncome": int, "byMonth": [{"month": 1, "income": int, "expenses": int}] (exactly ${base.totalMonths} items, realistic ramp from ₹${p.financial.monthlyIncome}/₹${p.financial.monthlyExpenses})},
 "riskAnalysis": {"obstacles": [{"obstacle": "", "likelihood": "low|medium|high", "mitigation": ""}] (3-5)},
 "resources": {"tools": [{"name": "", "type": "free|paid"}], "communities": [""], "courses": [""], "people": [""]},
 "successFactors": ["3-4"], "motivationalMessage": "2 sentences, personal"}
Sunday's action each week should be a short weekly review.`, { effort: 'medium', maxTokens: 16000 });

    const out = structuredClone(base);
    out.dreamSummary = str(r.dreamSummary, base.dreamSummary);
    if (Array.isArray(r.phases)) out.phases = out.phases.map((ph, i) => ({ ...ph, name: str(r.phases[i]?.name, ph.name), description: str(r.phases[i]?.description, ph.description), goal: str(r.phases[i]?.goal, ph.goal) }));
    const phaseName = Object.fromEntries(out.phases.flatMap((ph) => ph.months.map((m) => [m, ph.name])));
    out.months = out.months.map((m) => {
      const c = Array.isArray(r.months) ? r.months.find((x) => Number(x.month) === m.month) : null;
      const next = { ...m, phase: phaseName[m.month] || m.phase };
      if (c) {
        next.title = str(c.title, m.title);
        next.focus = str(c.focus, m.focus);
        next.goal = str(c.goal, m.goal);
        if (c.milestone?.title) next.milestone = { title: c.milestone.title, significance: str(c.milestone.significance, '') };
      }
      if (m.month === 1) { next.weeks = normalizeWeeks(r.month1Weeks, 1, m.weeks); next.weeksSource = 'claude'; }
      return next;
    });
    const by = r.financialProjection?.byMonth;
    if (Array.isArray(by) && by.length >= out.totalMonths) {
      let cumulative = p.financial.savings;
      out.financialProjection.byMonth = out.financialProjection.byMonth.map((b, i) => {
        const income = isNum(by[i]?.income) ? Math.round(by[i].income) : b.income;
        const expenses = isNum(by[i]?.expenses) ? Math.round(by[i].expenses) : b.expenses;
        cumulative += income - expenses;
        return { month: b.month, income, expenses, savings: income - expenses, cumulative: Math.round(cumulative) };
      });
      const last = out.financialProjection.byMonth.at(-1);
      out.financialProjection.totalWealthGain = Math.round(last.cumulative - p.financial.savings);
      out.financialProjection.endSavingsRate = last.income ? Math.round((last.savings / last.income) * 100) : 0;
      if (isNum(r.financialProjection.targetMonthlyIncome)) out.financialProjection.targetMonthlyIncome = Math.round(r.financialProjection.targetMonthlyIncome);
      out.months = out.months.map((m) => ({ ...m, financial: out.financialProjection.byMonth[m.month - 1] }));
    }
    out.milestones = out.months.filter((m) => m.milestone).map((m) => ({ month: m.month, milestone: m.milestone.title, significance: m.milestone.significance }));
    if (Array.isArray(r.riskAnalysis?.obstacles) && r.riskAnalysis.obstacles.length) out.riskAnalysis.obstacles = r.riskAnalysis.obstacles.filter((o) => o.obstacle).slice(0, 5);
    if (r.resources) {
      for (const k of ['communities', 'courses', 'people']) out.resources[k] = arr(r.resources[k], out.resources[k]);
      if (Array.isArray(r.resources.tools) && r.resources.tools.length) out.resources.tools = r.resources.tools.filter((t) => t.name).map((t) => ({ name: t.name, type: t.type === 'paid' ? 'paid' : 'free' }));
    }
    out.successFactors = arr(r.successFactors, out.successFactors);
    out.motivationalMessage = str(r.motivationalMessage, out.motivationalMessage);
    return out;
  });
}

/** Personalise one month's 4 weekly plans with Claude (lazy, on demand). */
export async function generateWeeklyPlan(roadmap, monthNumber, profile, progressSummary) {
  const month = roadmap.months.find((m) => m.month === monthNumber);
  if (!month) throw new Error('Month not found');
  const p = engine.normalizeProfile(profile);
  return withAI('generateWeeklyPlan', month.weeks, async () => {
    const r = await askJSON(`Write the 4 weekly action plans for month ${monthNumber} of this roadmap.

User profile:
${J(p)}

Dream: "${roadmap.dreamSummary}"
This month: ${J({ title: month.title, phase: month.phase, focus: month.focus, goal: month.goal, milestone: month.milestone, financialTarget: month.financial })}
Progress so far: ${J(progressSummary)}
Available time: ${p.personal.availableHours}h/day.

Return JSON: {"weeks": [4 items of ${WEEK_SCHEMA}]}`, { effort: 'low', maxTokens: 10000 });
    return normalizeWeeks(r.weeks, monthNumber, month.weeks);
  });
}

// ------------------------------------------------------------ coaching

export async function generateDailyCoaching(ctx) {
  const base = engine.generateDailyCoaching(ctx);
  return withAI('generateDailyCoaching', base, async () => {
    const p = engine.normalizeProfile(ctx.profile);
    const week = ctx.roadmap.months.flatMap((m) => m.weeks || []).find((w) => w.weekNumber === ctx.stats.currentWeek);
    const r = await askJSON(`Write today's coaching message for this person.

Name: ${p.basicInfo.name || 'the user'}; job: ${p.professional.currentJob}; city: ${p.basicInfo.location}
Dream: "${ctx.roadmap.dreamSummary}" (${ctx.roadmap.totalMonths}-month plan)
Progress: week ${ctx.stats.currentWeek}, ${ctx.stats.completed}/${ctx.stats.total} actions done (${ctx.stats.percent}%), this week ${ctx.stats.weekPercent}% done, pace vs plan: ${Math.round(ctx.stats.paceDelta)}%
Income logged so far: ₹${ctx.stats.incomeTotal}
${ctx.stats.justHitMilestone ? `They just hit a milestone: ${ctx.stats.lastMilestone}` : ''}
This week's open actions: ${J((week?.actions || []).filter((a) => !ctx.stats.completedIds.has(a.id)).map((a) => `${a.day}: ${a.action}`))}
Today: ${new Date(ctx.today).toDateString()}. Recent message types: ${J((ctx.history || []).slice(0, 3).map((h) => h.type))} — vary it.
Suggested type: ${base.type}

Return JSON: {"type": "nudge|opportunity|motivation|warning|tip|celebration", "message": "2-3 sentences, personal and specific", "actionSuggested": "what to do today", "resource": "optional helpful resource", "emoji": "one emoji"}`, { effort: 'low', maxTokens: 2000 });
    const types = ['nudge', 'opportunity', 'motivation', 'warning', 'tip', 'celebration'];
    return {
      type: types.includes(r.type) ? r.type : base.type,
      message: str(r.message, base.message),
      actionSuggested: str(r.actionSuggested, base.actionSuggested),
      resource: str(r.resource, base.resource),
      emoji: str(r.emoji, base.emoji),
      relevanceScore: 0.95,
    };
  });
}

// ------------------------------------------------------------ obstacles

export async function requestAdvice({ issue, details, roadmap, stats, profile }) {
  const base = engine.requestAdvice({ issue, details, roadmap, stats });
  return withAI('requestAdvice', base, async () => {
    const p = engine.normalizeProfile(profile);
    const r = await askJSON(`The user hit an obstacle on their roadmap. Diagnose it and propose a course correction.

User profile: ${J(p)}
Dream: "${roadmap.dreamSummary}" — ${roadmap.totalMonths}-month plan, currently week ${stats.currentWeek}, ${stats.percent}% complete
Obstacle category: ${base.issueLabel}
In their words: "${details || '(no details)'}"

Return JSON:
{"diagnosis": "2 sentences, empathetic and specific", "likelyCauses": ["3"], "solutions": ["3 concrete solutions"],
 "alternativeActions": ["4 specific actions they can do in the next 2 weeks"], "pivotStrategies": ["1-2"],
 "timelineImpactMonths": integer between -2 and 3, "encouragement": "1 sentence"}`, { effort: 'low', maxTokens: 3000 });
    const impact = isNum(r.timelineImpactMonths) ? Math.max(-2, Math.min(3, Math.round(r.timelineImpactMonths))) : base.timelineImpactMonths;
    return {
      ...base,
      diagnosis: str(r.diagnosis, base.diagnosis),
      likelyCauses: arr(r.likelyCauses, base.likelyCauses).slice(0, 4),
      solutions: arr(r.solutions, base.solutions).slice(0, 4),
      alternativeActions: arr(r.alternativeActions, base.alternativeActions).slice(0, 5),
      pivotStrategies: arr(r.pivotStrategies, base.pivotStrategies).slice(0, 3),
      timelineImpactMonths: impact,
      newTotalMonths: Math.max(3, Math.min(18, roadmap.totalMonths + impact)),
      encouragement: str(r.encouragement, base.encouragement),
    };
  });
}

export async function adaptRoadmap(args) {
  const fresh = engine.adaptRoadmap(args);
  if (!aiStatus().enabled || args.roadmapSource !== 'claude') return { data: fresh, source: 'engine' };
  const currentMonth = Math.ceil(args.currentWeek / 4);
  return withAI('adaptRoadmap', fresh, async () => {
    const r = await askJSON(`Re-plan the remaining months of this roadmap after a course correction.

Dream: "${args.roadmap.dreamSummary}"
Course correction: ${J({ issue: args.advice.issueLabel, solutions: args.advice.solutions, newTotalMonths: fresh.totalMonths })}
Previous outline: ${J(args.roadmap.months.map((m) => ({ month: m.month, title: m.title, goal: m.goal })))}
New phase skeleton: ${J(fresh.phases.map((x) => ({ name: x.name, months: x.months })))}

Return JSON: {"months": [{"month": int, "title": "", "focus": "", "goal": "", "milestone": {"title": "", "significance": ""} or null}] for months ${currentMonth}..${fresh.totalMonths}}`, { effort: 'low', maxTokens: 6000 });
    if (Array.isArray(r.months)) {
      fresh.months = fresh.months.map((m) => {
        const c = m.month >= currentMonth && r.months.find((x) => Number(x.month) === m.month);
        if (!c) return m;
        return { ...m, title: str(c.title, m.title), focus: str(c.focus, m.focus), goal: str(c.goal, m.goal), milestone: c.milestone?.title ? { title: c.milestone.title, significance: str(c.milestone.significance, '') } : m.milestone };
      });
      fresh.milestones = fresh.months.filter((m) => m.milestone).map((m) => ({ month: m.month, milestone: m.milestone.title, significance: m.milestone.significance }));
    }
    return fresh;
  });
}
