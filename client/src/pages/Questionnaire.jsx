import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { FiArrowLeft, FiX } from 'react-icons/fi';
import { api, useDashboard } from '../lib/api.js';
import { inr } from '../lib/format.js';
import { ProgressBar, ErrorNote } from '../components/ui.jsx';

const SECTIONS = ['About you', 'Money', 'Work & skills', 'Life & energy'];
const DRAFT_KEY = 'de-profile-draft';

const Q = [
  // About you
  { id: 'name', s: 0, type: 'text', label: 'What should we call you?', why: 'Your coach will use it — plans feel different when they speak to you.', path: 'basicInfo.name' },
  { id: 'age', s: 0, type: 'number', label: 'How old are you?', why: 'Age shapes risk capacity and how long compounding has to work.', path: 'basicInfo.age', min: 16, max: 90 },
  { id: 'location', s: 0, type: 'text', label: 'Which city do you live in now?', why: 'We compare living costs and job markets against your dream location.', path: 'basicInfo.location', placeholder: 'Delhi' },
  { id: 'education', s: 0, type: 'select', label: 'Highest education?', why: 'Some dreams (visas, master’s programmes) have education requirements.', path: 'basicInfo.education', optional: true, options: ['High school', 'Diploma', 'Bachelor’s', 'Master’s / MBA', 'Doctorate'] },
  { id: 'maritalStatus', s: 0, type: 'select', label: 'Relationship status?', why: 'Big moves land differently when a partner is part of them.', path: 'basicInfo.maritalStatus', options: [['single', 'Single'], ['partnered', 'In a relationship'], ['married', 'Married'], ['other', 'Prefer not to say']] },
  { id: 'childrenCount', s: 0, type: 'number', label: 'How many children do you have?', why: 'Kids change timelines — schools, routines and safety nets.', path: 'basicInfo.childrenCount', min: 0, max: 10 },
  { id: 'childrenAges', s: 0, type: 'tags', label: 'How old are they?', why: 'School years matter for relocation timing.', path: 'basicInfo.childrenAges', optional: true, numeric: true, placeholder: 'Type an age and press Enter', showIf: (a) => Number(a.childrenCount) > 0 },
  { id: 'healthStatus', s: 0, type: 'select', label: 'How is your health right now?', why: 'Energy is the fuel of every plan. We pace actions to it.', path: 'personal.healthStatus', options: [['excellent', 'Excellent'], ['good', 'Good'], ['fair', 'Fair'], ['managing', 'Managing a condition']] },
  // Money
  { id: 'monthlyIncome', s: 1, type: 'money', label: 'Monthly take-home income?', why: 'The baseline for every financial projection in your roadmap.', path: 'financial.monthlyIncome', placeholder: '80000' },
  { id: 'monthlyExpenses', s: 1, type: 'money', label: 'Monthly expenses, roughly?', why: 'Income minus expenses is the engine that funds your dream.', path: 'financial.monthlyExpenses', placeholder: '55000' },
  { id: 'savings', s: 1, type: 'money', label: 'Cash savings today?', why: 'Savings buy you runway — the time to make a transition safely.', path: 'financial.savings', placeholder: '200000' },
  { id: 'investments', s: 1, type: 'money', label: 'Investments (stocks, MFs, PF, FDs)?', why: 'Part of these can count toward your safety net.', path: 'financial.investments', optional: true, placeholder: '500000' },
  { id: 'debts', s: 1, type: 'money', label: 'Outstanding loans or debt?', why: 'High-interest debt is usually the first thing a roadmap should fix.', path: 'financial.debts', placeholder: '0' },
  { id: 'creditScore', s: 1, type: 'number', label: 'Credit score, if you know it?', why: 'Matters for home loans, business loans and education loans.', path: 'financial.creditScore', optional: true, min: 300, max: 900, showIf: (a) => Number(a.debts) > 0 },
  { id: 'assets', s: 1, type: 'chips', label: 'Which assets do you own?', why: 'Assets can fund, secure or anchor a big change.', path: 'financial.assets', optional: true, options: ['Apartment', 'House', 'Car', 'Land', 'Gold', 'Business', 'None'] },
  // Work
  { id: 'employment', s: 2, type: 'select', label: 'What is your work situation?', why: 'It decides whether we plan a side-hustle ramp or a full-time sprint.', path: 'professional.employment', options: [['employed', 'Employed full-time'], ['self', 'Self-employed / freelance'], ['student', 'Student'], ['between', 'Between jobs']] },
  { id: 'currentJob', s: 2, type: 'text', label: 'What is your role or job title?', why: 'Your experience is the raw material of your new path.', path: 'professional.currentJob', placeholder: 'Marketing Manager', showIf: (a) => a.employment !== 'student' },
  { id: 'currentCompany', s: 2, type: 'text', label: 'Where do you work?', why: 'Helps us suggest internal moves or contract options.', path: 'professional.currentCompany', optional: true, showIf: (a) => a.employment === 'employed' },
  { id: 'yearsExperience', s: 2, type: 'number', label: 'Years of work experience?', why: 'Experience is leverage — it raises your rates and your credibility.', path: 'professional.yearsExperience', min: 0, max: 50 },
  { id: 'skills', s: 2, type: 'tags', label: 'Your strongest skills?', why: 'We map these to market demand and to what your dream needs.', path: 'professional.skills', placeholder: 'Type a skill and press Enter', suggestions: ['Digital marketing', 'Python', 'Design', 'Sales', 'Writing', 'Data analysis', 'Teaching', 'Video editing', 'Finance', 'Project management'] },
  { id: 'softSkills', s: 2, type: 'chips', label: 'Which of these describe you?', why: 'Soft skills predict which paths will feel natural.', path: 'professional.softSkills', optional: true, options: ['Communication', 'Leadership', 'Negotiation', 'Creativity', 'Discipline', 'Empathy', 'Problem solving'] },
  { id: 'hiddenTalents', s: 2, type: 'text', label: 'Any hidden talent people pay you for — or could?', why: 'Hobbies often become the most enjoyable income streams.', path: 'professional.hiddenTalents', optional: true, placeholder: 'Photography, baking, guitar…' },
  { id: 'remoteCapability', s: 2, type: 'slider', label: 'How much of your work could be done remotely?', why: 'Portable income unlocks relocation and freedom dreams.', path: 'professional.remoteCapability', min: 0, max: 100, step: 5, unit: '%', default: 50 },
  { id: 'growthPotential', s: 2, type: 'select', label: 'Growth left in your current role?', why: 'If the ceiling is close, a change is cheaper than you think.', path: 'professional.growthPotential', optional: true, options: [['limited', 'Limited'], ['moderate', 'Some'], ['strong', 'Plenty']] },
  // Life
  { id: 'availableHours', s: 3, type: 'slider', label: 'Hours a day you can give your dream?', why: 'We size weekly actions so they fit your real life.', path: 'personal.availableHours', min: 0.5, max: 8, step: 0.5, unit: 'h', default: 2 },
  { id: 'riskTolerance', s: 3, type: 'select', label: 'How do you feel about risk?', why: 'It decides how much safety net we build before the leap.', path: 'personal.riskTolerance', options: [['low', 'I prefer certainty'], ['medium', 'Calculated risks'], ['high', 'Bold moves excite me']] },
  { id: 'motivationLevel', s: 3, type: 'scale', label: 'How motivated are you right now?', why: 'Honest answers help your coach pace you.', path: 'personal.motivationLevel', min: 1, max: 10 },
  { id: 'learningSpeed', s: 3, type: 'select', label: 'How quickly do you pick up new skills?', why: 'Fast learners can compress skill-building phases.', path: 'personal.learningSpeed', options: [['slow', 'Steady and thorough'], ['average', 'About average'], ['fast', 'Fast']] },
  { id: 'familySupport', s: 3, type: 'select', label: 'Will the people close to you support a big change?', why: 'Support is one of the strongest predictors of follow-through.', path: 'personal.familySupport', options: [['high', 'Yes, fully'], ['medium', 'Mostly'], ['low', 'Not yet']] },
];

