// Deterministic, profile-driven planning engine. Every number here is derived
// from the user's own profile so results stay personal even without an LLM.
import { ARCHETYPES, STORIES } from '../data/archetypes.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const METROS = ['delhi', 'mumbai', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'pune', 'gurugram', 'gurgaon', 'noida', 'kolkata', 'ahmedabad'];
const HOT_SKILLS = ['ai', 'machine learning', 'data', 'python', 'react', 'javascript', 'cloud', 'devops', 'product', 'design', 'ux', 'digital-marketing', 'digital marketing', 'seo', 'sales', 'video', 'content', 'analytics', 'finance', 'copywriting', 'social-media', 'social media', 'cybersecurity', 'teaching'];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round = (n, to = 1000) => Math.round(n / to) * to;
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

export function normalizeProfile(p = {}) {
  const b = p.basicInfo || {}, f = p.financial || {}, pr = p.professional || {}, pe = p.personal || {};
  const income = num(f.monthlyIncome, 50000);
  return {
    basicInfo: {
      name: b.name || '', age: num(b.age, 30), location: b.location || 'your city',
      maritalStatus: b.maritalStatus || 'single', childrenCount: num(b.childrenCount, 0),
      childrenAges: b.childrenAges || [], education: b.education || '',
    },
    financial: {
      monthlyIncome: income, monthlyExpenses: num(f.monthlyExpenses, income * 0.7),
      savings: num(f.savings, 0), debts: num(f.debts, 0), investments: num(f.investments, 0),
      assets: f.assets || [], creditScore: f.creditScore ? num(f.creditScore) : null,
    },
    professional: {
      currentJob: pr.currentJob || 'professional', currentCompany: pr.currentCompany || '',
      yearsExperience: num(pr.yearsExperience, 3), skills: (pr.skills || []).filter(Boolean),
      softSkills: pr.softSkills || [], hiddenTalents: pr.hiddenTalents || '',
      remoteCapability: clamp(num(pr.remoteCapability, 0.5), 0, 1),
      growthPotential: pr.growthPotential || 'moderate',
    },
    personal: {
      healthStatus: pe.healthStatus || 'good', riskTolerance: pe.riskTolerance || 'medium',
      availableHours: num(pe.availableHours, 2), motivationLevel: clamp(num(pe.motivationLevel, 7), 1, 10),
      learningSpeed: pe.learningSpeed || 'average', familySupport: pe.familySupport || 'medium',
    },
  };
}

// ---------------------------------------------------------------- profile

export function analyzeLifeProfile(raw) {
  const p = normalizeProfile(raw);
  const { monthlyIncome: inc, monthlyExpenses: exp, savings, debts, investments } = p.financial;
  const surplus = inc - exp;
  const savingsRate = inc > 0 ? surplus / inc : 0;
  const emergencyMonths = exp > 0 ? (savings + investments * 0.5) / exp : 0;
  const debtToIncome = inc > 0 ? debts / (inc * 12) : 0;

  const finScore = Math.round(
    clamp(savingsRate / 0.4, 0, 1) * 35 +
    clamp(emergencyMonths / 6, 0, 1) * 30 +
    clamp(1 - debtToIncome / 2, 0, 1) * 20 +
    clamp(investments / (inc * 12 || 1), 0, 1) * 15,
  );

  const skills = p.professional.skills;
  const skillScores = skills.slice(0, 8).map((s) => {
    const hot = HOT_SKILLS.some((h) => s.toLowerCase().includes(h));
    return { skill: s, value: clamp(Math.round(55 + (hot ? 20 : 5) + p.professional.yearsExperience * 2), 40, 98), demand: hot ? 'high' : 'steady' };
  });
  const marketValue = skillScores.filter((s) => s.demand === 'high').length >= 2 ? 'high' : skills.length >= 3 ? 'solid' : 'developing';

  const hours = p.personal.availableHours;
  const timeScore = clamp(Math.round(hours * 25), 20, 100);
  const familyLoad = (p.basicInfo.maritalStatus === 'married' ? 1 : 0) + p.basicInfo.childrenCount;
  const learn = { fast: 15, average: 8, slow: 2 }[p.personal.learningSpeed] ?? 8;
  const readiness = Math.round(clamp(
    finScore * 0.35 + timeScore * 0.2 + p.personal.motivationLevel * 3 + learn + (skillScores.length ? 10 : 0) + p.professional.remoteCapability * 5,
    10, 99,
  ));

  const strengths = [];
  const improve = [];
  const recs = [];
  if (savingsRate >= 0.25) strengths.push(`Strong ${Math.round(savingsRate * 100)}% savings rate`);
  else { improve.push(`Savings rate is ${Math.round(savingsRate * 100)}% — aim for 25%+`); recs.push(`Free up ${inr(Math.max(0, inc * 0.25 - surplus))}/month by trimming the 3 largest discretionary expenses.`); }
  if (emergencyMonths >= 6) strengths.push(`${emergencyMonths.toFixed(1)} months of financial runway`);
  else { improve.push(`Emergency runway is ${emergencyMonths.toFixed(1)} months`); recs.push(`Build runway to 6 months (${inr(exp * 6)}) before taking big risks.`); }
  if (debtToIncome > 0.5) { improve.push('Debt is high relative to income'); recs.push('Prioritise high-interest debt with the avalanche method.'); }
  if (p.professional.yearsExperience >= 5) strengths.push(`${p.professional.yearsExperience} years of ${p.professional.currentJob} experience`);
  if (marketValue === 'high') strengths.push(`In-demand skills: ${skillScores.filter((s) => s.demand === 'high').map((s) => s.skill).slice(0, 3).join(', ')}`);
  else recs.push('Add one high-demand skill (AI tools, data, or digital marketing) to raise your market value.');
  if (p.professional.remoteCapability >= 0.7) strengths.push('Your work can largely be done remotely');
  if (p.personal.motivationLevel >= 8) strengths.push('High motivation');
  if (hours < 1.5) { improve.push(`Only ${hours}h/day available`); recs.push('Protect one fixed daily block — even 60 focused minutes compounds.'); }
  if (p.personal.learningSpeed === 'fast') strengths.push('Fast learner');
  if (!recs.length) recs.push('You are in a strong position — the main risk is waiting too long to start.');

  return {
    financialHealth: finScore,
    financialAnalysis: `You earn ${inr(inc)} and spend ${inr(exp)} a month, leaving ${inr(surplus)} (${Math.round(savingsRate * 100)}%). With ${inr(savings)} saved and ${inr(investments)} invested you have about ${emergencyMonths.toFixed(1)} months of runway${debts ? `, against ${inr(debts)} of debt` : ''}.`,
    metrics: { savingsRate: Math.round(savingsRate * 100), emergencyMonths: +emergencyMonths.toFixed(1), debtToIncome: +debtToIncome.toFixed(2), monthlySurplus: surplus },
    skillsAssessment: { summary: skills.length ? `Your strongest market asset is ${skills[0]}, backed by ${p.professional.yearsExperience} years as ${p.professional.currentJob}.` : 'Add your skills to unlock a sharper assessment.', marketValue, skillScores },
    timeAvailability: `${hours} hours/day ≈ ${Math.round(hours * 6)} focused hours a week for your dream.`,
    familySituation: familyLoad === 0 ? 'High flexibility — few dependants.' : `${familyLoad} people depend on your decisions, so the plan front-loads safety nets.`,
    overallReadiness: readiness,
    feasibilityIndex: Math.round((readiness + finScore) / 2),
    keyStrengths: strengths.slice(0, 5),
    areasToImprove: improve.slice(0, 4),
    recommendations: recs.slice(0, 4),
  };
}

