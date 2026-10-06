import { useEffect, useState } from 'react';

const KEY = 'de-theme';
const read = () => { try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; } };

export function applyTheme(pref) {
  const sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.dataset.theme = pref === 'system' ? sys : pref;
}

export function useTheme() {
  const [pref, setPref] = useState(read);
  useEffect(() => {
    applyTheme(pref);
    try { localStorage.setItem(KEY, pref); } catch {}
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => applyTheme('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);
  return [pref, setPref];
}
