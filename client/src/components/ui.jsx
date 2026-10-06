import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  FiCheck, FiClock, FiChevronDown, FiThumbsUp, FiThumbsDown, FiArchive, FiAlertTriangle, FiZap,
  FiStar, FiTrendingUp, FiGift, FiSun, FiX, FiLoader, FiInbox,
} from 'react-icons/fi';
import { starPath } from './Constellation.jsx';

export function Logo({ size = 28, withText = true }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <path d={starPath(16, 16, 12)} fill="var(--gold)" />
        <circle cx="27" cy="6" r="1.6" fill="var(--ink-2)" />
        <circle cx="5" cy="26" r="1.2" fill="var(--ink-3)" />
      </svg>
      {withText && <span className="font-display font-semibold tracking-tight text-[1.05rem]">Destiny Engine</span>}
    </span>
  );
}

export function ProgressBar({ value = 0, tone = 'var(--gold)', height = 8, label }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full rounded-full bg-surface-2 overflow-hidden" style={{ height }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: tone, transition: 'width .8s cubic-bezier(.2,.8,.2,1)' }} />
    </div>
  );
}

export function ProgressRing({ value = 0, size = 132, stroke = 10, tone = 'var(--gold)', children, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={label || `${Math.round(v)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function ScoreBar({ label, score, explanation }) {
  const tone = score >= 75 ? 'var(--sea)' : score >= 50 ? 'var(--gold)' : 'var(--rose)';
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="font-semibold">{label}</span>
        <span className="num text-lg">{score}</span>
      </div>
      <ProgressBar value={score} tone={tone} height={6} label={`${label} score`} />
      {explanation && <p className="text-sm text-ink-2 mt-2">{explanation}</p>}
    </div>
  );
}

const IMPORTANCE = {
  critical: { label: 'Critical', color: 'var(--gold-text)' },
  important: { label: 'Important', color: 'var(--ink-2)' },
  helpful: { label: 'Helpful', color: 'var(--ink-3)' },
};

export function ActionChecklist({ actions, completed, onToggle, busyId, todayIdx, readOnly }) {
  const [open, setOpen] = useState(null);
  return (
    <ul className="divide-y divide-line">
      {actions.map((a, i) => {
        const done = Boolean(completed?.[a.id]);
        const imp = IMPORTANCE[a.importance] || IMPORTANCE.important;
        const isOpen = open === a.id;
        return (
          <li key={a.id} className={`py-3 flex gap-3 ${todayIdx === i ? 'bg-surface-2/60 -mx-3 px-3 rounded-xl' : ''}`}>
            <button type="button" disabled={readOnly || busyId === a.id} onClick={() => onToggle?.(a, !done)}
              aria-pressed={done} aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${a.action}`}
              className="mt-0.5 shrink-0 w-6 h-6 rounded-lg grid place-items-center border transition-colors"
              style={{ background: done ? 'var(--sea)' : 'transparent', borderColor: done ? 'var(--sea)' : 'var(--ink-3)', color: 'var(--bg)' }}>
              {busyId === a.id ? <FiLoader className="spin text-ink-2" size={14} /> : done && <FiCheck size={15} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-3 mb-0.5">
                <span className="font-semibold text-ink-2">{a.day}{todayIdx === i ? ' · today' : ''}</span>
                {a.timeEstimate && a.timeEstimate !== '—' && <span className="inline-flex items-center gap-1"><FiClock size={11} />{a.timeEstimate}</span>}
                <span style={{ color: imp.color }} className="font-semibold">{imp.label}</span>
                {a.adapted && <span className="text-violet font-semibold">Course correction</span>}
              </div>
              <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} aria-expanded={isOpen}
                className={`text-left w-full flex items-start justify-between gap-2 ${done ? 'text-ink-3 line-through decoration-1' : ''}`}>
                <span>{a.action}</span>
                <FiChevronDown className={`shrink-0 mt-1 text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <dl className="mt-2 grid gap-1.5 text-sm rise">
                  {a.resource && <div><dt className="inline text-ink-3">Use: </dt><dd className="inline text-ink-2">{a.resource}</dd></div>}
                  {a.successMetric && <div><dt className="inline text-ink-3">Done when: </dt><dd className="inline text-ink-2">{a.successMetric}</dd></div>}
                </dl>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const COACH_TYPES = {
  nudge: { label: 'Daily nudge', icon: FiSun, color: 'var(--gold-text)' },
  opportunity: { label: 'Opportunity', icon: FiZap, color: 'var(--violet)' },
  motivation: { label: 'Motivation', icon: FiTrendingUp, color: 'var(--sea)' },
  warning: { label: 'Course check', icon: FiAlertTriangle, color: 'var(--rose)' },
  tip: { label: 'Pro tip', icon: FiStar, color: 'var(--violet)' },
  celebration: { label: 'Celebration', icon: FiGift, color: 'var(--sea)' },
};

export function CoachingMessage({ message, featured, onFeedback, onArchive }) {
  const t = COACH_TYPES[message.type] || COACH_TYPES.nudge;
  const Icon = t.icon;
  return (
    <article className={featured ? 'panel p-6 sm:p-7 relative overflow-hidden' : 'py-4'} style={featured ? { borderColor: t.color } : undefined}>
      <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: t.color }}>
        <Icon aria-hidden="true" /> {t.label}
        <span className="text-ink-3 font-normal">
          {new Date(message.timestamp?.replace(' ', 'T') + (message.timestamp?.includes('Z') ? '' : 'Z')).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
        {message.source === 'claude' && <span className="text-ink-3 font-normal">by Claude</span>}
      </div>
      <p className={featured ? 'mt-3 text-lg sm:text-xl leading-relaxed' : 'mt-1.5'}>
        {message.emoji && <span className="mr-1.5" aria-hidden="true">{message.emoji}</span>}{message.message}
      </p>
      {message.actionSuggested && (
        <p className={`mt-2 text-ink-2 ${featured ? '' : 'text-sm'}`}><span className="text-ink-3">Next: </span>{message.actionSuggested}</p>
      )}
      {(onFeedback || onArchive) && (
        <div className="mt-3 flex items-center gap-1.5">
          {onFeedback && <>
            <IconBtn label="Helpful" pressed={message.feedback === 'helpful'} onClick={() => onFeedback(message, message.feedback === 'helpful' ? null : 'helpful')}><FiThumbsUp /></IconBtn>
            <IconBtn label="Not helpful" pressed={message.feedback === 'not-helpful'} onClick={() => onFeedback(message, message.feedback === 'not-helpful' ? null : 'not-helpful')}><FiThumbsDown /></IconBtn>
          </>}
          {onArchive && <IconBtn label={message.archived ? 'Restore' : 'Archive'} onClick={() => onArchive(message)}><FiArchive /></IconBtn>}
        </div>
      )}
    </article>
  );
}

export function IconBtn({ label, pressed, onClick, children }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={pressed} onClick={onClick}
      className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
      style={pressed ? { color: 'var(--gold-text)', background: 'var(--surface-2)' } : undefined}>
      {children}
    </button>
  );
}

export function MilestoneCard({ milestone, achieved, startLabel }) {
  return (
    <div className="flex gap-3 items-start py-3">
      <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0 mt-0.5" aria-hidden="true">
        <path d={starPath(13, 13, 11)} fill={achieved ? 'var(--gold)' : 'none'} stroke={achieved ? 'var(--gold)' : 'var(--ink-3)'} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <div>
        <div className="font-semibold">{milestone.title}</div>
        <div className="text-sm text-ink-3">Month {milestone.month}{startLabel ? ` · ${startLabel}` : ''}{achieved ? ' · achieved' : ''}</div>
      </div>
    </div>
  );
}

export function Celebration({ title, body, onClose }) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#FFC857', '#3DD6C6', '#8A90E6', '#ffffff'];
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors, shapes: ['star', 'circle'] });
    const t = setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.5 }, colors, shapes: ['star'] }), 450);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="celebrate-title" onClick={onClose}>
      <div className="panel p-8 max-w-md w-full text-center rise" onClick={(e) => e.stopPropagation()}>
        <svg width="64" height="64" viewBox="0 0 64 64" className="mx-auto" aria-hidden="true">
          <circle cx="32" cy="32" r="28" fill="var(--gold)" opacity=".15" className="halo" />
          <path d={starPath(32, 32, 22)} fill="var(--gold)" />
        </svg>
        <h2 id="celebrate-title" className="text-2xl mt-4">{title}</h2>
        <p className="text-ink-2 mt-3">{body}</p>
        <button className="btn btn-primary mt-6" onClick={onClose} autoFocus>Keep going</button>
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="grid place-items-center py-24 text-ink-3" role="status">
      <svg width="48" height="48" viewBox="0 0 48 48" className="spin" style={{ animationDuration: '2.4s' }} aria-hidden="true">
        <path d={starPath(24, 8, 5)} fill="var(--gold)" />
        <circle cx="40" cy="30" r="3" fill="var(--ink-2)" />
        <circle cx="10" cy="34" r="2.5" fill="var(--ink-3)" />
      </svg>
      <span className="mt-3 text-sm">{label}</span>
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div role="alert" className="panel-quiet px-4 py-3 text-sm flex items-start gap-2.5" style={{ color: 'var(--rose)' }}>
      <FiAlertTriangle className="mt-0.5 shrink-0" />
      <span className="flex-1">{error.message || String(error)}</span>
      {onRetry && <button className="underline font-semibold" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Empty({ title, body, action }) {
  return (
    <div className="panel p-10 text-center">
      <FiInbox className="mx-auto text-ink-3" size={28} />
      <h3 className="text-lg mt-3">{title}</h3>
      {body && <p className="text-ink-2 mt-2 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="panel w-full sm:max-w-xl max-h-[88vh] overflow-y-auto rounded-b-none sm:rounded-b-[18px] rise" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface flex items-center justify-between gap-3 px-6 py-4 border-b border-line">
          <h2 className="text-lg">{title}</h2>
          <IconBtn label="Close" onClick={onClose}><FiX /></IconBtn>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function SourceNote({ source }) {
  if (!source) return null;
  return <span className="text-xs text-ink-3">{source === 'claude' ? 'Personalised by Claude' : 'Planned by the Destiny engine'}</span>;
}