// ---------------------------------------------------------------- dream

export function classifyDream(text = '') {
  const t = ' ' + text.toLowerCase() + ' ';
  let best = 'career', score = 0;
  for (const [key, a] of Object.entries(ARCHETYPES)) {
    const s = a.keywords.reduce((acc, k) => acc + (t.includes(k) ? k.length : 0), 0);
    if (s > score) { best = key; score = s; }
  }
  return best;
}

function extractPlace(text) {
  const m = text.match(/\b(?:to|in|at)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  return m ? m[1] : 'your new city';
}
function extractTarget(text) {
  const m = text.match(/(?:become (?:an? )?|switch (?:into|to) |career (?:in|into) |work as (?:an? )?)([A-Za-z/ +-]{2,40}?)(?=[,.]| and | at | in | for | building | who | with |$)/i);
  if (!m) return 'your target role';
  const role = m[1].trim().split(' ').slice(0, 4).join(' ');
  return role.split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');
}

// "Marketing Manager" → "marketing manager" mid-sentence, but keep acronyms like "SEO" or "UX".
const inline = (s) => (s || '').split(' ').map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase())).join(' ');

function ctxFor(p, dream) {
  const skills = p.professional.skills.map(inline);
  return {
    skill: skills[0] || p.professional.currentJob,
    skill2: skills[1] || skills[0] || 'your craft',
    job: inline(p.professional.currentJob),
    city: p.basicInfo.location,
    place: extractPlace(dream),
    target: extractTarget(dream),
    dream,
  };
}
const fill = (s, ctx) => (s || '').replace(/\{(\w+)\}/g, (_, k) => ctx[k] ?? '');

const WEIGHTS = { financial: 0.27, skills: 0.22, family: 0.16, location: 0.1, timeline: 0.13, market: 0.12 };
const COMPONENT_LABELS = { financial: 'Financial', skills: 'Skills', family: 'Family', location: 'Location', timeline: 'Timeline', market: 'Market demand' };
/** One weighting for the first score and every re-score, so numbers stay comparable over time. */
export const overallFeasibility = (scores) => Math.round(Object.entries(WEIGHTS).reduce((t, [k, w]) => t + (Number(scores[k]) || 0) * w, 0));

