import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiCheck } from 'react-icons/fi';
import { api, useDashboard } from '../lib/api.js';
import { CoachingMessage, COACH_TYPES, Spinner, ErrorNote, Empty, SourceNote } from '../components/ui.jsx';

export default function Coach() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('help') === '1' ? 'help' : 'messages';
  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">Your coach</h1>
          <p className="text-ink-2 mt-2">Daily guidance, and a re-plan whenever life gets in the way.</p>
        </div>
        <div role="tablist" className="flex gap-1.5">
          <button role="tab" aria-selected={tab === 'messages'} aria-pressed={tab === 'messages'} className="chip !py-2 !px-4" onClick={() => setParams({})}>Messages</button>
          <button role="tab" aria-selected={tab === 'help'} aria-pressed={tab === 'help'} className="chip !py-2 !px-4" onClick={() => setParams({ help: '1' })}>Get help</button>
        </div>
      </header>
      <div className="mt-6">{tab === 'help' ? <GetHelp /> : <Messages />}</div>
    </div>
  );
}

function Messages() {
  const qc = useQueryClient();
  const [archived, setArchived] = useState(false);
  const [type, setType] = useState('');
  const daily = useQuery({ queryKey: ['coaching', 'daily'], queryFn: () => api.dailyMessage() });
  const history = useQuery({ queryKey: ['coaching', 'history', archived], queryFn: () => api.coachingHistory(archived), enabled: !daily.isLoading });

  const update = async (m, patch) => {
    await api.coachingFeedback({ messageId: m.id, ...patch });
    qc.invalidateQueries({ queryKey: ['coaching'] });
  };

  if (daily.isLoading) return <Spinner label="Your coach is writing today’s message" />;
  const latest = daily.data?.message;
  const list = (history.data?.messages || []).filter((m) => (!type || m.type === type) && (archived || m.id !== latest?.id));

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
      <section aria-label="Latest message">
        <ErrorNote error={daily.error} onRetry={daily.refetch} />
        {latest && <CoachingMessage message={latest} featured onFeedback={(m, f) => update(m, { feedback: f })} />}
        <p className="text-sm text-ink-3 mt-4">Messages arrive each {`morning`} and adapt to your pace. Rate them so your coach learns what helps.</p>
      </section>
      <section className="panel p-5 sm:p-6" aria-label="Message history">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">{archived ? 'Archived' : 'History'}</h2>
          <button className="text-sm text-ink-3 hover:text-ink" onClick={() => setArchived((a) => !a)}>{archived ? 'Show history' : 'Show archived'}</button>
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by type">
          <button className="chip shrink-0" aria-pressed={!type} onClick={() => setType('')}>All</button>
          {Object.entries(COACH_TYPES).map(([k, v]) => <button key={k} className="chip shrink-0" aria-pressed={type === k} onClick={() => setType(k)}>{v.label}</button>)}
        </div>
        <div className="mt-2 divide-y divide-line max-h-[70vh] overflow-y-auto">
          {history.isLoading ? <Spinner label="Loading messages" /> : list.length ? list.map((m) => (
            <CoachingMessage key={m.id} message={m} onFeedback={(mm, f) => update(mm, { feedback: f })} onArchive={(mm) => update(mm, { archived: !mm.archived })} />
          )) : <p className="py-8 text-center text-ink-3">{archived ? 'Nothing archived yet.' : 'No earlier messages of this type.'}</p>}
        </div>
      </section>
    </div>
  );
}

