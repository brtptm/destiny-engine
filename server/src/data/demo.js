// Aarav's demo journey as plain data: used by the API seed (seed.js) and the browser-only demo build.
import * as engine from '../ai/engine.js';

export const DEMO_EMAIL = 'demo@destiny.app';
export const DEMO_PASSWORD = 'dream-big-2026';
export const DEMO_NAME = 'Aarav Mehta';

export const DEMO_PROFILE = {
  basicInfo: { name: 'Aarav Mehta', age: 32, location: 'Delhi', maritalStatus: 'married', childrenCount: 2, childrenAges: [8, 6], education: 'MBA, Marketing' },
  financial: { monthlyIncome: 125000, monthlyExpenses: 70000, savings: 450000, debts: 500000, investments: 2000000, assets: ['apartment', 'car'], creditScore: 750 },
  professional: { currentJob: 'Marketing Manager', currentCompany: 'TCS', yearsExperience: 8, skills: ['Digital marketing', 'Social media', 'Analytics', 'Copywriting'], softSkills: ['Communication', 'Leadership'], hiddenTalents: 'Photography', remoteCapability: 0.95, growthPotential: 'limited' },
  personal: { healthStatus: 'good', riskTolerance: 'medium', availableHours: 2.5, motivationLevel: 9, learningSpeed: 'fast', familySupport: 'high' },
};
export const DEMO_DREAM = 'Move to Goa with my family, work freelance and live by the beach';

/** Five weeks done, the sixth in progress, income and savings logged, a few coaching messages. */
export function buildDemoJourney(now = Date.now()) {
  const profile = engine.normalizeProfile(DEMO_PROFILE);
  const analysis = { ...engine.analyzeLifeProfile(profile), source: 'engine' };
  const feasibility = { ...engine.analyzeDreamFeasibility(profile, DEMO_DREAM, 'relocation'), source: 'engine' };
  const roadmap = engine.generateRoadmap(profile, DEMO_DREAM, feasibility);
  const started = new Date(now - 37 * 86400000);
  roadmap.startDate = started.toISOString().slice(0, 10);

  // Five weeks done, sixth in progress.
  const completedActions = {};
  const weeks = roadmap.months.flatMap((m) => m.weeks);
  weeks.filter((w) => w.weekNumber <= 6).forEach((w) => {
    w.actions.forEach((a, i) => {
      const skip = w.weekNumber === 6 ? i > 2 : (w.weekNumber + i) % 7 === 3;
      if (!skip) completedActions[a.id] = { completedAt: new Date(started.getTime() + ((w.weekNumber - 1) * 7 + i) * 86400000).toISOString(), note: '' };
    });
  });
  const day = (n) => new Date(started.getTime() + n * 86400000).toISOString().slice(0, 10);
  const progress = {
    completedActions,
    // Two clients so far, about ₹35K in the last 30 days: real progress, with runway left to grow live in the demo.
    incomeLog: [
      { date: day(9), amount: 12000, source: 'Upwork trial project', note: 'First 5★ review' },
      { date: day(16), amount: 15000, source: 'Retainer — D2C skincare brand', note: 'Client 2' },
      { date: day(33), amount: 10000, source: 'Social media audit — D2C skincare brand', note: '' },
    ],
    savingsLog: [
      { date: day(7), amount: 15000, note: 'Move fund' }, { date: day(14), amount: 20000, note: 'Move fund' },
      { date: day(21), amount: 22000, note: 'Move fund' }, { date: day(28), amount: 25000, note: 'Move fund' }, { date: day(35), amount: 28000, note: 'Move fund' },
    ],
    currentWeek: 6, completedWeeks: [1, 2, 3, 4, 5], celebrated: [], startedAt: started.toISOString(),
  };
  const messages = [
    [32, 'nudge', '💪', 'Good morning, Aarav. Today\'s move: build a 3-piece portfolio from past campaigns. Week 1 is 40% done — you\'re on track.', 'Build your portfolio'],
    [25, 'celebration', '🎉', 'First freelance rupee earned! ₹12,000 from your trial project — proof that your skills travel.', 'Ask the client for a testimonial'],
    [18, 'tip', '💡', 'Batch your outreach on Tuesdays and creative work on Thursdays. Context switching costs ~20 minutes each time.', 'Block Tuesday 8–9pm for pitches'],
    [11, 'opportunity', '✨', 'Two D2C brands in your network are hiring short-term social media help. Spend 20 minutes on targeted pitches.', 'Send 2 pitches before lunch'],
    [4, 'motivation', '🚀', '28 actions done — you\'re ahead of pace. People who keep this rhythm for 3 more weeks almost always hit their first milestone early.', 'Keep the streak going'],
  ].map(([ago, type, emoji, message, action]) => ({ at: new Date(now - ago * 86400000), type, emoji, message, action }));
  return { profile, analysis, dream: DEMO_DREAM, templateId: 'goa-beach-freelance', feasibility, roadmap, progress, messages };
}