export function analyzeDreamFeasibility(raw, dream, archetypeKey) {
  const p = normalizeProfile(raw);
  const key = archetypeKey || classifyDream(dream);
  const a = ARCHETYPES[key];
  const { monthlyIncome: inc, monthlyExpenses: exp, savings, debts, investments } = p.financial;
  const surplus = Math.max(inc - exp, 0);
  const required = a.fundTarget ? a.fundTarget : a.capitalMonths * exp;
  const available = savings + investments * 0.3;
  const gap = Math.max(0, required - available);
  const monthsToFund = gap > 0 ? gap / Math.max(surplus * 0.8, 1) : 0;

  // Financial
  const debtPenalty = clamp((debts / (inc * 12 || 1)) * 10, 0, 15);
  const financial = clamp(Math.round(96 - Math.min(45, monthsToFund * 2.5) - debtPenalty), 25, 98);

  // Skills
  const userSkills = p.professional.skills.map((s) => s.toLowerCase());
  const hot = userSkills.filter((s) => HOT_SKILLS.some((h) => s.includes(h))).length;
  const learn = { fast: 10, average: 5, slow: 0 }[p.personal.learningSpeed] ?? 5;
  const skills = clamp(Math.round(52 + Math.min(18, p.professional.yearsExperience * 2) + hot * 6 + userSkills.length * 2 + learn), 35, 98);

  // Family
  const dependants = (p.basicInfo.maritalStatus === 'married' ? 1 : 0) + p.basicInfo.childrenCount;
  const support = { high: 14, medium: 6, low: -8 }[p.personal.familySupport] ?? 6;
  const disruptive = ['relocation', 'startup', 'business', 'study'].includes(key);
  const family = clamp(Math.round(84 - (disruptive ? dependants * 5 : dependants * 2) + support), 35, 98);

  // Location / market
  const metro = METROS.some((m) => p.basicInfo.location.toLowerCase().includes(m));
  const location = clamp(Math.round(key === 'relocation' ? 60 + p.professional.remoteCapability * 35 : (metro ? 88 : 74) + (p.professional.remoteCapability > 0.6 ? 6 : 0)), 35, 98);
  const market = clamp(Math.round(62 + hot * 9 + (metro ? 6 : 0) + p.professional.remoteCapability * 8), 40, 97);

  // Timeline
  const hours = p.personal.availableHours;
  let factor = 1;
  if (hours < 1.5) factor *= 1.3; else if (hours >= 3) factor *= 0.88;
  if (p.personal.learningSpeed === 'fast') factor *= 0.92;
  if (p.personal.learningSpeed === 'slow') factor *= 1.15;
  if (p.personal.motivationLevel >= 8) factor *= 0.95;
  if (skills < 60) factor *= 1.15;
  let recommended = Math.round(a.baseMonths * factor);
  recommended = Math.max(recommended, Math.ceil(monthsToFund) + 2);
  recommended = clamp(recommended, a.minMonths, a.maxMonths);
  const minMonths = Math.max(a.minMonths - 1, Math.round(recommended * 0.75));
  const maxMonths = Math.round(recommended * 1.5);
  const timeline = clamp(Math.round(95 - Math.max(0, recommended - a.baseMonths) * 4 - (hours < 1 ? 10 : 0)), 40, 97);

  const overall = overallFeasibility({ financial, skills, family, location, timeline, market });
  const confidenceLevel = overall >= 88 ? 'very-high' : overall >= 75 ? 'high' : overall >= 58 ? 'medium' : 'low';
  const ctx = ctxFor(p, dream);

  const obstacles = [];
  const noSurplus = surplus * 0.8 < 1000; // nothing left over each month yet, so "months to fund" is meaningless
  if (gap > 0) obstacles.push(noSurplus ? `A funding gap of ${inr(gap)} — and no monthly surplus yet to close it.` : `A funding gap of ${inr(gap)} — about ${Math.ceil(monthsToFund)} months of focused saving.`);
  if (skills < 65) obstacles.push(`Skills gap for this dream: ${a.skillsNeeded.slice(0, 2).join(' and ')}.`);
  if (disruptive && dependants >= 2) obstacles.push(`${dependants} family members need to be on board with the change.`);
  if (hours < 1.5) obstacles.push(`Limited time (${hours}h/day) will stretch the timeline.`);
  for (const [o] of a.risks.slice(0, 3 - Math.min(obstacles.length, 2))) obstacles.push(fill(o, ctx));

  const successFactors = [];
  const moneyDream = !['health'].includes(key);
  if (moneyDream && p.financial.savings + investments > exp * 6) successFactors.push('A solid financial cushion lets you take calculated risks.');
  if (key === 'health' && p.personal.healthStatus !== 'managing') successFactors.push(`Your health is ${p.personal.healthStatus} — a solid starting point.`);
  if (hot && moneyDream) successFactors.push(`Market demand for ${p.professional.skills.find((s) => HOT_SKILLS.some((h) => s.toLowerCase().includes(h)))}.`);
  if (p.professional.remoteCapability >= 0.7) successFactors.push('Your work already translates to remote income.');
  if (p.personal.motivationLevel >= 8) successFactors.push('Your motivation is high — the plan channels it into daily actions.');
  if (p.professional.yearsExperience >= 5) successFactors.push(`${p.professional.yearsExperience} years of credibility as ${p.professional.currentJob}.`);
  if (!successFactors.length) successFactors.push('A clear plan with weekly checkpoints — consistency beats intensity.');

  const recommendations = [
    gap > 0 && noSurplus ? 'Free up a monthly surplus first: trim your three largest expenses or add a small side income.' : gap > 0 ? `Save ${inr(Math.min(gap / Math.max(recommended - 1, 1), surplus))}/month into a dedicated dream fund.` : required > 0 ? 'Your funding is in place — protect it in a separate account.' : 'Money isn’t the constraint here — consistency is. Protect your daily time block.',
    `Spend your ${hours}h/day on the critical actions first; skip "helpful" ones in busy weeks.`,
    `Phase 1 (${a.phases[0].name}): ${fill(a.phases[0].goal, ctx)}.`,
  ];

  const explain = {
    financial: required === 0 ? 'This dream needs time more than money, and your budget comfortably covers small costs like gear or coaching.' : gap > 0 && noSurplus ? `You need about ${inr(required)} and have ${inr(available)} available. You don't have a monthly surplus yet, so the plan starts by freeing one up.` : gap > 0 ? `You need about ${inr(required)} and have ${inr(available)} available. Saving ${inr(surplus * 0.8)}/month closes the gap in ~${Math.ceil(monthsToFund)} months.` : `You already have the ${inr(required)} this dream needs. Your savings cover about ${(available / Math.max(exp, 1)).toFixed(1)} months of expenses, which carries the transition.`,
    skills: `Your ${p.professional.skills.length ? `strengths in ${p.professional.skills.slice(0, 3).join(', ')}` : 'experience'} ${skills >= 75 ? 'map well onto' : 'partly cover'} what this dream needs: ${a.skillsNeeded.join(', ')}.`,
    family: dependants ? `${dependants} dependant${dependants > 1 ? 's' : ''} and ${p.personal.familySupport} family support. ${disruptive ? 'Involve them early — the plan includes a family session.' : 'Low disruption to family life.'}` : 'Few dependants gives you high flexibility.',
    location: key === 'relocation' ? `Remote capability of ${Math.round(p.professional.remoteCapability * 100)}% determines how portable your income is.` : `${metro ? 'A metro' : 'Your city'} offers ${metro ? 'a deep' : 'a reasonable'} market for this dream.`,
    timeline: `Recommended ${recommended} months (fastest ${minMonths}, comfortable ${maxMonths}) at ${hours}h/day.`,
    market: `${hot ? 'Strong' : 'Moderate'} demand for your skill set${p.professional.remoteCapability > 0.6 ? ', including remote opportunities' : ''}.`,
  };

  return {
    archetype: key,
    archetypeLabel: a.label,
    overallFeasibility: +(overall / 100).toFixed(2),
    feasibilityPercent: overall,
    confidenceLevel,
    components: {
      financial: { score: financial, viable: financial >= 55, explanation: explain.financial, requiredSavings: Math.round(required), fundingGap: Math.round(gap) },
      skills: { score: skills, viable: skills >= 55, explanation: explain.skills, skillsGap: skills >= 80 ? 'minimal' : skills >= 62 ? 'moderate' : 'significant' },
      family: { score: family, viable: family >= 55, explanation: explain.family },
      location: { score: location, viable: location >= 55, explanation: explain.location },
      timeline: { score: timeline, viable: true, explanation: explain.timeline, minMonths, recommendedMonths: recommended, maxMonths },
      market: { score: market, viable: market >= 55, explanation: explain.market },
    },
    keyObstacles: obstacles.slice(0, 4),
    successFactors: successFactors.slice(0, 4),
    recommendations,
    estimatedTimeline: recommended,
    resourceRequirements: { money: Math.round(required), hoursPerWeek: Math.round(hours * 6), skills: a.skillsNeeded },
    verdict: overall >= 75 ? 'Your dream is achievable — and the numbers back it up.' : overall >= 55 ? 'Achievable with a focused plan. The roadmap closes the gaps first.' : 'Ambitious, not impossible. The roadmap starts by building the foundation you need.',
    successStory: STORIES[key],
  };
}

