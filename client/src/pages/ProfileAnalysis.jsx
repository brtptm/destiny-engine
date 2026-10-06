import { Link } from 'react-router';
import { FiCheckCircle, FiTarget, FiArrowUpRight } from 'react-icons/fi';
import { useDashboard } from '../lib/api.js';
import { ProgressRing, ProgressBar, Spinner, SourceNote } from '../components/ui.jsx';

const tone = (v) => (v >= 70 ? 'var(--sea)' : v >= 45 ? 'var(--gold)' : 'var(--rose)');

export default function ProfileAnalysis() {
  const { data } = useDashboard();
  const a = data?.profile?.analysis;
  if (!a) return <Spinner label="Reading your profile" />;
  const name = data.profile.data.basicInfo.name?.split(' ')[0];

  return (
    <div className="pt-4 sm:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">{name ? `${name}, here’s where you stand` : 'Here’s where you stand'}</h1>
          <p className="text-ink-2 mt-3 max-w-[60ch]">{a.financialAnalysis}</p>
        </div>
        <SourceNote source={a.source} />
      </div>

      <section className="mt-10 grid md:grid-cols-3 gap-5" aria-label="Scores">
        {[
          ['Financial health', a.financialHealth, 'Savings rate, runway, debt and investments'],
          ['Overall readiness', a.overallReadiness, 'Money, time, motivation and skills together'],
          ['Feasibility index', a.feasibilityIndex, 'How ready you are for a big change'],
        ].map(([label, v, sub]) => (
          <div key={label} className="panel p-6 flex items-center gap-5">
            <ProgressRing value={v} size={104} stroke={9} tone={tone(v)} label={`${label}: ${v} out of 100`}>
              <span className="num text-2xl">{v}</span>
            </ProgressRing>
            <div>
              <div className="font-semibold">{label}</div>
              <div className="text-sm text-ink-3 mt-1">{sub}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="mt-5 grid lg:grid-cols-[1.2fr_1fr] gap-5">
        <div className="panel p-6">
          <h2 className="text-lg">Your numbers</h2>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            <div><dt className="text-sm text-ink-3">Savings rate</dt><dd className="num text-2xl mt-1">{a.metrics.savingsRate}%</dd></div>
            <div><dt className="text-sm text-ink-3">Runway</dt><dd className="num text-2xl mt-1">{a.metrics.emergencyMonths}<span className="text-base text-ink-3"> mo</span></dd></div>
            <div><dt className="text-sm text-ink-3">Debt / income</dt><dd className="num text-2xl mt-1">{a.metrics.debtToIncome}×</dd></div>
          </dl>
          <h2 className="text-lg mt-8">Skills and market value</h2>
          <p className="text-ink-2 mt-2 text-sm">{a.skillsAssessment.summary}</p>
          <div className="mt-4 grid gap-3">
            {a.skillsAssessment.skillScores.map((s) => (
              <div key={s.skill}>
                <div className="flex justify-between text-sm mb-1"><span>{s.skill}</span><span className="text-ink-3">{s.demand === 'high' ? 'High demand' : 'Steady demand'} · <span className="num text-ink">{s.value}</span></span></div>
                <ProgressBar value={s.value} tone={s.demand === 'high' ? 'var(--sea)' : 'var(--violet)'} height={6} label={`${s.skill} market value`} />
              </div>
            ))}
            {!a.skillsAssessment.skillScores.length && <p className="text-sm text-ink-3">Add skills to your profile to see their market value.</p>}
          </div>
          <div className="mt-6 grid sm:grid-cols-2 gap-4 text-sm">
            <p><span className="text-ink-3 block">Time</span>{a.timeAvailability}</p>
            <p><span className="text-ink-3 block">Family</span>{a.familySituation}</p>
          </div>
        </div>

        <div className="grid gap-5 content-start">
          <div className="panel p-6">
            <h2 className="text-lg">Strengths to build on</h2>
            <ul className="mt-3 grid gap-2.5">{a.keyStrengths.map((s) => <li key={s} className="flex gap-2.5"><FiCheckCircle className="mt-1 shrink-0" style={{ color: 'var(--sea)' }} />{s}</li>)}</ul>
          </div>
          {a.areasToImprove.length > 0 && (
            <div className="panel p-6">
              <h2 className="text-lg">Worth strengthening</h2>
              <ul className="mt-3 grid gap-2.5">{a.areasToImprove.map((s) => <li key={s} className="flex gap-2.5"><FiTarget className="mt-1 shrink-0 text-gold-text" />{s}</li>)}</ul>
            </div>
          )}
          <div className="panel p-6">
            <h2 className="text-lg">Recommendations</h2>
            <ul className="mt-3 grid gap-2.5">{a.recommendations.map((s) => <li key={s} className="flex gap-2.5"><FiArrowUpRight className="mt-1 shrink-0 text-violet" />{s}</li>)}</ul>
          </div>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link to="/dream" className="btn btn-primary">Name your dream</Link>
        <Link to="/setup" className="btn btn-ghost">Edit my answers</Link>
      </div>
    </div>
  );
}
