import { useState } from 'react';
import { api, auth, queryClient } from '../lib/api.js';

const BASE = import.meta.env.BASE_URL;

/** Shown on every screen of the demo build: what this is, the pitch slides, and a one-click reset. */
export default function DemoBar() {
  const [busy, setBusy] = useState(false);
  async function reset() {
    setBusy(true);
    try {
      try { localStorage.removeItem('de-profile-draft'); } catch {}
      const r = await api.resetDemo();
      auth.setToken(r.token);
      queryClient.clear();
      location.assign(`${BASE}today`);
    } finally { setBusy(false); }
  }
  return (
    <div className="bg-surface border-b border-line text-xs text-ink-2 px-4 py-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
      <span><span className="text-gold-text font-semibold">Live demo</span> · the whole app runs in your browser — no server, nothing leaves this device</span>
      <a href={`${BASE}slides.html`} className="font-semibold text-ink hover:text-gold-text">Pitch slides →</a>
      <button onClick={reset} disabled={busy} className="font-semibold text-ink hover:text-gold-text">{busy ? 'Resetting…' : 'Reset Bharat’s demo'}</button>
    </div>
  );
}
