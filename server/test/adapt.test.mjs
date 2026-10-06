// Adaptive planning and runway: the behaviour the live demo relies on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/ai/engine.js';
import { computeStats } from '../src/lib/state.js';

const AARAV = {
  basicInfo: { name: 'Aarav Mehta', age: 32, location: 'Delhi', maritalStatus: 'married', childrenCount: 2 },
  financial: { monthlyIncome: 125000, monthlyExpenses: 70000, savings: 450000, debts: 500000, investments: 2000000 },
  professional: { currentJob: 'Marketing Manager', yearsExperience: 8, skills: ['Digital marketing', 'Social media', 'Analytics', 'Copywriting'], remoteCapability: 0.95 },
  personal: { availableHours: 2.5, motivationLevel: 9, learningSpeed: 'fast', familySupport: 'high' },
};
const DREAM = 'Move to Goa with my family, work freelance and live by the beach';

function setup() {
  const feasibility = engine.analyzeDreamFeasibility(AARAV, DREAM, 'relocation');
  const roadmap = engine.generateRoadmap(AARAV, DREAM, feasibility);
  return { feasibility, roadmap };
}
const monthOf = (rm, title) => rm.months.find((m) => m.milestone?.title === title)?.month;

test('a setback that adds a month moves the later milestones with it', () => {
  const { feasibility, roadmap } = setup();
  const advice = engine.requestAdvice({ issue: 'no-clients', details: 'Sent 25 pitches, got 1 reply', roadmap, stats: { currentWeek: 6 } });
  const preview = engine.previewAdaptation({ roadmap, advice, profile: AARAV, dream: DREAM, feasibility, currentWeek: 6 });
  const next = engine.adaptRoadmap({ roadmap, advice: { ...advice, feasibility: preview.feasibility }, profile: AARAV, dream: DREAM, feasibility, currentWeek: 6 });

  assert.equal(next.totalMonths, roadmap.totalMonths + 1);
  const moving = 'Moving day in Goa';
  assert.equal(monthOf(next, moving), monthOf(roadmap, moving) + 1, 'moving day shifts one month later');
  const shift = preview.milestoneShifts.find((m) => m.title === moving);
  assert.deepEqual([shift.from, shift.to], [monthOf(roadmap, moving), monthOf(next, moving)], 'preview matches what gets applied');

  // Completed work is untouched: month 1 and the closed weeks of the current month.
  assert.deepEqual(next.months[0], roadmap.months[0]);
  const wk5 = (rm) => rm.months[1].weeks.find((w) => w.weekNumber === 5);
  assert.deepEqual(wk5(next), wk5(roadmap));
  assert.equal(preview.lockedWeeks, 5);
  // The course correction lands in the current week.
  assert.ok(next.months[1].weeks.find((w) => w.weekNumber === 6).actions.some((a) => a.adapted));
});

test('feasibility is re-scored with the same weights, and only touched components move', () => {
  const { feasibility } = setup();
  const current = { percent: feasibility.feasibilityPercent, components: Object.fromEntries(Object.entries(feasibility.components).map(([k, v]) => [k, v.score])) };
  const r = engine.rescoreFeasibility({ current, issue: 'no-clients', timelineImpactMonths: 1 });
  assert.equal(r.from, feasibility.feasibilityPercent);
  assert.ok(r.to < r.from, 'a setback lowers feasibility');
  assert.deepEqual(r.changes.map((c) => c.key).sort(), ['financial', 'market', 'timeline']);
  const up = engine.rescoreFeasibility({ current, issue: 'opportunity', timelineImpactMonths: -1 });
  assert.ok(up.to > up.from, 'an opportunity raises it');
});

test('a shorter timeline never removes months that have already started', () => {
  const { roadmap } = setup();
  const advice = { ...engine.requestAdvice({ issue: 'opportunity', roadmap, stats: { currentWeek: 6 } }), newTotalMonths: roadmap.totalMonths - 1 };
  const next = engine.adaptRoadmap({ roadmap, advice, profile: AARAV, dream: DREAM, currentWeek: 6 });
  assert.equal(next.totalMonths, roadmap.totalMonths - 1);
  assert.deepEqual(next.months[0], roadmap.months[0]);
  assert.ok(next.phases.every((p) => p.months.length >= 1));
});

test('logging dream income extends the runway', () => {
  const { roadmap } = setup();
  const progress = { completedActions: {}, incomeLog: [], savingsLog: [], currentWeek: 6, completedWeeks: [1, 2, 3, 4, 5], celebrated: [], startedAt: new Date(Date.now() - 37 * 864e5).toISOString() };
  const before = computeStats(roadmap, progress).runway;
  assert.equal(before.monthsNoIncome, +(450000 / 70000).toFixed(1));
  progress.incomeLog.push({ date: new Date().toISOString().slice(0, 10), amount: 15000 });
  const after = computeStats(roadmap, progress).runway;
  assert.ok(after.monthsWithDreamIncome > before.monthsWithDreamIncome);
  assert.equal(after.monthsNoIncome, before.monthsNoIncome, 'income does not change the zero-income view');
});

test('no monthly surplus never produces absurd "months to fund" text', () => {
  const p = { ...AARAV, financial: { monthlyIncome: 90000, monthlyExpenses: 90000, savings: 90000, debts: 0, investments: 90000 } };
  const f = engine.analyzeDreamFeasibility(p, 'Become a UX designer', 'career');
  const text = [f.components.financial.explanation, ...f.keyObstacles, ...f.recommendations].join(' ');
  assert.doesNotMatch(text, /\d{4,} months/);
  assert.doesNotMatch(text, /₹0\/month/);
});
