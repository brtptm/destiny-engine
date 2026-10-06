import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { FiDownload, FiEdit3, FiStar, FiLogOut, FiTrash2 } from 'react-icons/fi';
import { api, auth, useDashboard, useHealth, DEMO } from '../lib/api.js';
import { useTheme } from '../lib/theme.js';
import { useSignOut } from '../components/Shell.jsx';
import { Spinner, ErrorNote } from '../components/ui.jsx';

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 py-4 cursor-pointer">
      <span><span className="font-semibold block">{label}</span>{hint && <span className="text-sm text-ink-3">{hint}</span>}</span>
      <span className="relative shrink-0 mt-1">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block w-11 h-6 rounded-full transition-colors bg-surface-2 border border-line peer-checked:bg-[var(--sea)] peer-checked:border-[var(--sea)] peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--gold)]" />
        <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-ink transition-transform peer-checked:translate-x-5 peer-checked:bg-[var(--bg)]" />
      </span>
    </label>
  );
}

export default function Settings() {
  const { data } = useDashboard();
  const { data: health } = useHealth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const signOut = useSignOut();
  const [theme, setTheme] = useTheme();
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState('');

  if (!data) return <Spinner />;
  const s = data.user.settings;
  const isDemo = data.user.email === 'demo@demo.com';

  async function save(patch) {
    setError(null);
    try {
      if (patch.pushNotifications && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
      const r = await api.updateSettings(patch);
      qc.setQueryData(['dashboard'], (d) => d && { ...d, user: r.user });
      setSaved('Saved');
      setTimeout(() => setSaved(''), 1500);
    } catch (e) { setError(e); }
  }

  async function exportData() {
    try {
      const json = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'destiny-engine-export.json' });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e); }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account and all your data? This cannot be undone.')) return;
    try { await api.deleteAccount(); auth.setToken(null); qc.clear(); nav('/'); } catch (e) { setError(e); }
  }

  return (
    <div className="max-w-3xl">
      <header className="flex items-end justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl">Settings</h1>
        <span className="text-sm" style={{ color: 'var(--sea)' }} role="status">{saved}</span>
      </header>
      <div className="mt-4"><ErrorNote error={error} /></div>

      <section className="panel p-5 sm:p-7 mt-6">
        <h2 className="text-lg">Account</h2>
        <dl className="mt-4 grid sm:grid-cols-3 gap-4 text-sm">
          <div><dt className="text-ink-3">Name</dt><dd className="font-semibold mt-0.5">{data.user.name}</dd></div>
          <div><dt className="text-ink-3">Email</dt><dd className="font-semibold mt-0.5 break-all">{data.user.email}</dd></div>
          <div><dt className="text-ink-3">Member since</dt><dd className="font-semibold mt-0.5">{new Date(data.user.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</dd></div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/setup" className="btn btn-ghost btn-sm"><FiEdit3 /> Edit life profile</Link>
          <Link to="/dream" className="btn btn-ghost btn-sm"><FiStar /> Change my dream</Link>
        </div>
      </section>

      <section className="panel p-5 sm:p-7 mt-6">
        <h2 className="text-lg">Coaching and notifications</h2>
        <div className="mt-4">
          <span className="font-semibold block">When should your coach check in?</span>
          <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Coaching time">
            {[['morning', 'Morning'], ['evening', 'Evening']].map(([v, l]) => (
              <button key={v} role="radio" aria-checked={s.coachingTime === v} aria-pressed={s.coachingTime === v} className="chip !py-2 !px-4" onClick={() => save({ coachingTime: v })}>{l}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-line mt-2">
          <Toggle label="Browser notifications" hint="Your daily message as a notification when the app is open." checked={!!s.pushNotifications} onChange={(v) => save({ pushNotifications: v })} />
          <Toggle label="Email updates" hint="Important alerts and milestone celebrations." checked={!!s.emailNotifications} onChange={(v) => save({ emailNotifications: v })} />
          <Toggle label="Sunday summary" hint="A weekly review of actions, income and savings." checked={!!s.weeklySummary} onChange={(v) => save({ weeklySummary: v })} />
        </div>
      </section>

      <section className="panel p-5 sm:p-7 mt-6">
        <h2 className="text-lg">Appearance</h2>
        <div className="mt-4 flex gap-2" role="radiogroup" aria-label="Theme">
          {[['system', 'Match device'], ['dark', 'Night'], ['light', 'Dawn']].map(([v, l]) => (
            <button key={v} role="radio" aria-checked={theme === v} aria-pressed={theme === v} className="chip !py-2 !px-4" onClick={() => { setTheme(v); save({ theme: v }); }}>{l}</button>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-7 mt-6">
        <h2 className="text-lg">Your data</h2>
        <p className="text-sm text-ink-2 mt-2">{DEMO ? 'This demo keeps everything in your browser’s local storage — nothing is sent anywhere. Plans come from the built-in planning engine.' : <>Everything is stored in this app’s SQLite database. {health?.ai?.enabled ? `Plans are personalised by Claude (${health.ai.model}); your profile is sent to the Claude API only when generating plans.` : 'AI personalisation is off — plans come from the built-in engine and never leave this server.'}</>}</p>
        <button className="btn btn-ghost btn-sm mt-4" onClick={exportData}><FiDownload /> Export my data (JSON)</button>
      </section>

      <section className="mt-6 flex flex-wrap gap-3">
        <button className="btn btn-ghost" onClick={signOut}><FiLogOut /> Sign out</button>
        {!isDemo && <button className="btn btn-ghost" style={{ color: 'var(--rose)' }} onClick={deleteAccount}><FiTrash2 /> Delete account</button>}
      </section>
    </div>
  );
}
