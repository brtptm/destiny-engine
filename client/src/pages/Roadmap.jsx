import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { FiCpu, FiRefreshCw, FiUsers, FiBookOpen, FiTool, FiUserPlus, FiShield } from 'react-icons/fi';
import { api, useDashboard, useHealth } from '../lib/api.js';
import { useToggleAction, todayIndex } from '../lib/hooks.js';
import { inr, inrShort, monthLabel, addMonths, plural } from '../lib/format.js';
import Constellation, { starPath } from '../components/Constellation.jsx';
import { ProjectionChart } from '../components/Charts.jsx';
import { ActionChecklist, ProgressRing, Spinner, ErrorNote, Celebration, SourceNote } from '../components/ui.jsx';

export default function Roadmap() {
  const { data } = useDashboard();
  const { data: health } = useHealth();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { toggle, busyId, error: toggleError } = useToggleAction();
  const [selected, setSelected] = useState(null);
  const [week, setWeek] = useState(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState(null);
  const celebrate = params.get('new') === '1';

  const roadmap = data?.roadmap;
  const stats = data?.stats;
  useEffect(() => {
    if (stats && selected == null) { setSelected(stats.currentMonth); setWeek(stats.currentWeek); }
  }, [stats, selected]);

  if (!roadmap || !stats || selected == null) return <Spinner label="Loading your roadmap" />;

  const month = roadmap.months.find((m) => m.month === selected) || roadmap.months[0];
  const weeks = month.weeks || [];
  const activeWeek = weeks.find((w) => w.weekNumber === week) || weeks[0];
  const progressMonths = stats.percent / 100 * roadmap.totalMonths;
  const endDate = addMonths(roadmap.startDate, roadmap.totalMonths);
  const nextMilestone = stats.upcomingMilestones[0];

  function pick(m) {
    setSelected(m);
    setWeek(m === stats.currentMonth ? stats.currentWeek : (m - 1) * 4 + 1);
  }

  async function personalise() {
    setPlanning(true); setPlanError(null);
    try {
      const r = await api.planMonth(roadmap.id, month.month);
      qc.setQueryData(['dashboard'], (d) => d && { ...d, roadmap: r.roadmap });
    } catch (e) { setPlanError(e); } finally { setPlanning(false); }
  }

  return (
    <div>
      {celebrate && (
        <Celebration title="Your dream is achievable" body={`${plural(roadmap.totalMonths, 'month')}, ${roadmap.phases.length} phases, ${stats.totalActions} specific actions. Week one starts today.`}
          onClose={() => setParams({}, { replace: true })} />
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-ink-3 text-sm">Your destiny roadmap · {plural(roadmap.totalMonths, 'month')} · ends {endDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          <h1 className="text-xl sm:text-3xl mt-1 max-w-[34ch]">{roadmap.dreamSummary}</h1>
        </div>
        <SourceNote source={roadmap.source} />
      </header>

      <section className="panel mt-6 pt-4 pb-2 px-3 sm:px-5" aria-label="Timeline">
        <Constellation months={roadmap.months} startDate={roadmap.startDate} progressMonths={progressMonths}
          currentMonth={stats.currentMonth} selected={selected} onSelect={pick} />
        <ol className="flex flex-wrap gap-x-6 gap-y-1 px-2 pb-3 text-sm text-ink-3" aria-label="Phases">
          {roadmap.phases.map((p) => <li key={p.phaseNumber}><span className="num text-ink-2">{p.phaseNumber}</span> {p.name} <span className="text-ink-3">({p.months.length === 1 ? `month ${p.months[0]}` : `months ${p.months[0]}–${p.months.at(-1)}`})</span></li>)}
        </ol>
      </section>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        {/* Month detail */}
        <section className="panel p-5 sm:p-7 min-w-0" aria-labelledby="month-h">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-3">Month {month.month} · {monthLabel(roadmap.startDate, month.month)} · {month.phase}{month.month === stats.currentMonth ? ' · you are here' : ''}</p>
              <h2 id="month-h" className="text-xl sm:text-2xl mt-1">{month.title}</h2>
              <p className="text-ink-2 mt-2 max-w-[60ch]">{month.focus}</p>
            </div>
            {month.financial && (
              <dl className="flex gap-5 text-right">
                <div><dt className="text-xs text-ink-3">Planned income</dt><dd className="num text-lg">{inrShort(month.financial.income)}</dd></div>
                <div><dt className="text-xs text-ink-3">Planned savings</dt><dd className="num text-lg">{inrShort(month.financial.savings)}</dd></div>
              </dl>
            )}
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3">
            <div className="panel-quiet p-4"><div className="text-xs text-ink-3">Goal this month</div><div className="mt-1">{month.goal}</div></div>
            {month.milestone && (
              <div className="panel-quiet p-4 flex gap-3">
                <svg width="22" height="22" viewBox="0 0 22 22" className="shrink-0 mt-0.5" aria-hidden="true"><path d={starPath(11, 11, 9)} fill="var(--gold)" /></svg>
                <div><div className="text-xs text-ink-3">Milestone</div><div className="mt-1 font-semibold">{month.milestone.title}</div></div>
              </div>
            )}
          </div>

          {weeks.length > 0 && (
            <>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <div role="tablist" aria-label="Weeks" className="flex gap-1.5 overflow-x-auto">
                  {weeks.map((w) => {
                    const done = data.progress.completedWeeks.includes(w.weekNumber);
                    return (
                      <button key={w.weekNumber} role="tab" aria-selected={activeWeek.weekNumber === w.weekNumber} onClick={() => setWeek(w.weekNumber)}
                        className="chip !py-1.5" aria-pressed={activeWeek.weekNumber === w.weekNumber}>
                        Week {w.weekNumber}{done ? ' ✓' : w.weekNumber === stats.currentWeek ? ' · now' : ''}
                      </button>
                    );
                  })}
                </div>
                {health?.ai?.enabled && month.weeksSource !== 'claude' && (
                  <button className="btn btn-ghost btn-sm" onClick={personalise} disabled={planning}>
                    {planning ? <><FiRefreshCw className="spin" /> Personalising…</> : <><FiCpu /> Personalise this month with Claude</>}
                  </button>
                )}
              </div>
              <ErrorNote error={planError || toggleError} />
              <div className="mt-4" role="tabpanel">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base">{activeWeek.weeklyGoal}</h3>
                  <span className="text-sm text-ink-3">{activeWeek.expectedOutcome}</span>
                </div>
                {activeWeek.weekNumber > stats.currentWeek && <p className="text-sm text-ink-3 mt-2">Preview — this week unlocks when you complete week {activeWeek.weekNumber - 1}.</p>}
                <div className="mt-2">
                  <ActionChecklist actions={activeWeek.actions} completed={data.progress.completedActions} onToggle={toggle} busyId={busyId}
                    readOnly={activeWeek.weekNumber > stats.currentWeek} todayIdx={activeWeek.weekNumber === stats.currentWeek ? todayIndex() : undefined} />
                </div>
              </div>
            </>
          )}
        </section>

        {/* Sidebar */}
        <aside className="grid gap-4 lg:sticky lg:top-6">
          <div className="panel p-5 flex items-center gap-4">
            <ProgressRing value={stats.percent} size={96} stroke={8} label={`${stats.percent}% of the journey done`}>
              <span className="num text-xl">{stats.percent}%</span>
            </ProgressRing>
            <div className="text-sm">
              <div className="font-semibold">Week {stats.currentWeek} of {stats.totalWeeks}</div>
              <div className="text-ink-3 mt-1">{plural(stats.weeksRemaining, 'week')} to go</div>
              <div className="mt-1" style={{ color: stats.onTrack ? 'var(--sea)' : 'var(--rose)' }}>{stats.onTrack ? 'On track' : 'Behind plan'}</div>
            </div>
          </div>
          <div className="panel p-5">
            <div className="text-sm text-ink-3">This week</div>
            <div className="num text-2xl mt-1">{stats.weekDone}<span className="text-ink-3 text-base"> / {stats.weekTotal} actions</span></div>
            <Link to="/today" className="text-sm text-gold-text font-semibold mt-2 inline-block">Go to today’s actions</Link>
          </div>
          {nextMilestone && (
            <div className="panel p-5">
              <div className="text-sm text-ink-3">Next milestone</div>
              <div className="font-semibold mt-1">{nextMilestone.title}</div>
              <div className="text-sm text-ink-3 mt-1">Month {nextMilestone.month} · {monthLabel(roadmap.startDate, nextMilestone.month)}</div>
            </div>
          )}
          <div className="panel p-5 text-sm">
            <div className="text-ink-3">Hit an obstacle?</div>
            <p className="mt-1">Tell your coach what changed and get a re-planned timeline.</p>
            <Link to="/coach?help=1" className="btn btn-ghost btn-sm mt-3">Get help</Link>
          </div>
        </aside>
      </div>

      <section className="mt-6 grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-6">
        <div className="panel p-5 sm:p-7 min-w-0">
          <h2 className="text-lg">Financial projection</h2>
          <p className="text-sm text-ink-3 mt-1 mb-4">From {inr(roadmap.financialProjection.currentMonthlyIncome)} to {inr(roadmap.financialProjection.targetMonthlyIncome)} a month · {inrShort(roadmap.financialProjection.totalWealthGain)} added over the plan</p>
          <ProjectionChart projection={roadmap.financialProjection} startDate={roadmap.startDate} />
        </div>
        <div className="panel p-5 sm:p-7">
          <h2 className="text-lg flex items-center gap-2"><FiShield className="text-ink-3" /> Risks and how to handle them</h2>
          <ul className="mt-4 divide-y divide-line">
            {roadmap.riskAnalysis.obstacles.map((o) => (
              <li key={o.obstacle} className="py-3">
                <div className="flex items-start justify-between gap-3"><span className="font-semibold">{o.obstacle}</span>
                  <span className="text-xs shrink-0 mt-1" style={{ color: o.likelihood === 'high' ? 'var(--rose)' : o.likelihood === 'medium' ? 'var(--gold-text)' : 'var(--ink-3)' }}>{o.likelihood} likelihood</span></div>
                <p className="text-sm text-ink-2 mt-1">{o.mitigation}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 panel p-5 sm:p-7">
        <h2 className="text-lg">Resources for the journey</h2>
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ResourceList icon={FiTool} title="Tools" items={roadmap.resources.tools.map((t) => `${t.name}${t.type === 'paid' ? ' (paid)' : ''}`)} />
          <ResourceList icon={FiUsers} title="Communities" items={roadmap.resources.communities} />
          <ResourceList icon={FiBookOpen} title="Learning" items={roadmap.resources.courses} />
          <ResourceList icon={FiUserPlus} title="People to meet" items={roadmap.resources.people} />
        </div>
      </section>

      {roadmap.adaptations?.length > 0 && (
        <section className="mt-6 panel p-5 sm:p-7">
          <h2 className="text-lg">Course corrections</h2>
          <ul className="mt-3 divide-y divide-line">
            {roadmap.adaptations.slice().reverse().map((a) => (
              <li key={a.date} className="py-3 flex flex-wrap justify-between gap-2">
                <span><span className="font-semibold">{a.issue}</span><span className="text-ink-2"> — {a.summary}</span></span>
                <span className="text-sm text-ink-3">{new Date(a.date).toLocaleDateString('en-IN')} · {a.timelineChange === 0 ? 'timeline unchanged' : `${a.fromMonths} → ${a.toMonths} months`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {roadmap.motivationalMessage && <p className="mt-10 text-center font-display text-lg text-ink-2 max-w-[44ch] mx-auto">{roadmap.motivationalMessage}</p>}
    </div>
  );
}

function ResourceList({ icon: Icon, title, items }) {
  return (
    <div>
      <h3 className="text-sm font-semibold font-sans flex items-center gap-2"><Icon className="text-gold-text" />{title}</h3>
      <ul className="mt-2 grid gap-1.5 text-sm text-ink-2">{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  );
}