// ---------------------------------------------------------------- roadmap

function phaseForMonths(a, total, lengths) {
  const out = [];
  let used = 0;
  a.phases.forEach((ph, i) => {
    const isLast = i === a.phases.length - 1;
    const len = lengths ? lengths[i] : isLast ? total - used : Math.max(1, Math.round(total * ph.share));
    const months = [];
    for (let m = used + 1; m <= Math.min(total, used + len); m++) months.push(m);
    used += months.length;
    out.push({ ph, months });
  });
  return out.filter((x) => x.months.length);
}

export function buildWeeks(a, phaseIndex, month, monthInPhase, ctx, p) {
  const ph = a.phases[phaseIndex];
  const hoursScale = clamp(p.personal.availableHours / 2, 0.6, 1.5);
  const weeks = [];
  for (let w = 1; w <= 4; w++) {
    const weekNumber = (month - 1) * 4 + w;
    const offset = (monthInPhase * 4 + (w - 1)) * 3;
    const actions = [];
    for (let d = 0; d < 6; d++) {
      const [action, hrs, resource, metric, importance] = pick(ph.actions, offset + d);
      actions.push({
        id: `m${month}w${w}d${d}`,
        day: DAYS[d],
        action: fill(action, ctx),
        timeEstimate: hrs ? `${+(hrs * hoursScale).toFixed(1)}h` : '—',
        resource: fill(resource, ctx),
        successMetric: fill(metric, ctx),
        importance,
      });
    }
    actions.push({
      id: `m${month}w${w}d6`, day: 'Sunday', action: 'Weekly review: tick off wins, log income & savings, plan next week',
      timeEstimate: '0.5h', resource: 'Destiny Engine progress tab', successMetric: 'Week marked complete', importance: 'important',
    });
    weeks.push({
      weekNumber, weekInMonth: w,
      weeklyGoal: w === 4 ? fill(ph.goal, ctx) : fill(`${ph.name}: ${['set up the essentials', 'build momentum', 'push the critical actions', 'consolidate and review'][w - 1]}`, ctx),
      expectedOutcome: w === 4 ? `Checkpoint: ${fill(ph.milestone, ctx)}` : `Aim: all ${actions.filter((x) => x.importance === 'critical').length} critical actions done`,
      actions,
    });
  }
  return weeks;
}

function projection(p, a, total, phaseMap) {
  const inc = p.financial.monthlyIncome, exp = p.financial.monthlyExpenses;
  const target = inc * a.incomeLift;
  const transitionPhase = phaseMap[Math.min(2, phaseMap.length - 1)];
  const shiftAfter = transitionPhase ? transitionPhase.months.at(-1) : Math.ceil(total / 2);
  let cumulative = p.financial.savings;
  const byMonth = [];
  for (let m = 1; m <= total; m++) {
    const t = m / total;
    const curve = 1 / (1 + Math.exp(-9 * (t - 0.5))); // S-curve growth
    const income = round(inc + (target - inc) * curve);
    const expenses = round(m > shiftAfter ? exp * (1 + a.expenseShift) : exp * (m === shiftAfter ? 1.15 : 1));
    const savings = income - expenses;
    cumulative += savings;
    byMonth.push({ month: m, income, expenses, savings, cumulative: round(cumulative) });
  }
  const last = byMonth.at(-1);
  return {
    currentMonthlyIncome: inc, currentMonthlyExpenses: exp, targetMonthlyIncome: round(target), startingSavings: p.financial.savings,
    byMonth,
    totalWealthGain: round(cumulative - p.financial.savings),
    endSavingsRate: last.income ? Math.round((last.savings / last.income) * 100) : 0,
  };
}

