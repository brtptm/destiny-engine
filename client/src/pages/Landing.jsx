import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { FiCheck, FiClock, FiMap, FiActivity, FiMessageCircle, FiRefreshCw, FiPieChart, FiCompass } from 'react-icons/fi';
import { api, auth } from '../lib/api.js';
import Constellation from '../components/Constellation.jsx';
import Cosmos from '../components/three/Cosmos.jsx';
import { Logo, ErrorNote } from '../components/ui.jsx';

const SAMPLE = [
  { month: 1, phase: 'Foundation', title: 'First clients' },
  { month: 2, phase: 'Foundation', title: '₹1L side income', milestone: true },
  { month: 3, phase: 'Growth', title: 'Notice served' },
  { month: 4, phase: 'Growth', title: 'Final prep', milestone: true },
  { month: 5, phase: 'Transition', title: 'Move to Goa' },
  { month: 6, phase: 'Transition', title: 'Settle in', milestone: true },
  { month: 7, phase: 'Optimise', title: 'Scale' },
  { month: 8, phase: 'Optimise', title: '₹1.5L/month', milestone: true },
];

const STEPS = [
  { icon: FiCompass, title: 'Map your life', body: 'Money, work, family, health and time — about 8 minutes. Skip anything you’d rather not share.' },
  { icon: FiPieChart, title: 'Name your dream', body: 'Write it in your own words or start from one of 50 dreams other people have already reached.' },
  { icon: FiActivity, title: 'See if it adds up', body: 'A feasibility score across money, skills, family, location, market and time — with the obstacles named.' },
  { icon: FiMap, title: 'Walk the roadmap', body: 'Month-by-month phases, 7 actions a week, and a coach that adjusts the plan when life happens.' },
];

const STORIES = [
  { quote: 'The plan made the scary part boring — and that is exactly what I needed.', who: 'Priya, 34', what: 'Gurugram → Goa in 7 months, remote brand strategist' },
  { quote: 'I stopped checking subscribers and started checking retention. Everything changed.', who: 'Ananya, 27', what: '180K subscribers, full-time creator in 13 months' },
  { quote: 'My HR background became my edge, not my baggage.', who: 'Meera, 30', what: 'HR to data analytics with a 40% raise' },
];