const getPath = (obj, p) => p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function fromProfile(p) {
  if (!p) return {};
  const a = {};
  for (const q of Q) {
    let v = getPath(p, q.path);
    if (q.id === 'remoteCapability' && v != null) v = Math.round(v * 100);
    if (q.type === 'chips' && Array.isArray(v)) v = v.map((x) => q.options.find((o) => o.toLowerCase() === String(x).toLowerCase()) || x);
    if (v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)) a[q.id] = v;
  }
  return a;
}

function toProfile(a) {
  const out = { basicInfo: {}, financial: {}, professional: {}, personal: {} };
  for (const q of Q) {
    let v = a[q.id];
    if (v === undefined || v === null || v === '') continue;
    if (['number', 'money', 'slider', 'scale'].includes(q.type)) v = Number(v);
    if (q.id === 'remoteCapability') v = v / 100;
    if (q.id === 'assets') v = v.filter((x) => x !== 'None').map((x) => x.toLowerCase());
    const [g, k] = q.path.split('.');
    out[g][k] = v;
  }
  if (a.employment === 'student' && !out.professional.currentJob) out.professional.currentJob = 'Student';
  return out;
}

export default function Questionnaire() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useDashboard();
  const [answers, setAnswers] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem(DRAFT_KEY)); if (d?.answers) return d.answers; } catch {}
    return {};
  });
  const [idx, setIdx] = useState(() => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY))?.idx || 0; } catch { return 0; } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  // Prefill from an existing profile (editing) or the account name.
  useEffect(() => {
    if (!data) return;
    setAnswers((a) => (Object.keys(a).length ? a : { name: data.user?.name, ...fromProfile(data.profile?.data) }));
  }, [data]);

  const visible = useMemo(() => Q.filter((q) => !q.showIf || q.showIf(answers)), [answers]);
  const i = Math.min(idx, visible.length - 1);
  const q = visible[i];
  const value = answers[q.id];
  const left = visible.length - i;

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, idx: i })); } catch {} }, [answers, i]);
  useEffect(() => { setTouched(false); }, [i]);

  const set = (v) => setAnswers((a) => ({ ...a, [q.id]: typeof v === 'function' ? v(a[q.id]) : v }));
  const empty = value === undefined || value === '' || (Array.isArray(value) && !value.length);
  const invalid = !empty && (q.type === 'number' || q.type === 'money') && (Number.isNaN(Number(value)) || (q.min != null && Number(value) < q.min) || (q.max != null && Number(value) > q.max));
  const canNext = !invalid && (q.optional || !empty || q.type === 'slider' || q.type === 'chips');

  async function next() {
    setTouched(true);
    if (!canNext) return;
    if (q.type === 'slider' && empty) set(q.default);
    if (i < visible.length - 1) { setIdx(i + 1); return; }
    setBusy(true); setError(null);
    try {
      await api.saveProfile(toProfile({ ...answers, ...(q.type === 'slider' && empty ? { [q.id]: q.default } : {}) }));
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      nav('/analysis');
    } catch (e) { setError(e); setBusy(false); }
  }
  const skip = () => { set(undefined); if (i < visible.length - 1) setIdx(i + 1); else next(); };
  const back = () => setIdx(Math.max(0, i - 1));

  return (
    <div className="max-w-2xl mx-auto pt-4 sm:pt-10">
      <div className="flex items-center justify-between text-sm text-ink-3 mb-3">
        <span className="font-semibold text-ink-2">{SECTIONS[q.s]}</span>
        <span>Question {i + 1} of {visible.length} · about {Math.max(1, Math.ceil(left * 0.25))} min left</span>
      </div>
      <ProgressBar value={((i) / visible.length) * 100} label="Questionnaire progress" />
      <ol className="mt-3 flex gap-4 text-xs text-ink-3" aria-label="Sections">
        {SECTIONS.map((s, si) => <li key={s} className={si === q.s ? 'text-gold-text font-semibold' : si < q.s ? 'text-ink-2' : ''}>{s}</li>)}
      </ol>

      <form key={q.id} className="mt-10 sm:mt-14 rise" onSubmit={(e) => { e.preventDefault(); next(); }}>
        <label htmlFor={`q-${q.id}`} className="block font-display text-2xl sm:text-3xl leading-tight">{q.label}</label>
        <p className="text-ink-2 mt-3">{q.why}</p>
        <div className="mt-8"><Input q={q} value={value} onChange={set} onEnter={next} /></div>
        {touched && !canNext && <p className="mt-3 text-sm" style={{ color: 'var(--rose)' }}>{invalid ? `Enter a number${q.min != null ? ` between ${q.min} and ${q.max}` : ''}.` : 'Answer this one to continue — it shapes your whole plan.'}</p>}
        <div className="mt-6"><ErrorNote error={error} /></div>

        <div className="mt-10 flex items-center gap-3">
          <button type="button" onClick={back} disabled={i === 0} className="btn btn-ghost" aria-label="Previous question"><FiArrowLeft /> Back</button>
          <div className="flex-1" />
          {q.optional && <button type="button" onClick={skip} className="btn text-ink-2 hover:text-ink">Skip</button>}
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Analysing your life…' : i === visible.length - 1 ? 'See my analysis' : 'Next'}</button>
        </div>
        {q.optional && <p className="text-xs text-ink-3 mt-4 text-right">Optional — if you skip, we’ll estimate it from your other answers.</p>}
      </form>
    </div>
  );
}

