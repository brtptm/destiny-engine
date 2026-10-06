import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { api, auth, DEMO } from '../lib/api.js';
import { Logo, ErrorNote } from '../components/ui.jsx';
import Cosmos from '../components/three/Cosmos.jsx';

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
              {DEMO && <p className="text-xs text-ink-3 text-center">Demo login: demo@destiny.app / dream-big-2026. New accounts are saved in this browser only.</p>}
            </div>
            <p className="text-sm text-ink-3 mt-6">
              {isSignup ? <>Already have an account? <Link className="text-gold-text font-semibold" to="/signin">Sign in</Link></>
                : <>New here? <Link className="text-gold-text font-semibold" to="/signup">Create an account</Link></>}
            </p>
          </form>
        </div>
      </div>
      <aside className="hidden lg:block relative isolate overflow-hidden border-l border-line" aria-hidden="true">
        <Cosmos variant="compact" className="-z-10" />
        <div className="absolute inset-x-0 bottom-0 p-12 pt-32" style={{ background: 'linear-gradient(transparent, var(--bg))' }}>
          <p className="text-xl font-display leading-snug max-w-sm">Every big change is a line of small, specific weeks.</p>
        </div>
      </aside>
    </div>
  );
}