function GetHelp() {
  const qc = useQueryClient();
  const { data: dash } = useDashboard();
  const issues = useQuery({ queryKey: ['issues'], queryFn: api.issues, staleTime: Infinity });
  const [issue, setIssue] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [applied, setApplied] = useState(null);

  async function ask(e) {
    e.preventDefault();
    if (!issue) { setError(new Error('Pick what is blocking you.')); return; }
    setBusy(true); setError(null);
    try { setResult(await api.requestAdvice({ issue, details })); } catch (err) { setError(err); } finally { setBusy(false); }
  }

  async function apply() {
    setBusy(true); setError(null);
    try {
      const r = await api.applyAdaptation(result.roadmapId, result.adaptationId);
      qc.setQueryData(['dashboard'], (d) => d && { ...d, roadmap: r.roadmap });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      setApplied(r.roadmap);
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  const reset = () => { setResult(null); setApplied(null); setIssue(''); setDetails(''); setError(null); };

  if (applied) {
    return (
      <div className="panel p-8 max-w-2xl rise">
        <div className="w-10 h-10 rounded-full grid place-items-center" style={{ background: 'var(--sea)', color: 'var(--bg)' }}><FiCheck size={20} strokeWidth={3} /></div>
        <h2 className="text-xl mt-4">Your roadmap is updated</h2>
        <p className="text-ink-2 mt-2">
          {result.advice.timelineImpactMonths === 0 ? 'Same timeline, sharper actions.' : `Timeline is now ${applied.totalMonths} months.`} The next actions in this week are your course correction — they’re marked on the roadmap.
        </p>
        <div className="mt-6 flex gap-3"><Link to="/roadmap" className="btn btn-primary">See the new plan</Link><button className="btn btn-ghost" onClick={reset}>Done</button></div>
      </div>
    );
  }

  if (result) {
    const a = result.advice;
    const from = dash?.roadmap?.totalMonths;
    return (
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6 items-start rise">
        <section className="panel p-6 sm:p-7">
          <button className="text-sm text-ink-3 hover:text-ink inline-flex items-center gap-1.5" onClick={() => setResult(null)}><FiArrowLeft /> Change what I described</button>
          <div className="flex items-center justify-between gap-3 mt-4"><h2 className="text-xl">{a.issueLabel}</h2><SourceNote source={result.source} /></div>
          <p className="mt-3 text-lg leading-relaxed">{a.diagnosis}</p>
          <h3 className="text-base mt-6">Likely causes</h3>
          <ul className="mt-2 grid gap-1.5 text-ink-2 list-disc pl-5">{a.likelyCauses.map((x) => <li key={x}>{x}</li>)}</ul>
          <h3 className="text-base mt-6">What to do</h3>
          <ul className="mt-2 grid gap-1.5 text-ink-2 list-disc pl-5">{a.solutions.map((x) => <li key={x}>{x}</li>)}</ul>
          {a.pivotStrategies?.length > 0 && <>
            <h3 className="text-base mt-6">If that doesn’t work</h3>
            <ul className="mt-2 grid gap-1.5 text-ink-2 list-disc pl-5">{a.pivotStrategies.map((x) => <li key={x}>{x}</li>)}</ul>
          </>}
        </section>
        <section className="panel p-6 sm:p-7">
          <h2 className="text-lg">Proposed course correction</h2>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-center"><div className="num text-3xl">{from}</div><div className="text-xs text-ink-3">months now</div></div>
            <div className="flex-1 h-px bg-line relative"><span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-surface px-2 text-xs text-ink-3">{a.timelineImpactMonths > 0 ? `+${a.timelineImpactMonths}` : a.timelineImpactMonths}</span></div>
            <div className="text-center"><div className="num text-3xl text-gold-text">{a.newTotalMonths}</div><div className="text-xs text-ink-3">months after</div></div>
          </div>
          <p className="text-sm text-ink-2 mt-4">{a.encouragement}</p>
          <h3 className="text-base mt-6">New actions this week</h3>
          <ol className="mt-2 grid gap-2">{a.alternativeActions.map((x, i) => <li key={x} className="flex gap-3"><span className="num text-gold-text">{i + 1}</span>{x}</li>)}</ol>
          <div className="mt-4"><ErrorNote error={error} /></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={apply} disabled={busy}>{busy ? 'Re-planning…' : 'Apply to my roadmap'}</button>
            <button className="btn btn-ghost" onClick={reset}>Not now</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={ask} className="max-w-3xl">
      <h2 className="text-xl">What’s getting in the way?</h2>
      <p className="text-ink-2 mt-2">Pick the closest match, then say what happened. Your coach will diagnose it and propose an updated plan you can accept or skip.</p>
      {issues.isLoading ? <Spinner /> : (
        <div role="radiogroup" aria-label="Obstacle" className="mt-6 grid sm:grid-cols-2 gap-2.5">
          {issues.data?.issues.map((i) => (
            <button type="button" key={i.key} role="radio" aria-checked={issue === i.key} onClick={() => setIssue(i.key)}
              className="text-left px-4 py-3.5 rounded-xl border transition-colors" style={issue === i.key ? { borderColor: 'var(--gold)', background: 'var(--surface-2)' } : { borderColor: 'var(--line)' }}>
              {i.label}
            </button>
          ))}
        </div>
      )}
      <label className="grid gap-1.5 mt-6"><span className="label">Describe the situation</span>
        <textarea className="field resize-none" rows={4} maxLength={1000} value={details} onChange={(e) => setDetails(e.target.value)}
          placeholder="I sent 25 pitches over two weeks and got one reply, which went nowhere." />
      </label>
      <div className="mt-4"><ErrorNote error={error} /></div>
      <button className="btn btn-primary mt-6" disabled={busy}>{busy ? 'Thinking it through…' : 'Get advice'}</button>
      {!dash?.roadmap && <Empty title="No roadmap yet" body="Generate a roadmap first so your coach has a plan to adjust." />}
    </form>
  );
}
