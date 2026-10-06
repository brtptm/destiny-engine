import { Suspense } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router';
import { FiSun, FiMap, FiBarChart2, FiMessageCircle, FiSettings, FiLogOut } from 'react-icons/fi';
import { useQueryClient } from '@tanstack/react-query';
import { auth, api, useDashboard } from '../lib/api.js';
import { Logo, ProgressBar, Spinner } from './ui.jsx';

const NAV = [
  { to: '/today', label: 'Today', icon: FiSun },
  { to: '/roadmap', label: 'Roadmap', icon: FiMap },
  { to: '/progress', label: 'Progress', icon: FiBarChart2 },
  { to: '/coach', label: 'Coach', icon: FiMessageCircle },
  { to: '/settings', label: 'Settings', icon: FiSettings },
];

export function useSignOut() {
  const qc = useQueryClient();
  const nav = useNavigate();
  return async () => {
    try { await api.logout(); } catch {}
    auth.setToken(null);
    try { localStorage.removeItem('de-profile-draft'); } catch {}
    qc.clear();
    nav('/');
  };
}

export default function Shell() {
  const { data } = useDashboard();
  const signOut = useSignOut();
  const active = data?.stage === 'active';
  const items = active ? NAV : NAV.filter((n) => n.to === '/settings');

  return (
    <div className="sky min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden lg:flex flex-col gap-8 sticky top-0 h-dvh border-r border-line px-5 py-7">
        <Link to={active ? '/today' : '/'}><Logo /></Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${isActive ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:text-ink hover:bg-surface-2/60'}`}>
              {({ isActive }) => (<><Icon style={isActive ? { color: 'var(--gold-text)' } : undefined} />{label}</>)}
            </NavLink>
          ))}
        </nav>
        {data?.stats && (
          <div className="mt-auto panel-quiet p-4">
            <div className="text-sm text-ink-2 line-clamp-2">{data.dream?.description}</div>
            <div className="flex items-baseline justify-between mt-3 mb-1.5"><span className="text-xs text-ink-3">Journey</span><span className="num text-sm">{data.stats.percent}%</span></div>
            <ProgressBar value={data.stats.percent} height={6} label="Journey progress" />
          </div>
        )}
        <button onClick={signOut} className={`${data?.stats ? '' : 'mt-auto'} flex items-center gap-3 px-3 py-2 text-ink-3 hover:text-ink`}><FiLogOut /> Sign out</button>
      </aside>

      <header className="lg:hidden sticky top-0 z-20 bg-bg/85 backdrop-blur border-b border-line px-4 h-14 flex items-center justify-between">
        <Link to="/today"><Logo size={24} /></Link>
        {data?.stats && <span className="num text-sm text-ink-2">{data.stats.percent}%</span>}
      </header>

      <main className="min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-28 lg:pb-12">
        <div className="max-w-[1180px] mx-auto"><Suspense fallback={<Spinner />}><Outlet /></Suspense></div>
      </main>

      <nav aria-label="Main" className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur border-t border-line grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)`, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${isActive ? 'text-gold-text' : 'text-ink-3'}`}>
            <Icon size={20} />{label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Focused layout for the onboarding journey (no tabs). */
export function JourneyLayout() {
  const signOut = useSignOut();
  return (
    <div className="sky min-h-dvh flex flex-col">
      <header className="px-4 sm:px-8 h-16 flex items-center justify-between max-w-[1180px] w-full mx-auto">
        <Link to="/"><Logo size={24} /></Link>
        <button onClick={signOut} className="text-sm text-ink-3 hover:text-ink">Sign out</button>
      </header>
      <main className="flex-1 px-4 sm:px-8 pb-16 max-w-[1180px] w-full mx-auto"><Suspense fallback={<Spinner />}><Outlet /></Suspense></main>
    </div>
  );
}