export function generateRoadmap(raw, dream, feasibility, { phaseLengths } = {}) {
  const p = normalizeProfile(raw);
  const key = feasibility?.archetype || classifyDream(dream);
  const a = ARCHETYPES[key];
  const lengths = phaseLengths?.length === a.phases.length ? phaseLengths : null;
  const total = lengths ? lengths.reduce((x, y) => x + y, 0) : clamp(feasibility?.components?.timeline?.recommendedMonths || a.baseMonths, 3, 18);
  const ctx = ctxFor(p, dream);
  const phaseMap = phaseForMonths(a, total, lengths);
  const fin = projection(p, a, total, phaseMap);

  const phases = phaseMap.map(({ ph, months }, i) => ({
    phaseNumber: i + 1, name: ph.name, months, description: fill(ph.description, ctx), goal: fill(ph.goal, ctx),
  }));

  const months = [];
  phaseMap.forEach(({ ph, months: ms }, pi) => {
    ms.forEach((m, mi) => {
      const lastOfPhase = mi === ms.length - 1;
      const step = ms.length > 1 ? ` · ${['kick-off', 'momentum', 'deepen', 'stretch', 'lock-in'][Math.min(mi, 4)]}` : '';
      months.push({
        month: m, phase: ph.name, phaseNumber: pi + 1,
        title: `${ph.name}${step}`,
        focus: fill(ph.description, ctx),
        goal: lastOfPhase ? fill(ph.goal, ctx) : `Progress toward: ${fill(ph.goal, ctx).toLowerCase()}`,
        milestone: lastOfPhase ? { title: fill(ph.milestone, ctx), significance: `Closes the ${ph.name} phase` } : null,
        financial: fin.byMonth[m - 1],
        weeks: buildWeeks(a, pi, m, mi, ctx, p),
        weeksSource: 'engine',
      });
    });
  });

  const milestones = months.filter((m) => m.milestone).map((m) => ({ month: m.month, milestone: m.milestone.title, significance: m.milestone.significance }));
  milestones[milestones.length - 1] = { month: total, milestone: `Dream achieved: ${dream}`, significance: 'Everything you planned for' };
  months[months.length - 1].milestone = { title: 'Dream achieved', significance: dream };

  return {
    dreamSummary: dream,
    archetype: key,
    totalMonths: total,
    startDate: new Date().toISOString().slice(0, 10),
    phases,
    months,
    financialProjection: fin,
    milestones,
    riskAnalysis: { obstacles: a.risks.map(([o, likelihood, m]) => ({ obstacle: fill(o, ctx), likelihood, mitigation: fill(m, ctx) })) },
    resources: {
      tools: a.resources.tools.map(([name, type]) => ({ name, type })),
      communities: a.resources.communities.map((c) => fill(c, ctx)),
      courses: a.resources.courses,
      people: a.resources.people.map((x) => fill(x, ctx)),
    },
    successFactors: feasibility?.successFactors || [],
    motivationalMessage: `${p.basicInfo.name ? p.basicInfo.name.split(' ')[0] + ', y' : 'Y'}ou don't need to be ready for all ${total} months — just this week. The first star on your map: ${phases[0].goal.charAt(0).toLowerCase() + phases[0].goal.slice(1)}.`,
    adaptations: [],
  };
}

// ---------------------------------------------------------------- coaching