function Input({ q, value, onChange, onEnter }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus?.(); }, [q.id]);
  const id = `q-${q.id}`;

  if (q.type === 'text' || q.type === 'number') {
    return <input id={id} ref={ref} className="field text-lg" type={q.type === 'number' ? 'number' : 'text'} inputMode={q.type === 'number' ? 'numeric' : undefined}
      min={q.min} max={q.max} value={value ?? ''} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />;
  }
  if (q.type === 'money') {
    return (
      <div>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-3 text-lg">₹</span>
          <input id={id} ref={ref} className="field text-lg pl-9" type="number" inputMode="numeric" min="0" value={value ?? ''} placeholder={q.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
        {value !== undefined && value !== '' && <p className="text-sm text-ink-3 mt-2">{inr(value)}</p>}
      </div>
    );
  }
  if (q.type === 'select') {
    const opts = q.options.map((o) => (Array.isArray(o) ? o : [o, o]));
    return (
      <div id={id} role="radiogroup" aria-label={q.label} className="grid sm:grid-cols-2 gap-2.5">
        {opts.map(([v, l], oi) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} ref={oi === 0 ? ref : undefined}
            onClick={() => { onChange(v); }}
            className="text-left px-4 py-3.5 rounded-xl border transition-colors"
            style={value === v ? { borderColor: 'var(--gold)', background: 'var(--surface-2)' } : { borderColor: 'var(--line)' }}>
            {l}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === 'chips') {
    const list = Array.isArray(value) ? value : [];
    const toggle = (o) => {
      if (o === 'None') return onChange(list.includes('None') ? [] : ['None']);
      const base = list.filter((x) => x !== 'None');
      onChange(base.includes(o) ? base.filter((x) => x !== o) : [...base, o]);
    };
    return (
      <div id={id} className="flex flex-wrap gap-2" role="group" aria-label={q.label}>
        {q.options.map((o, oi) => <button type="button" key={o} ref={oi === 0 ? ref : undefined} className="chip !text-sm !py-2 !px-4" aria-pressed={list.includes(o)} onClick={() => toggle(o)}>{o}</button>)}
      </div>
    );
  }
  if (q.type === 'tags') return <TagInput id={id} inputRef={ref} q={q} value={value} onChange={onChange} onEnter={onEnter} />;
  if (q.type === 'slider') {
    const v = value ?? q.default;
    return (
      <div>
        <div className="num text-4xl mb-4">{v}{q.unit}</div>
        <input id={id} ref={ref} type="range" min={q.min} max={q.max} step={q.step} value={v} onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--gold)]" />
        <div className="flex justify-between text-xs text-ink-3 mt-1"><span>{q.min}{q.unit}</span><span>{q.max}{q.unit}</span></div>
      </div>
    );
  }
  if (q.type === 'scale') {
    return (
      <div id={id} role="radiogroup" aria-label={q.label} className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: q.max - q.min + 1 }, (_, k) => q.min + k).map((n, k) => (
          <button key={n} type="button" role="radio" aria-checked={Number(value) === n} ref={k === 0 ? ref : undefined} onClick={() => onChange(n)}
            className="num aspect-square rounded-xl border text-lg transition-colors"
            style={Number(value) === n ? { background: 'var(--gold)', color: 'var(--on-gold)', borderColor: 'var(--gold)' } : { borderColor: 'var(--line)' }}>{n}</button>
        ))}
      </div>
    );
  }
  return null;
}

