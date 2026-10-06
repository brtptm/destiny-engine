import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, auth } from '../lib/api.js';
import { Logo, ErrorNote } from '../components/ui.jsx';
import { starPath } from '../components/Constellation.jsx';

export default function Auth({ mode }) {
  const isSignup = mode === 'signup';
  const nav = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function finish(promise) {
    setBusy(true); setError(null);
    try {
      const { token } = await promise;
      auth.setToken(token);
      qc.clear();
      const d = await qc.fetchQuery({ queryKey: ['dashboard'], queryFn: api.dashboard });
      nav({ profile: '/setup', dream: '/dream', roadmap: '/feasibility' }[d.stage] || '/today');
    } catch (e) { setError(e); setBusy(false); }
  }

  const submit = (e) => {
    e.preventDefault();
    finish(isSignup ? api.register(form) : api.login({ email: form.email, password: form.password }));
  };

  return (
    <div className="sky min-h-dvh grid lg:grid-cols-2">
      <div className="flex flex-col px-4 sm:px-10 py-8">
        <Link to="/"><Logo /></Link>
        <div className="flex-1 grid place-items-center py-10">
          <form onSubmit={submit} className="w-full max-w-sm" noValidate>
            <h1 className="text-3xl">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="text-ink-2 mt-2">{isSignup ? 'It takes 8 minutes to map your life and see your dream’s roadmap.' : 'Pick up your roadmap where you left it.'}</p>
            <div className="mt-8 grid gap-4">
              {isSignup && (
                <label className="grid gap-1.5"><span className="label">Your name</span>
                  <input className="field" value={form.name} onChange={set('name')} autoComplete="name" required /></label>
              )}
              <label className="grid gap-1.5"><span className="label">Email</span>
                <input className="field" type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
              <label className="grid gap-1.5"><span className="label">Password</span>
                <input className="field" type="password" value={form.password} onChange={set('password')} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} required />
                {isSignup && <span className="text-xs text-ink-3">At least 8 characters.</span>}
              </label>
              <ErrorNote error={error} />
              <button className="btn btn-primary w-full mt-2" disabled={busy}>{busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}</button>
              <button type="button" className="btn btn-ghost w-full" disabled={busy} onClick={() => finish(api.demo())}>Use the demo account</button>
            </div>
            <p className="text-sm text-ink-3 mt-6">
              {isSignup ? <>Already have an account? <Link className="text-gold-text font-semibold" to="/signin">Sign in</Link></>
                : <>New here? <Link className="text-gold-text font-semibold" to="/signup">Create an account</Link></>}
            </p>
          </form>
        </div>
      </div>
      <aside className="hidden lg:grid place-items-center border-l border-line p-12" aria-hidden="true">
        <div className="max-w-sm">
          <svg viewBox="0 0 320 220" className="w-full">
            <path d="M20,180 C80,180 70,120 130,120 C190,120 170,60 230,60 C270,60 280,30 300,30" fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
            <path d="M20,180 C80,180 70,120 130,120 C190,120 170,60 230,60" fill="none" stroke="var(--gold)" strokeWidth="2.5" className="draw-path" style={{ '--len': 400 }} />
            {[[20, 180, 6], [130, 120, 7]].map(([x, y, r]) => <circle key={x} cx={x} cy={y} r={r} fill="var(--gold)" />)}
            <circle cx="230" cy="60" r="16" fill="var(--gold)" opacity=".18" className="halo" />
            <circle cx="230" cy="60" r="7" fill="var(--gold)" />
            <path d={starPath(300, 30, 14)} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" />
          </svg>
          <p className="text-xl font-display mt-8 leading-snug">Every big change is a line of small, specific weeks.</p>
        </div>
      </aside>
    </div>
  );
}