export function generateDailyCoaching({ profile, roadmap, stats, today, history = [] }) {
  const p = normalizeProfile(profile);
  const name = p.basicInfo.name ? p.basicInfo.name.split(' ')[0] : 'there';
  const week = roadmap.months.flatMap((m) => m.weeks || []).find((w) => w.weekNumber === stats.currentWeek);
  const dayIdx = (new Date(today).getDay() + 6) % 7;
  const todays = week?.actions?.[dayIdx];
  const pending = week?.actions?.filter((a) => !stats.completedIds.has(a.id)) || [];
  const next = (todays && !stats.completedIds.has(todays.id)) ? todays : pending[0];
  const recentTypes = history.slice(0, 3).map((h) => h.type);
  const seed = new Date(today).getDate();

  let type;
  if (stats.justHitMilestone) type = 'celebration';
  else if (stats.paceDelta < -15) type = 'warning';
  else if (stats.paceDelta > 10 && !recentTypes.includes('motivation')) type = 'motivation';
  else type = ['nudge', 'tip', 'nudge', 'opportunity', 'nudge', 'tip', 'motivation'][seed % 7];
  if (recentTypes[0] === type && type !== 'nudge' && type !== 'celebration') type = 'nudge';

  const skill = p.professional.skills[0] || p.professional.currentJob;
  const tips = [
    'Do the hardest action before you open messages — first-hour energy is your edge.',
    'Batch similar actions: outreach on one day, creation on another. Context switching costs ~20 minutes each time.',
    `Turn one thing you learned this week into a short post. It compounds credibility in ${skill}.`,
    'If an action feels too big, shrink it to 15 minutes. Starting matters more than finishing today.',
    'Log income the same day it lands — seeing the curve move is fuel.',
  ];
  const opportunities = [
    `Companies are actively hiring short-term ${skill} help this month. Spend 20 minutes on 3 targeted pitches.`,
    `Communities around "${roadmap.dreamSummary.slice(0, 40)}…" often share leads on weekends — post a short intro.`,
    `Someone in your network has likely done part of this journey. Message one person today and ask a single specific question.`,
  ];

  const nextLine = next ? `“${next.action}” (${next.timeEstimate})` : 'your weekly review';
  // Specific context the doc-style coach leads with: last week's result, runway, an active course correction.
  const lw = stats.lastWeek && stats.weekDone === 0 ? `You closed week ${stats.lastWeek.week} with ${stats.lastWeek.done}/${stats.lastWeek.total} actions done. ` : '';
  const rw = stats.runway;
  const mo = (n) => `${n} month${n === 1 ? '' : 's'}`;
  const runwayLine = rw ? (rw.monthsWithDreamIncome == null
    ? ` Your dream income already covers your monthly costs — your ${inr(rw.liquid)} cushion stays untouched.`
    : rw.dreamIncome30 > 0
      ? ` Runway check: ${inr(rw.liquid)} saved — ${mo(rw.monthsNoIncome)} with no income, ${rw.monthsWithDreamIncome > 36 ? 'over 3 years' : mo(rw.monthsWithDreamIncome)} counting what you earn on the side.`
      : ` Runway check: ${inr(rw.liquid)} saved covers ${mo(rw.monthsNoIncome)} of expenses.`) : '';
  if (stats.correction && !stats.justHitMilestone) {
    return {
      type: 'nudge', emoji: '🧭', relevanceScore: 0.95, resource: next?.resource || '',
      message: `${lw}This is a course-correction week after “${stats.correction.issue.toLowerCase()}”: ${stats.correction.open} new action${stats.correction.open > 1 ? 's' : ''} to get you moving again. Do those before anything else.`,
      actionSuggested: next ? `Start with ${nextLine}.` : 'Run your weekly review.',
    };
  }
  const messages = {
    celebration: { emoji: '🎉', message: `Milestone unlocked, ${name}: ${stats.lastMilestone}. That's ${stats.percent}% of the way to your dream. Take a breath — you earned it.`, action: 'Share the win with someone who believes in you.' },
    warning: { emoji: '🧭', message: `You're about ${Math.abs(Math.round(stats.paceDelta))}% behind the plan for week ${stats.currentWeek}. No guilt — just pick the critical actions and let "helpful" ones go this week.${runwayLine}`, action: next ? `Start with ${nextLine}.` : 'Run your weekly review and reset the plan.' },
    motivation: { emoji: '🚀', message: `${stats.completed} actions done — you're ahead of pace, ${name}. People who keep this rhythm for 3 more weeks almost always hit their first milestone early.`, action: next ? `Keep the streak: ${nextLine}.` : 'Look ahead to next week.' },
    nudge: { emoji: '💪', message: `${lw ? `${lw}` : `Good ${new Date(today).getHours() < 12 ? 'morning' : 'day'}, ${name}. `}Today's move: ${nextLine}. Week ${stats.currentWeek} is ${stats.weekPercent}% done.${seed % 2 ? runwayLine : ''}`, action: next?.action || 'Weekly review' },
    tip: { emoji: '💡', message: pick(tips, seed), action: next ? `Apply it to ${nextLine}.` : 'Apply it this week.' },
    opportunity: { emoji: '✨', message: pick(opportunities, seed), action: 'Spend 20 minutes on it before lunch.' },
  };
  const m = messages[type];
  return { type, message: m.message, actionSuggested: m.action, resource: next?.resource || '', emoji: m.emoji, relevanceScore: type === 'nudge' ? 0.9 : 0.85 };
}

// ---------------------------------------------------------------- obstacles