function TagInput({ id, inputRef, q, value, onChange, onEnter }) {
  const [text, setText] = useState('');
  const list = Array.isArray(value) ? value : [];
  const add = (t) => {
    const v = q.numeric ? Number(t) : t.trim();
    if ((q.numeric && !Number.isFinite(v)) || (!q.numeric && !v)) return;
    onChange((prev) => { const cur = Array.isArray(prev) ? prev : []; return cur.includes(v) ? cur : [...cur, v]; });
    setText('');
  };
  return (
    <div>
      <div className="field flex flex-wrap gap-2 items-center !py-2">
        {list.map((t) => (
          <span key={t} className="chip !bg-gold !text-on-gold !border-gold">{t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(list.filter((x) => x !== t))}><FiX size={13} /></button>
          </span>
        ))}
        <input id={id} ref={inputRef} className="flex-1 min-w-[10rem] bg-transparent outline-none py-1.5 text-lg" value={text} placeholder={list.length ? '' : q.placeholder}
          inputMode={q.numeric ? 'numeric' : undefined}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',') && text.trim()) { e.preventDefault(); add(text); }
            else if (e.key === 'Enter' && !text.trim()) { e.preventDefault(); onEnter(); }
            else if (e.key === 'Backspace' && !text && list.length) onChange(list.slice(0, -1));
          }} />
      </div>
      {q.suggestions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.suggestions.filter((s) => !list.includes(s)).map((s) => <button type="button" key={s} className="chip" onClick={() => add(s)}>+ {s}</button>)}
        </div>
      )}
    </div>
  );
}