export default function Landing() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const signedIn = auth.signedIn();

  async function tryDemo() {
    setBusy(true); setError(null);
    try {
      const { token } = await api.demo();
      auth.setToken(token);
      qc.clear();
      nav('/today');
    } catch (e) { setError(e); setBusy(false); }
  }

  return (
    <div className="sky min-h-dvh">
      <div className="relative isolate overflow-hidden">
        <Cosmos variant="hero" className="-z-10" />
        {/* Scrims keep the copy readable over the scene */}
        <div className="absolute inset-0 -z-10 pointer-events-none hidden lg:block" style={{ background: 'linear-gradient(90deg, var(--bg) 0%, color-mix(in srgb, var(--bg) 78%, transparent) 34%, transparent 62%)' }} />
        <div className="absolute inset-0 -z-10 pointer-events-none lg:hidden" style={{ background: 'color-mix(in srgb, var(--bg) 62%, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 h-40 -z-10 pointer-events-none" style={{ background: 'linear-gradient(transparent, var(--bg))' }} />

        <header className="max-w-[1180px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-2">
            {signedIn
              ? <Link to="/today" className="btn btn-ghost btn-sm glass">Open my roadmap</Link>
              : <><Link to="/signin" className="btn btn-sm text-ink-2 hover:text-ink">Sign in</Link><Link to="/signup" className="btn btn-primary btn-sm">Start your journey</Link></>}
          </nav>
        </header>

        <section className="max-w-[1180px] mx-auto px-4 sm:px-8 min-h-[78dvh] lg:min-h-[680px] flex items-center pt-6 pb-28">
          <div className="max-w-xl rise">
            <h1 className="text-[2.4rem] leading-[1.06] sm:text-5xl lg:text-[3.6rem] font-semibold">
              Turn your dream into a map you can walk.
            </h1>
            <p className="mt-6 text-lg text-ink-2 max-w-[48ch]">
              Tell Destiny Engine where your life is today and where you want it to be. It checks the numbers, charts the route month by month, and coaches you every day until you arrive.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={signedIn ? '/today' : '/signup'} className="btn btn-primary">Start your journey</Link>
              <button onClick={tryDemo} disabled={busy} className="btn btn-ghost glass">{busy ? 'Opening demo…' : 'Explore a live demo'}</button>
            </div>
            <div className="mt-4 max-w-md"><ErrorNote error={error} /></div>
            <p className="mt-6 text-sm text-ink-3">Free for the hackathon. Your data stays on your server.</p>
          </div>
        </section>
      </div>

      <main>
        {/* Product preview, floating over the fold */}
        <section className="relative z-10 max-w-[1180px] mx-auto px-4 sm:px-8 -mt-20 pb-16 grid lg:grid-cols-[1fr_1.15fr] gap-10 items-center">
          <div className="lg:pr-6">
            <h2 className="text-2xl sm:text-3xl max-w-[18ch]">One dream, one week at a time</h2>
            <p className="text-ink-2 mt-4 max-w-[46ch]">Aarav wants to leave Delhi for Goa with his family. Destiny Engine scored it 96% feasible, split it into four phases, and handed him seven concrete actions for this week.</p>
          </div>
          <div className="panel glass p-5 sm:p-6 min-w-0 float shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className="text-sm text-ink-3">Aarav’s dream</div>
                <div className="font-semibold">Move to Goa, freelance, live by the beach</div>
              </div>
              <div className="text-right">
                <div className="num text-3xl" style={{ color: 'var(--sea)' }}>96%</div>
                <div className="text-xs text-ink-3">feasible · 8 months</div>
              </div>
            </div>
            <div className="mt-4 -mx-2">
              <Constellation months={SAMPLE} progressMonths={1.6} currentMonth={2} compact fluid />
            </div>
            <div className="mt-3 panel-quiet p-4">
              <div className="text-sm text-ink-3 mb-2">Week 6 · this week’s actions</div>
              {[
                ['Pitch 2 existing clients on a monthly retainer', true],
                ['Turn your best campaign into a case study', true],
                ['Research Goa: rent, internet, schools', false],
              ].map(([t, done]) => (
                <div key={t} className="flex items-center gap-3 py-1.5 text-sm">
                  <span className="w-5 h-5 rounded-md grid place-items-center border shrink-0" style={{ background: done ? 'var(--sea)' : 'transparent', borderColor: done ? 'var(--sea)' : 'var(--ink-3)', color: 'var(--bg)' }}>{done && <FiCheck size={13} strokeWidth={3} />}</span>
                  <span className={done ? 'text-ink-3 line-through' : ''}>{t}</span>
                  <span className="ml-auto text-ink-3 inline-flex items-center gap-1 text-xs"><FiClock size={11} />{done ? '1h' : '2h'}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-line">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl max-w-[22ch]">From “someday” to week one in four steps</h2>
            <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="num text-gold-text text-xl">{i + 1}</span>
                    <span className="h-px flex-1 bg-line" aria-hidden="true" />
                    <s.icon className="text-ink-3" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg mt-4">{s.title}</h3>
                  <p className="text-ink-2 mt-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What keeps you moving */}
        <section className="border-t border-line">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-16 sm:py-20 grid lg:grid-cols-[1fr_1.3fr] gap-12">
            <div>
              <h2 className="text-2xl sm:text-3xl max-w-[18ch]">A plan that notices when life changes</h2>
              <p className="text-ink-2 mt-4 max-w-[46ch]">Most plans die in week three. Destiny Engine watches your pace, your income and your savings against the projection, and re-plans with you instead of letting you drift.</p>
            </div>
            <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
              {[
                [FiMessageCircle, 'Daily coaching', 'A morning nudge with today’s action, plus tips, opportunities and honest warnings when you slip.'],
                [FiRefreshCw, 'Adaptive planning', 'Hit a wall — no clients, a family worry, a money shock? Describe it and get a re-planned timeline.'],
                [FiActivity, 'Progress you can see', 'Weekly checklists, income and savings against plan, and milestone celebrations that feel earned.'],
                [FiPieChart, 'Real numbers', 'Financial health, runway and feasibility computed from your inputs — not vibes.'],
              ].map(([Icon, t, b]) => (
                <div key={t}>
                  <dt className="flex items-center gap-2.5 font-semibold"><Icon className="text-gold-text" aria-hidden="true" />{t}</dt>
                  <dd className="text-ink-2 mt-2">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Stories */}
        <section className="border-t border-line">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-16 sm:py-20">
            <h2 className="text-2xl sm:text-3xl">People who already arrived</h2>
            <p className="text-ink-3 mt-2 text-sm">Anonymised stories that shaped our dream templates.</p>
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {STORIES.map((s) => (
                <figure key={s.who} className="panel p-6 flex flex-col">
                  <blockquote className="text-lg leading-relaxed flex-1">“{s.quote}”</blockquote>
                  <figcaption className="mt-5 text-sm"><span className="font-semibold">{s.who}</span><span className="block text-ink-3">{s.what}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-16 sm:py-24 text-center">
            <h2 className="text-3xl sm:text-4xl max-w-[20ch] mx-auto">Your first star is one week away.</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to={signedIn ? '/today' : '/signup'} className="btn btn-primary">Start your journey</Link>
              <button onClick={tryDemo} disabled={busy} className="btn btn-ghost">Explore a live demo</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 py-8 flex flex-wrap gap-4 items-center justify-between text-sm text-ink-3">
          <Logo size={20} />
          <div className="flex gap-5">
            <Link to="/signup" className="hover:text-ink">Create account</Link>
            <Link to="/signin" className="hover:text-ink">Sign in</Link>
            <a href="/api/health" className="hover:text-ink">API status</a>
          </div>
          <span>Built with React, Node.js, SQLite and Claude.</span>
        </div>
      </footer>
    </div>
  );
}
