import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { FiAlertTriangle, FiCheckCircle, FiArrowUpRight } from 'react-icons/fi';
import { api, useDashboard } from '../lib/api.js';
import { inr, feasibilityTone, confidenceLabel } from '../lib/format.js';
import { ScoreBar, Spinner, ErrorNote, SourceNote } from '../components/ui.jsx';
import { starPath } from '../components/Constellation.jsx';

const COMPONENTS = [['financial', 'Financial'], ['skills', 'Skills'], ['family', 'Family'], ['location', 'Location'], ['market', 'Market demand'], ['timeline', 'Timeline']];
const GEN_STEPS = ['Laying out your phases', 'Writing weekly actions', 'Projecting income and savings', 'Mapping risks and resources'];

function useCountUp(target, ms = 1200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(target); return; }
    let raf; const start = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - start) / ms); setV(Math.round(target * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export default function Feasibility() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const f = data?.dream?.feasibility;
  const pct = useCountUp(f?.feasibilityPercent || 0);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setStep((s) => Math.min(s + 1, GEN_STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, [busy]);

  if (!f) return <Spinner label="Loading your feasibility report" />;
  const tone = feasibilityTone(f.feasibilityPercent);
  const t = f.components.timeline;

  async function generate() {
    setBusy(true); setError(null); setStep(0);
    try {
      await api.generateRoadmap(data.dream.id);
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      nav('/roadmap?new=1');
    } catch (e) { setError(e); setBusy(false); }
  }

  if (busy) {
    return (
      <div className="grid place-items-center py-24 text-center" role="status">
        <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true">
          <path d="M10,60 C35,60 35,25 60,25 C85,25 85,50 110,20" fill="none" stroke="var(--gold)" strokeWidth="2.5" className="draw-path" style={{ '--len': 160, animationIterationCount: 'infinite', animationDuration: '2.6s' }} />
          <circle cx="10" cy="60" r="4" fill="var(--gold)" /><circle cx="60" cy="25" r="4" fill="var(--gold)" />
          <path d={starPath(110, 20, 8)} fill="var(--gold)" className="halo" />
        </svg>
        <h1 className="text-2xl mt-8">Charting your roadmap</h1>
        <ol className="mt-6 grid gap-2 text-ink-3">
          {GEN_STEPS.map((s, i) => <li key={s} className={i <= step ? 'text-ink' : ''}>{i < step ? '✓ ' : i === step ? '… ' : ''}{s}</li>)}
        </ol>
      </div>
    );
  }

  return (
    <div className="pt-4 sm:pt-8">
      <p className="text-ink-3">Your dream</p>
      <h1 className="text-2xl sm:text-3xl max-w-[30ch] mt-1">“{data.dream.description}”</h1>

      <section className="mt-10 grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
        <div className="panel p-7 sm:p-9 flex flex-col">
          <div className="flex items-center justify-between gap-3">
            <span className="chip !cursor-default">{confidenceLabel[f.confidenceLevel]}</span>
            <SourceNote source={f.source} />
          </div>
          <div className="mt-6 flex items-end gap-3">
            <span className="num leading-none text-[5.5rem] sm:text-[7rem]" style={{ color: tone.color }} aria-label={`${f.feasibilityPercent} percent feasible`}>{pct}<span className="text-[0.45em]">%</span></span>
          </div>
          <p className="text-ink-3 mt-1">feasible · {tone.label.toLowerCase()} · {f.archetypeLabel.toLowerCase()}</p>
          <p className="text-xl mt-6 leading-snug">{f.verdict}</p>

          <div className="mt-8">
            <div className="text-sm text-ink-3 mb-3">Timeline</div>
            <div className="relative h-2 rounded-full bg-surface-2">
              <div className="absolute h-2 rounded-full" style={{ left: `${(t.minMonths / t.maxMonths) * 100}%`, right: 0, background: 'var(--line)' }} />
              <div className="absolute -top-1.5 w-5 h-5 rounded-full border-4" style={{ left: `calc(${(t.recommendedMonths / t.maxMonths) * 100}% - 10px)`, background: 'var(--gold)', borderColor: 'var(--surface)' }} />
            </div>
            <div className="flex justify-between text-sm mt-3">
              <span><span className="num">{t.minMonths}</span> <span className="text-ink-3">mo fastest</span></span>
              <span className="text-gold-text font-semibold"><span className="num">{t.recommendedMonths}</span> mo recommended</span>
              <span><span className="num">{t.maxMonths}</span> <span className="text-ink-3">mo steady</span></span>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <ErrorNote error={error} />
            <div className="flex flex-wrap gap-3 mt-3">
              {data.stage === 'active'
                ? <Link to="/roadmap" className="btn btn-primary">Open my roadmap</Link>
                : <button onClick={generate} className="btn btn-primary">Generate my roadmap</button>}
              <Link to="/dream" className="btn btn-ghost">Change my dream</Link>
            </div>
          </div>
        </div>

        <div className="panel p-6 sm:p-7">
          <h2 className="text-lg">Six ways we tested it</h2>
          <div className="divide-y divide-line">
            {COMPONENTS.map(([k, l]) => f.components[k] && <ScoreBar key={k} label={l} score={f.components[k].score} explanation={f.components[k].explanation} />)}
          </div>
        </div>
      </section>

      <section className="mt-6 grid md:grid-cols-3 gap-6">
        <div className="panel p-6">
          <h2 className="text-lg">Obstacles to plan for</h2>
          <ul className="mt-3 grid gap-3">{f.keyObstacles.map((o) => <li key={o} className="flex gap-2.5"><FiAlertTriangle className="mt-1 shrink-0" style={{ color: 'var(--rose)' }} />{o}</li>)}</ul>
        </div>
        <div className="panel p-6">
          <h2 className="text-lg">What’s on your side</h2>
          <ul className="mt-3 grid gap-3">{f.successFactors.map((o) => <li key={o} className="flex gap-2.5"><FiCheckCircle className="mt-1 shrink-0" style={{ color: 'var(--sea)' }} />{o}</li>)}</ul>
        </div>
        <div className="panel p-6">
          <h2 className="text-lg">First moves</h2>
          <ul className="mt-3 grid gap-3">{f.recommendations.map((o) => <li key={o} className="flex gap-2.5"><FiArrowUpRight className="mt-1 shrink-0 text-violet" />{o}</li>)}</ul>
          {f.resourceRequirements?.money > 0 && (
            <p className="text-sm text-ink-3 mt-5">Needs about {inr(f.resourceRequirements.money)} and {f.resourceRequirements.hoursPerWeek} hours a week.</p>
          )}
        </div>
      </section>

      {f.successStory && (
        <figure className="mt-6 panel p-7 sm:p-9 grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"><path d={starPath(28, 28, 22)} fill="var(--gold)" /></svg>
          <div>
            <blockquote className="text-xl sm:text-2xl font-display leading-snug">“{f.successStory.quote}”</blockquote>
            <figcaption className="mt-3 text-ink-2">{f.successStory.name}{f.successStory.age ? `, ${f.successStory.age}` : ''}{f.successStory.from ? ` from ${f.successStory.from}` : ''} — {f.successStory.outcome}</figcaption>
          </div>
        </figure>
      )}
    </div>
  );
}