const ISSUES = {
  'no-clients': {
    label: 'Not getting clients or leads', impact: 1, effects: { market: -12, financial: -7 }, why: 'Fewer clients than planned puts both demand and income at risk',
    causes: ['Your offer is too broad, so prospects can\'t see themselves in it', 'Outreach volume is too low to beat normal 5–10% reply rates', 'Little social proof yet'],
    solutions: ['Narrow to one niche and rewrite your pitch around a single painful problem', 'Double outreach to 20 personalised messages a week and follow up twice', 'Offer one discounted pilot in exchange for a testimonial'],
    actions: ['Rewrite your one-line offer for a single niche', 'Send 20 personalised pitches with a specific result in the first line', 'Offer a 2-week pilot to a warm contact for a testimonial', 'Follow up on every pitch older than 4 days'],
    pivots: ['Partner with an agency that resells your work', 'Go via referrals: ask 10 former colleagues for one intro each'],
  },
  'low-income': {
    label: 'Income is below projection', impact: 1, effects: { financial: -10, market: -4 }, why: 'Income below projection stretches the funding plan',
    causes: ['Pricing is anchored to your old salary rate', 'Too many small one-off jobs', 'Time going to low-value tasks'],
    solutions: ['Raise prices 20% for every new client', 'Convert top clients to monthly retainers', 'Productise a repeatable deliverable'],
    actions: ['Raise your price on the next 3 proposals', 'Pitch a retainer to your best client', 'Package your most common job as a fixed-price offer', 'Drop or delegate your lowest-value task'],
    pivots: ['Add a higher-ticket advisory offer', 'Pick up a short-term contract to stabilise cash'],
  },
  'no-time': {
    label: 'Not enough time', impact: 1, effects: { timeline: -8 }, why: 'Less time each week slows every phase',
    causes: ['Actions are scheduled at low-energy times', 'Plan has too many "helpful" actions', 'Work or family demands increased'],
    solutions: ['Protect one fixed 60-minute block daily', 'Only do critical actions for 2 weeks', 'Negotiate one evening a week with family'],
    actions: ['Block a recurring 60-minute dream slot in your calendar', 'Cut this week to critical actions only', 'Have a 15-minute family conversation about support', 'Batch errands into one weekend slot'],
    pivots: ['Extend the timeline slightly instead of burning out', 'Delegate one recurring chore'],
  },
  'family-concerns': {
    label: 'Family is worried or unsupportive', impact: 1, effects: { family: -14 }, why: 'The family has to be on board for a change this big',
    causes: ['Family sees the risk but not the safety nets', 'They were not involved in planning', 'Specific fears (money, schools, stability) not addressed'],
    solutions: ['Show them the roadmap and the emergency fund', 'Invite them to choose part of the plan', 'Set a clear "go/no-go" checkpoint together'],
    actions: ['Hold a 30-minute family planning session with the roadmap', 'Write down each family member\'s top fear and the plan for it', 'Agree a go/no-go checkpoint date', 'Plan a small fun step together'],
    pivots: ['Run a trial (a scouting trip, a 3-month pilot) before the full move', 'Move the risky step later in the timeline'],
  },
  motivation: {
    label: 'Losing motivation', impact: 0, effects: { timeline: -4 }, why: 'Low energy usually shows up as slipped weeks',
    causes: ['Goal feels far away', 'No visible wins recently', 'Doing it alone'],
    solutions: ['Shrink the next step to 15 minutes', 'Celebrate small wins visibly', 'Find an accountability partner'],
    actions: ['Do one 15-minute action today, nothing more', 'Write down 3 wins from the last month', 'Message a friend to be your weekly check-in', 'Re-read why you started'],
    pivots: ['Join a community of people chasing the same dream'],
  },
  'money-shortfall': {
    label: 'Unexpected expense or savings shortfall', impact: 2, effects: { financial: -14 }, why: 'The dream fund is smaller than planned',
    causes: ['An unplanned expense hit the dream fund', 'Expenses crept up', 'Income delay'],
    solutions: ['Pause non-critical spending for 60 days', 'Add a short-term income boost', 'Extend the timeline instead of dipping into the emergency fund'],
    actions: ['List and pause 5 non-essential expenses', 'Pick up one quick freelance or overtime gig', 'Re-calculate the dream fund target', 'Move the big-spend step one month later'],
    pivots: ['Look for lower-cost alternatives for the expensive step'],
  },
  'skill-gap': {
    label: 'Missing a key skill', impact: 1, effects: { skills: -12 }, why: 'A missing skill has to be built before the next phase',
    causes: ['The dream needs a skill you have not built yet', 'Learning without applying'],
    solutions: ['Learn just enough and apply it in a real project immediately', 'Find a mentor to shortcut learning'],
    actions: ['Pick one 10-hour course module and finish it this week', 'Apply it in a mini-project', 'Book a session with a mentor on ADPList', 'Share what you built for feedback'],
    pivots: ['Partner with someone who has the skill'],
  },
  opportunity: {
    label: 'A new opportunity appeared', impact: -1, effects: { market: 6, financial: 4 }, why: 'A new opening strengthens demand and income',
    causes: ['Your effort is compounding — opportunities show up when you\'re visible'],
    solutions: ['Evaluate it against your dream: does it accelerate or distract?', 'If it accelerates, pull forward the related phase'],
    actions: ['Write a 5-line pros/cons of the opportunity', 'Ask for details on time, money and timeline', 'Decide within 48 hours', 'Update your plan to absorb it'],
    pivots: ['Negotiate a version of the opportunity that fits your plan'],
  },
  other: {
    label: 'Something else', impact: 1, effects: { timeline: -4 }, why: 'Circumstances changed from when the plan was made',
    causes: ['Circumstances changed from when the plan was made'],
    solutions: ['Isolate the single biggest blocker', 'Adjust the next 2 weeks, not the whole plan'],
    actions: ['Write the blocker in one sentence', 'List 3 ways around it', 'Pick one and do it this week', 'Review in 7 days'],
    pivots: ['Extend the timeline by a month to absorb the change'],
  },
};
export const ISSUE_TYPES = Object.entries(ISSUES).map(([key, v]) => ({ key, label: v.label }));

export function requestAdvice({ issue, details, roadmap, stats }) {
  const it = ISSUES[issue] || ISSUES.other;
  const impact = it.impact;
  return {
    issue, issueLabel: it.label,
    diagnosis: `${it.label}${details ? ` — “${details.slice(0, 140).trim().replace(/[.!?]+$/, '')}”` : ''}. This is common around week ${stats?.currentWeek || 1} of a ${roadmap.totalMonths}-month plan, and it's fixable.`,
    likelyCauses: it.causes,
    solutions: it.solutions,
    alternativeActions: it.actions,
    pivotStrategies: it.pivots,
    timelineImpactMonths: impact,
    newTotalMonths: clamp(roadmap.totalMonths + impact, 3, 18),
    encouragement: impact > 0 ? `Adding ${impact} month${impact > 1 ? 's' : ''} keeps your dream intact without burning you out.` : impact < 0 ? 'This could pull your dream forward. Let\'s use it.' : 'Your timeline stays the same — this is about energy, not the plan.',
  };
}

/**
 * Re-score feasibility after a setback, with the same weights as the first score. Only the components the
 * setback touches move (plus timeline, by the months added), so the user can see exactly why it changed.
 */
export function rescoreFeasibility({ current, issue, timelineImpactMonths = 0 }) {
  const it = ISSUES[issue] || ISSUES.other;
  const before = Object.fromEntries(Object.keys(WEIGHTS).map((k) => [k, Number(current?.components?.[k]) || 70]));
  const after = { ...before };
  for (const [k, d] of Object.entries(it.effects || {})) after[k] = clamp(after[k] + d, 25, 98);
  after.timeline = clamp(after.timeline - (timelineImpactMonths > 0 ? timelineImpactMonths * 4 : timelineImpactMonths * 3), 25, 98);
  const from = Number.isFinite(current?.percent) ? current.percent : overallFeasibility(before);
  const to = clamp(from + (overallFeasibility(after) - overallFeasibility(before)), 20, 99);
  const changes = Object.keys(WEIGHTS).filter((k) => after[k] !== before[k]).map((k) => ({ key: k, label: COMPONENT_LABELS[k], from: before[k], to: after[k] }));
  return { from, to, components: after, changes, reason: it.why || '' };
}

