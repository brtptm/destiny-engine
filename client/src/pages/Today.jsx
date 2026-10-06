import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiRefreshCw, FiTrendingUp, FiTrendingDown, FiLifeBuoy } from 'react-icons/fi';
import { api, useDashboard } from '../lib/api.js';
import { useToggleAction, useCompleteWeek, todayIndex } from '../lib/hooks.js';
import { inrShort, monthLabel, plural } from '../lib/format.js';
import { ActionChecklist, CoachingMessage, ProgressBar, Spinner, ErrorNote, Celebration, MilestoneCard } from '../components/ui.jsx';

// The setbacks people hit most, one tap from the daily screen (keys match the server's issue types).
const STUCK = [['no-clients', 'Not getting clients'], ['low-income', 'Income below plan'], ['family-concerns', 'Family is worried'], ['no-time', 'No time this week']];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Today() {
  const { data } = useDashboard();
  const qc = useQueryClient();
  const { toggle, busyId, error } = useToggleAction();
  const week = useCompleteWeek();
  const [celebration, setCelebration] = useState(null);
  const daily = useQuery({ queryKey: ['coaching', 'daily'], queryFn: () => api.dailyMessage(), enabled: data?.stage === 'active' });

  // Surface the daily message as a browser notification once a day, if the user opted in.
  useEffect(() => {
    const m = daily.data?.message;
    if (!m || !data?.user?.settings?.pushNotifications || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      if (localStorage.getItem('de-notified') === m.date) return;
      new Notification('Destiny Engine', { body: m.message, icon: '/star.svg' });
      localStorage.setItem('de-notified', m.date);
    } catch {}
  }, [daily.data, data?.user?.settings?.pushNotifications]);

  if (!data?.roadmap) return <Spinner label="Loading today" />;
  const { roadmap, stats, progress } = data;
  const current = roadmap.months.flatMap((m) => m.weeks || []).find((w) => w.weekNumber === stats.currentWeek);
  const month = roadmap.months.find((m) => m.month === stats.currentMonth);
  const first = data.profile?.data?.basicInfo?.name?.split(' ')[0] || data.user.name.split(' ')[0];
  const finished = progress.completedWeeks.length >= stats.totalWeeks;
  const incomeDelta = stats.projectedIncome ? stats.incomeThisMonth - Math.max(0, stats.projectedIncome - roadmap.financialProjection.currentMonthlyIncome) : 0;

  async function completeWeek() {
    const r = await week.run();
    if (!r) return;
    qc.invalidateQueries({ queryKey: ['coaching'] });
    if (r.finished) setCelebration({ title: 'You made it', body: 'Every week of your roadmap is complete. This is the moment you planned for.' });
    else if (r.milestoneUnlocked) {
      setCelebration({ title: 'Milestone unlocked', body: `${r.milestoneUnlocked.title}. That’s month ${r.milestoneUnlocked.month} of your journey — done.`, month: r.milestoneUnlocked.month });
    } else setCelebration({ title: `Week ${r.stats.currentWeek} unlocked`, body: `Week ${r.stats.currentWeek - 1} is in the books. ${plural(r.stats.weeksRemaining, 'week')} to your dream.` });
  }

  async function closeCelebration() {
    if (celebration?.month) {
      const r = await api.celebrate(celebration.month).catch(() => null);
      if (r) qc.setQueryData(['dashboard'], (d) => d && { ...d, progress: r.progress, stats: r.stats });
    }
    setCelebration(null);
  }

  return (
    <div>
      {celebration && <Celebration title={celebration.title} body={celebration.body} onClose={closeCelebration} />}
      <header>
        <p className="text-ink-3">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl sm:text-3xl mt-1">{greeting()}, {first}.</h1>
      </header>

      <section className="mt-6" aria-label="Today's coaching">
        {daily.isLoading ? <div className="panel p-7 text-ink-3">Your coach is writing today’s message…</div>
          : daily.error ? <ErrorNote error={daily.error} onRetry={daily.refetch} />
          : daily.data && <CoachingMessage message={daily.data.message} featured />}
      </section>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <section className="panel p-5 sm:p-7 min-w-0" aria-labelledby="week-h">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-3">Week {stats.currentWeek} · month {stats.currentMonth} · {month?.phase}</p>
              <h2 id="week-h" className="text-xl mt-1">{current?.weeklyGoal || 'This week'}</h2>
            </div>
            <span className="num text-lg">{stats.weekDone}/{stats.weekTotal}</span>
          </div>
          <div className="mt-4"><ProgressBar value={stats.weekPercent} tone="var(--sea)" label="This week’s actions" /></div>
          <ErrorNote error={error || week.error} />
          {current && (
            <div className="mt-3">
              <ActionChecklist actions={current.actions} completed={progress.completedActions} onToggle={toggle} busyId={busyId} todayIdx={todayIndex()} />
            </div>
          )}
          <div className="mt-5 pt-5 border-t border-line flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-3 max-w-[40ch]">
              {stats.weekPercent >= 70 ? 'Strong week. Wrap it up to unlock the next one.' : 'Finish the critical actions first. You can close the week whenever you’re ready.'}
            </p>
            <button className="btn btn-primary" onClick={completeWeek} disabled={week.busy || finished}>
              {finished ? 'Journey complete' : week.busy ? 'Saving…' : `Complete week ${stats.currentWeek}`}
            </button>
          </div>
        </section>

        <aside className="grid gap-4">
          <div className="panel p-5">
            <div className="flex items-baseline justify-between"><span className="text-sm text-ink-3">Journey</span><span className="num text-2xl">{stats.percent}%</span></div>
            <div className="mt-3"><ProgressBar value={stats.percent} label="Journey progress" /></div>
            <p className="text-sm mt-3" style={{ color: stats.onTrack ? 'var(--sea)' : 'var(--rose)' }}>
              {stats.onTrack ? (stats.paceDelta > 5 ? 'Ahead of schedule' : 'On track') : `About ${Math.abs(stats.paceDelta)}% behind plan`}
            </p>
            <p className="text-sm text-ink-3 mt-1">Week {stats.currentWeek} of {stats.totalWeeks} · feasibility {stats.feasibility ?? data.dream?.feasibility?.feasibilityPercent}%</p>
          </div>
          <div className="panel p-5">
            <div className="text-sm text-ink-3">New income this month</div>
            <div className="num text-2xl mt-1">{inrShort(stats.incomeThisMonth)}</div>
            <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: incomeDelta >= 0 ? 'var(--sea)' : 'var(--ink-3)' }}>
              {incomeDelta >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
              {incomeDelta === 0 ? 'Right on plan' : incomeDelta > 0 ? `${inrShort(incomeDelta)} above plan` : `${inrShort(-incomeDelta)} to go this month`}
            </p>
            <Link to="/progress#log" className="text-sm text-gold-text font-semibold mt-3 inline-block">Log income or savings</Link>
          </div>
          {stats.runway && (
            <div className="panel p-5">
              <div className="text-sm text-ink-3">Runway if you went all-in today</div>
              <div className="num text-2xl mt-1">{stats.runway.monthsNoIncome} months</div>
              <p className="text-sm text-ink-3 mt-1">{inrShort(stats.runway.liquid)} saved, with no income at all</p>
              <p className="text-sm mt-2" style={{ color: 'var(--sea)' }}>
                {stats.runway.monthsWithDreamIncome == null
                  ? 'Your dream income already covers your monthly costs'
                  : `${stats.runway.monthsWithDreamIncome > 36 ? 'Over 3 years' : `${stats.runway.monthsWithDreamIncome} months`} counting your side income`}
              </p>
            </div>
          )}
          {stats.upcomingMilestones.length > 0 && (
            <div className="panel p-5">
              <div className="text-sm text-ink-3">Coming up</div>
              {stats.upcomingMilestones.slice(0, 2).map((m) => {
                const weeksTo = Math.max(0, m.month * 4 - stats.currentWeek + 1);
                return <MilestoneCard key={m.month} milestone={m} startLabel={`${weeksTo ? `in ${plural(weeksTo, 'week')} · ` : ''}${monthLabel(roadmap.startDate, m.month)}`} />;
              })}
            </div>
          )}
          <div className="panel p-5">
            <div className="text-sm text-ink-3 flex items-center gap-2"><FiLifeBuoy /> Stuck on something?</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STUCK.map(([k, label]) => <Link key={k} to={`/coach?help=1&issue=${k}`} className="chip">{label}</Link>)}
              <Link to="/coach?help=1" className="chip">Something else</Link>
            </div>
            <p className="text-xs text-ink-3 mt-3">Your coach diagnoses it and shows exactly what a re-plan would change before you accept.</p>
          </div>
          <button className="text-sm text-ink-3 hover:text-ink inline-flex items-center gap-2 justify-self-start"
            onClick={async () => { const r = await api.dailyMessage(true).catch(() => null); if (r) qc.setQueryData(['coaching', 'daily'], r); qc.invalidateQueries({ queryKey: ['coaching', 'history'] }); }}>
            <FiRefreshCw /> New message from your coach
          </button>
        </aside>
      </div>
    </div>
  );
}
