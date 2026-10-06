import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api.js';

/** Toggle a checklist action with an optimistic update of the dashboard cache. */
export function useToggleAction() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const toggle = async (action, done) => {
    setBusyId(action.id); setError(null);
    const prev = qc.getQueryData(['dashboard']);
    qc.setQueryData(['dashboard'], (d) => {
      if (!d) return d;
      const completedActions = { ...d.progress.completedActions };
      if (done) completedActions[action.id] = { completedAt: new Date().toISOString() }; else delete completedActions[action.id];
      return { ...d, progress: { ...d.progress, completedActions } };
    });
    try {
      const r = await api.toggleAction(action.id, done);
      qc.setQueryData(['dashboard'], (d) => d && { ...d, progress: r.progress, stats: r.stats });
    } catch (e) {
      qc.setQueryData(['dashboard'], prev);
      setError(e);
    } finally { setBusyId(null); }
  };
  return { toggle, busyId, error };
}

/** Mark the current week complete; returns the server response (may include an unlocked milestone). */
export function useCompleteWeek() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const run = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.completeWeek();
      qc.setQueryData(['dashboard'], (d) => d && { ...d, progress: r.progress, stats: r.stats });
      qc.invalidateQueries({ queryKey: ['coaching'] });
      return r;
    } catch (e) { setError(e); return null; } finally { setBusy(false); }
  };
  return { run, busy, error };
}

export const todayIndex = () => (new Date().getDay() + 6) % 7;