/** Phase lengths after a timeline change: the delay lands in the phase you're in, so later milestones move with it. */
function shiftedPhaseLengths(roadmap, currentMonth, delta) {
  const lengths = (roadmap.phases || []).map((ph) => ph.months.length);
  if (!lengths.length || !delta) return lengths;
  let pi = roadmap.phases.findIndex((ph) => ph.months.includes(currentMonth));
  if (pi < 0) pi = lengths.length - 1;
  if (delta > 0) { lengths[pi] += delta; return lengths; }
  // Shorter plan: trim months that haven't started, latest phases first, never below one month or before today.
  let left = -delta;
  for (let i = lengths.length - 1; i >= pi && left > 0; i--) {
    const started = i === pi ? currentMonth - roadmap.phases[i].months[0] + 1 : 0;
    const spare = lengths[i] - Math.max(1, started);
    const take = Math.min(spare, left);
    lengths[i] -= take; left -= take;
  }
  return lengths;
}

/** Apply advice to a roadmap: re-plan from the current month onward, keep history. */
export function adaptRoadmap({ roadmap, advice, profile, dream, feasibility, currentWeek }) {
  const currentMonth = Math.ceil(currentWeek / 4);
  const newTotal = advice.newTotalMonths ?? roadmap.totalMonths;
  const feas = { ...(feasibility || {}), archetype: roadmap.archetype, components: { ...(feasibility?.components || {}), timeline: { recommendedMonths: newTotal } } };
  const phaseLengths = shiftedPhaseLengths(roadmap, currentMonth, newTotal - roadmap.totalMonths);
  const fresh = generateRoadmap(profile, dream, feas, { phaseLengths: phaseLengths.reduce((a, b) => a + b, 0) === newTotal ? phaseLengths : undefined });

  // Keep completed months exactly as they were.
  fresh.months = fresh.months.map((m) => (m.month < currentMonth ? roadmap.months.find((o) => o.month === m.month) || m : m));
  fresh.startDate = roadmap.startDate;

  // Inject recovery actions into the remaining weeks of the current month.
  const cm = fresh.months.find((m) => m.month === currentMonth);
  const oldCm = roadmap.months.find((m) => m.month === currentMonth);
  if (cm?.weeks && oldCm?.weeks) {
    cm.weeks = cm.weeks.map((w) => (w.weekNumber < currentWeek ? oldCm.weeks.find((o) => o.weekNumber === w.weekNumber) || w : w));
  }
  if (cm?.weeks) {
    let k = 0;
    for (const w of cm.weeks) {
      if (w.weekNumber < currentWeek) continue;
      w.actions = w.actions.map((a) => {
        if (a.importance === 'helpful' || (a.importance === 'important' && k < advice.alternativeActions.length && a.day !== 'Sunday')) {
          const txt = advice.alternativeActions[k++ % advice.alternativeActions.length];
          return { ...a, id: `${a.id}-a${(roadmap.adaptations?.length || 0) + 1}`, action: txt, importance: 'critical', adapted: true, resource: 'Course correction', successMetric: 'Done and noted' };
        }
        return a;
      });
      if (k >= advice.alternativeActions.length) break;
    }
  }
  const f = advice.feasibility;
  if (f) fresh.feasibilityNow = { percent: f.to, components: f.components };
  else if (roadmap.feasibilityNow) fresh.feasibilityNow = roadmap.feasibilityNow;
  fresh.adaptations = [
    ...(roadmap.adaptations || []),
    {
      date: new Date().toISOString(), issue: advice.issueLabel, summary: advice.solutions[0], timelineChange: newTotal - roadmap.totalMonths,
      fromMonths: roadmap.totalMonths, toMonths: newTotal, fromWeek: currentWeek,
      ...(f ? { feasibilityFrom: f.from, feasibilityTo: f.to } : {}),
    },
  ];
  return fresh;
}

/**
 * What applying the advice would change, computed before the user decides: milestones that move,
 * weeks that stay locked, the feasibility re-score and the new actions. Deterministic, so it's instant.
 */
export function previewAdaptation({ roadmap, advice, profile, dream, feasibility, currentWeek }) {
  const current = roadmap.feasibilityNow || { percent: feasibility?.feasibilityPercent, components: Object.fromEntries(Object.entries(feasibility?.components || {}).map(([k, v]) => [k, v.score])) };
  const rescored = rescoreFeasibility({ current, issue: advice.issue, timelineImpactMonths: advice.timelineImpactMonths });
  const next = adaptRoadmap({ roadmap, advice: { ...advice, feasibility: rescored }, profile, dream, feasibility, currentWeek });
  const strip = (t) => (t || '').replace(/^Dream achieved:.*/, 'Dream achieved');
  const before = roadmap.months.filter((m) => m.milestone && m.month >= Math.ceil(currentWeek / 4));
  const after = next.months.filter((m) => m.milestone);
  const milestoneShifts = before.map((m, i) => {
    const match = after.find((x) => strip(x.milestone.title) === strip(m.milestone.title)) || after[after.length - before.length + i];
    return match ? { title: strip(m.milestone.title) === 'Dream achieved' ? 'Dream achieved' : m.milestone.title, from: m.month, to: match.month } : null;
  }).filter(Boolean);
  return {
    feasibility: rescored,
    milestoneShifts,
    lockedWeeks: Math.max(0, currentWeek - 1),
    fromMonths: roadmap.totalMonths,
    toMonths: next.totalMonths,
  };
}
