import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { api, useDashboard } from '../lib/api.js';
import { inr, inrShort, monthLabel } from '../lib/format.js';
import { IncomeChart, SavingsChart } from '../components/Charts.jsx';
import { ProgressRing, MilestoneCard, Spinner, ErrorNote } from '../components/ui.jsx';

export default function Progress() {
  const { data } = useDashboard();
  const stat = useQuery({ queryKey: ['statistics', data?.progress?.updatedAt, data?.stats?.completed], queryFn: api.statistics, enabled: data?.stage === 'active' });
  if (!data?.roadmap) return <Spinner label="Loading progress" />;
  const { roadmap, stats, progress } = data;
  const fp = roadmap.financialProjection;

  return (
    <div>
      <header>
        <h1 className="text-2xl sm:text-3xl">Progress</h1>
        <p className="text-ink-2 mt-2">Week {stats.currentWeek} of {stats.totalWeeks} · month {stats.currentMonth} of {roadmap.totalMonths}</p>
      </header>

      <section className="mt-6 panel p-5 sm:p-7 grid sm:grid-cols-[auto_1fr] gap-6 items-center" aria-label="Summary">
        <ProgressRing value={stats.percent} size={140} stroke={11} label={`${stats.percent}% complete`}>
          <div><div className="num text-3xl">{stats.percent}%</div><div className="text-xs text-ink-3">toward your dream</div></div>
        </ProgressRing>
        <div>
          <p className="flex items-center gap-2 font-semibold" style={{ color: stats.onTrack ? 'var(--sea)' : 'var(--rose)' }}>
            {stats.onTrack ? <FiCheckCircle /> : <FiAlertCircle />}
            {stats.onTrack ? (stats.paceDelta > 5 ? `Ahead of schedule by ${stats.paceDelta}%` : 'On track') : `Behind plan by ${Math.abs(stats.paceDelta)}%`}
          </p>
          <dl className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-5">
            <div><dt className="text-sm text-ink-3">Actions done</dt><dd className="num text-2xl">{stats.completed}<span className="text-base text-ink-3">/{stats.totalActions}</span></dd></div>
            <div><dt className="text-sm text-ink-3">This week</dt><dd className="num text-2xl">{stats.weekPercent}%</dd></div>
            <div><dt className="text-sm text-ink-3">New income</dt><dd className="num text-2xl">{inrShort(stats.incomeTotal)}</dd></div>
            <div><dt className="text-sm text-ink-3">Saved for dream</dt><dd className="num text-2xl">{inrShort(stats.savingsTotal)}</dd></div>
          </dl>
          {stats.runway && (
            <p className="mt-4 text-sm text-ink-2">
              Runway: <span className="num text-ink">{stats.runway.monthsNoIncome} months</span> on {inr(stats.runway.liquid)} with no income
              {stats.runway.monthsWithDreamIncome == null ? ' — and your dream income already covers your costs.' : <>, <span className="num text-ink">{stats.runway.monthsWithDreamIncome > 36 ? 'over 3 years' : `${stats.runway.monthsWithDreamIncome} months`}</span> counting the {inr(stats.runway.dreamIncome30)} you earned on the side in the last 30 days.</>}
            </p>
          )}
        </div>
      </section>

      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <section className="panel p-5 sm:p-7 min-w-0">
          <h2 className="text-lg">Income against plan</h2>
          <p className="text-sm text-ink-3 mt-1 mb-4">New income above your starting {inr(fp.currentMonthlyIncome)}/month</p>
          <IncomeChart projection={fp} incomeLog={progress.incomeLog} startDate={roadmap.startDate} currentMonth={stats.currentMonth} />
        </section>
        <section className="panel p-5 sm:p-7 min-w-0">
          <h2 className="text-lg">Savings against plan</h2>
          <p className="text-sm text-ink-3 mt-1 mb-4">Cumulative savings, starting from {inr(data.profile.data.financial.savings)}</p>
          <SavingsChart projection={fp} savingsLog={progress.savingsLog} startSavings={data.profile.data.financial.savings} startDate={roadmap.startDate} currentMonth={stats.currentMonth} />
        </section>
      </div>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
        <LogForm />
        <section className="panel p-5 sm:p-7">
          <h2 className="text-lg">Weekly consistency</h2>
          <p className="text-sm text-ink-3 mt-1">Actions completed per week</p>
          {stat.data ? (
            <ol className="mt-5 flex items-end gap-1.5 h-36" aria-label="Actions completed per week">
              {stat.data.weekly.map((w) => (
                <li key={w.week} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative" title={`Week ${w.week}: ${w.done}/${w.total}`}>
                  <span className="sr-only">Week {w.week}: {w.done} of {w.total}</span>
                  <div className="w-full max-w-7 rounded-t-[4px]" style={{ height: `${Math.max(4, (w.done / w.total) * 100)}%`, background: w.week === stats.currentWeek ? 'var(--gold)' : 'var(--chart-savings)' }} />
                  <span className="text-[11px] text-ink-3">{w.week}</span>
                </li>
              ))}
            </ol>
          ) : <div className="h-36" />}
          <h2 className="text-lg mt-12">Milestones</h2>
          <div className="divide-y divide-line">
            {stats.achievedMilestones.map((m) => <MilestoneCard key={m.month} milestone={m} achieved startLabel={monthLabel(roadmap.startDate, m.month)} />)}
            {stats.upcomingMilestones.map((m) => <MilestoneCard key={m.month} milestone={m} startLabel={monthLabel(roadmap.startDate, m.month)} />)}
          </div>
        </section>
      </div>

      {progress.incomeLog.length > 0 && (
        <section className="mt-6 panel p-5 sm:p-7">
          <h2 className="text-lg">Income log</h2>
          <table className="w-full mt-3 text-sm">
            <thead className="text-left text-ink-3"><tr><th className="font-normal py-2">Date</th><th className="font-normal">Source</th><th className="font-normal text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-line">
              {progress.incomeLog.slice().reverse().map((x, i) => (
                <tr key={i}><td className="py-2.5 text-ink-2">{new Date(x.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td>{x.source}</td><td className="num text-right">{inr(x.amount)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function LogForm() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ incomeAmount: '', incomeSource: '', savingsAmount: '', date: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const body = { date: form.date };
    if (form.incomeAmount) { body.incomeAmount = Number(form.incomeAmount); body.incomeSource = form.incomeSource || 'Dream income'; }
    if (form.savingsAmount) body.savingsAmount = Number(form.savingsAmount);
    if (!body.incomeAmount && !body.savingsAmount) { setError(new Error('Enter an income or savings amount to log.')); return; }
    setBusy(true); setError(null); setDone('');
    try {
      const r = await api.logProgress(body);
      qc.setQueryData(['dashboard'], (d) => d && { ...d, progress: r.progress, stats: r.stats });
      setDone(`Logged${body.incomeAmount ? ` ${inr(body.incomeAmount)} income` : ''}${body.incomeAmount && body.savingsAmount ? ' and' : ''}${body.savingsAmount ? ` ${inr(body.savingsAmount)} savings` : ''}.`);
      setForm((f) => ({ ...f, incomeAmount: '', incomeSource: '', savingsAmount: '' }));
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <form id="log" onSubmit={submit} className="panel p-5 sm:p-7 scroll-mt-20">
      <h2 className="text-lg">Log income or savings</h2>
      <p className="text-sm text-ink-3 mt-1">Every rupee you log moves the charts and sharpens your coaching.</p>
      <div className="mt-5 grid sm:grid-cols-2 gap-4">
        <label className="grid gap-1.5"><span className="label">New income (₹)</span><input className="field" type="number" min="0" inputMode="numeric" value={form.incomeAmount} onChange={set('incomeAmount')} placeholder="15000" /></label>
        <label className="grid gap-1.5"><span className="label">Source</span><input className="field" value={form.incomeSource} onChange={set('incomeSource')} placeholder="Client, platform, product…" /></label>
        <label className="grid gap-1.5"><span className="label">Added to dream savings (₹)</span><input className="field" type="number" inputMode="numeric" value={form.savingsAmount} onChange={set('savingsAmount')} placeholder="10000" /></label>
        <label className="grid gap-1.5"><span className="label">Date</span><input className="field" type="date" value={form.date} onChange={set('date')} max={new Date().toISOString().slice(0, 10)} /></label>
      </div>
      <div className="mt-4"><ErrorNote error={error} /></div>
      {done && <p className="mt-3 text-sm" style={{ color: 'var(--sea)' }} role="status">{done}</p>}
      <button className="btn btn-primary mt-5" disabled={busy}>{busy ? 'Logging…' : 'Log it'}</button>
    </form>
  );
}
