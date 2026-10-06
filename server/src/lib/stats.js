// Pure progress maths (no database): shared by the API and the browser-only demo build.

export const emptyProgress = () => ({ completedActions: {}, incomeLog: [], savingsLog: [], currentWeek: 1, completedWeeks: [], celebrated: [], startedAt: new Date().toISOString() });

/** Derived numbers used by dashboard, coaching and progress views. */
export function computeStats(roadmap, progress) {
  const weeks = roadmap.months.flatMap((m) => m.weeks || []);
  const allActions = weeks.flatMap((w) => w.actions);
  const completedIds = new Set(allActions.filter((a) => progress.completedActions[a.id]).map((a) => a.id));
  const totalWeeks = roadmap.totalMonths * 4;
  const currentWeek = Math.min(progress.currentWeek, totalWeeks);
  const currentMonth = Math.ceil(currentWeek / 4);
  const week = weeks.find((w) => w.weekNumber === currentWeek);
  const weekDone = week ? week.actions.filter((a) => completedIds.has(a.id)).length : 0;
  const weekPercent = week ? Math.round((weekDone / week.actions.length) * 100) : 0;

  // Progress = completed weeks + partial credit for this week.
  const doneWeeks = progress.completedWeeks.length;
  const percent = Math.min(100, Math.round(((doneWeeks + (weekPercent / 100)) / totalWeeks) * 100));
  const daysIn = Math.max(0, (Date.now() - new Date(progress.startedAt).getTime()) / 86400000);
  const expected = Math.min(100, ((daysIn / 7) / totalWeeks) * 100);
  const paceDelta = percent - expected;

  const achieved = roadmap.months.filter((m) => m.milestone && m.month * 4 <= doneWeeks).map((m) => ({ month: m.month, title: m.milestone.title, significance: m.milestone.significance }));
  const upcoming = roadmap.months.filter((m) => m.milestone && m.month * 4 > doneWeeks).slice(0, 3).map((m) => ({ month: m.month, title: m.milestone.title, significance: m.milestone.significance }));
  const lastAchieved = achieved.at(-1);
  const justHitMilestone = Boolean(lastAchieved && !progress.celebrated.includes(lastAchieved.month));

  const incomeTotal = progress.incomeLog.reduce((s, x) => s + Number(x.amount || 0), 0);
  const savingsTotal = progress.savingsLog.reduce((s, x) => s + Number(x.amount || 0), 0);
  const monthOf = (d) => Math.max(1, Math.floor((new Date(d) - new Date(roadmap.startDate)) / (30.44 * 86400000)) + 1);
  const incomeThisMonth = progress.incomeLog.filter((x) => monthOf(x.date) === currentMonth).reduce((s, x) => s + Number(x.amount || 0), 0);
  const projectedIncome = roadmap.financialProjection.byMonth[currentMonth - 1]?.income || 0;

  // Runway: how long savings last if you went all-in today. Two views — with no income at all, and
  // counting the dream income of the last 30 days (so logging income visibly moves it).
  const fp = roadmap.financialProjection;
  const startingSavings = fp.startingSavings ?? (fp.byMonth[0] ? fp.byMonth[0].cumulative - fp.byMonth[0].savings : 0);
  const liquid = Math.max(0, startingSavings + savingsTotal);
  const expenses = fp.currentMonthlyExpenses || 1;
  const cutoff = Date.now() - 30 * 86400000;
  const dreamIncome30 = progress.incomeLog.filter((x) => new Date(x.date).getTime() >= cutoff).reduce((s, x) => s + Number(x.amount || 0), 0);
  const netBurn = expenses - dreamIncome30;
  const runway = {
    liquid, monthlyExpenses: expenses, dreamIncome30,
    monthsNoIncome: +(liquid / expenses).toFixed(1),
    monthsWithDreamIncome: netBurn > 0 ? +(liquid / netBurn).toFixed(1) : null, // null = dream income already covers costs
  };

  // Last closed week, and whether this week carries course-correction actions.
  const lastWeekNo = progress.completedWeeks.length ? Math.max(...progress.completedWeeks) : null;
  const lastW = lastWeekNo && weeks.find((w) => w.weekNumber === lastWeekNo);
  const lastWeek = lastW ? { week: lastWeekNo, done: lastW.actions.filter((a) => completedIds.has(a.id)).length, total: lastW.actions.length } : null;
  const adaptedOpen = week ? week.actions.filter((a) => a.adapted && !completedIds.has(a.id)).length : 0;
  const lastAdaptation = (roadmap.adaptations || []).at(-1);
  const correction = adaptedOpen && lastAdaptation ? { issue: lastAdaptation.issue, open: adaptedOpen } : null;

  return {
    totalActions: allActions.length, total: allActions.length, completed: completedIds.size, completedIds,
    percent, currentWeek, currentMonth, totalWeeks, weekDone, weekTotal: week?.actions.length || 7, weekPercent,
    weeksRemaining: totalWeeks - doneWeeks, paceDelta: Math.round(paceDelta), onTrack: paceDelta >= -10,
    achievedMilestones: achieved, upcomingMilestones: upcoming, justHitMilestone, lastMilestone: lastAchieved?.title,
    incomeTotal, savingsTotal, incomeThisMonth, projectedIncome,
    runway, lastWeek, correction,
    feasibility: roadmap.feasibilityNow?.percent ?? null,
  };
}

export const statsOut = ({ completedIds, ...s }) => s;
