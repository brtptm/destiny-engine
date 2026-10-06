import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FiSearch, FiClock, FiAlertCircle } from 'react-icons/fi';
import { api, useDashboard } from '../lib/api.js';
import { Modal, ErrorNote, Spinner } from '../components/ui.jsx';

const EXAMPLES = [
  'Move to Goa with my family, work freelance and live near the beach',
  'Become a YouTuber teaching personal finance and earn ₹3L a month',
  'Switch from sales into product management at a tech company',
  'Open a small bakery café in my hometown',
  'Be debt-free and build a 12-month emergency fund',
];

const CATEGORIES = [
  ['', 'All'], ['relocation', 'Relocate'], ['freelance', 'Go independent'], ['creator', 'Creator'], ['startup', 'Startup'],
  ['wealth', 'Money'], ['career', 'Career'], ['business', 'Business'], ['study', 'Study'], ['health', 'Health'], ['home', 'Home'],
];

export default function DreamInput() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: dash } = useDashboard();
  const [text, setText] = useState('');
  const [templateId, setTemplateId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [ph, setPh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['templates'], queryFn: () => api.templates(), staleTime: Infinity });
  const templates = useMemo(() => (data?.templates || []).filter((t) => (!cat || t.archetype === cat) && (!q || `${t.title} ${t.dream}`.toLowerCase().includes(q.toLowerCase()))), [data, cat, q]);

  useEffect(() => {
    if (text) return;
    const t = setInterval(() => setPh((p) => (p + 1) % EXAMPLES.length), 3500);
    return () => clearInterval(t);
  }, [text]);

  const tpl = templateId && data?.templates.find((t) => t.id === templateId);

  async function submit(e) {
    e.preventDefault();
    if (text.trim().length < 8) { setError(new Error('Describe your dream in a sentence — what you want and, if you can, by when.')); return; }
    setBusy(true); setError(null);
    try {
      await api.createDream({ description: text.trim(), templateId: tpl && text.trim() === tpl.dream ? tpl.id : templateId });
      await qc.invalidateQueries({ queryKey: ['dashboard'] });
      nav('/feasibility');
    } catch (err) { setError(err); setBusy(false); }
  }

  function applyTemplate(t) {
    setText(t.dream);
    setTemplateId(t.id);
    setPreview(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (busy) return <Spinner label="Checking your dream against your real numbers…" />;

  return (
    <div className="pt-4 sm:pt-8">
      <form onSubmit={submit} className="max-w-3xl">
        <label htmlFor="dream" className="block font-display text-3xl sm:text-4xl leading-tight">What’s your dream?</label>
        <p className="text-ink-2 mt-3">Say it the way you’d tell a friend. Specific beats modest — places, numbers and dates help.</p>
        {dash?.stage === 'active' && (
          <p className="mt-4 text-sm flex gap-2 text-ink-2"><FiAlertCircle className="mt-0.5 text-gold-text shrink-0" />Starting a new dream archives your current roadmap. Your history stays in your data export.</p>
        )}
        <textarea id="dream" rows={4} value={text} maxLength={600} onChange={(e) => { setText(e.target.value); if (!e.target.value) setTemplateId(null); }}
          placeholder={EXAMPLES[ph]} className="field mt-6 text-lg sm:text-xl leading-relaxed resize-none" />
        <div className="flex justify-between text-xs text-ink-3 mt-2">
          <span>{tpl ? `Started from “${tpl.title}” — edit it to make it yours.` : 'Or start from a template below.'}</span>
          <span>{text.length}/600</span>
        </div>
        <div className="mt-4"><ErrorNote error={error} /></div>
        <button className="btn btn-primary mt-6" disabled={!text.trim()}>Check if it’s feasible</button>
      </form>

      <section className="mt-16" aria-labelledby="tpl-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="tpl-h" className="text-xl">Browse {data?.total || 50} dream templates</h2>
            <p className="text-sm text-ink-3 mt-1">Each comes with a sample roadmap, common obstacles and an illustrative story.</p>
          </div>
          <label className="relative w-full sm:w-72">
            <span className="sr-only">Search templates</span>
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input className="field !pl-10 !py-2.5" placeholder="Search dreams" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1" role="group" aria-label="Filter by category">
          {CATEGORIES.map(([k, l]) => <button key={k} type="button" className="chip shrink-0" aria-pressed={cat === k} onClick={() => setCat(k)}>{l}</button>)}
        </div>
        {isLoading ? <Spinner label="Loading templates" /> : (
          <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setPreview(t)} className="w-full text-left panel p-4 hover:border-ink-3 transition-colors h-full"
                  style={templateId === t.id ? { borderColor: 'var(--gold)' } : undefined}>
                  <div className="text-xs text-ink-3">{t.category}</div>
                  <div className="font-semibold mt-1">{t.title}</div>
                  <div className="text-sm text-ink-3 mt-2 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><FiClock size={12} />~{t.typicalMonths} months</span>
                    <span>{t.difficulty === 'easy' ? 'Gentle' : t.difficulty === 'medium' ? 'Steady' : 'Ambitious'}</span>
                  </div>
                </button>
              </li>
            ))}
            {!templates.length && <li className="text-ink-3 py-6">No templates match “{q}”. Write your own dream above.</li>}
          </ul>
        )}
      </section>

      {preview && (
        <Modal title={preview.title} onClose={() => setPreview(null)}>
          <p className="text-lg">“{preview.dream}”</p>
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[['Fast', preview.timelineVariations.fast], ['Typical', preview.timelineVariations.typical], ['Steady', preview.timelineVariations.steady]].map(([l, v]) => (
              <div key={l} className="panel-quiet py-3"><dt className="text-xs text-ink-3">{l}</dt><dd className="num text-xl">{v}<span className="text-sm text-ink-3"> mo</span></dd></div>
            ))}
          </dl>
          <h3 className="text-base mt-6">Sample roadmap</h3>
          <ol className="mt-2 flex flex-wrap gap-2 text-sm">{preview.phases.map((p, i) => <li key={p} className="chip !cursor-default">{i + 1}. {p}</li>)}</ol>
          <h3 className="text-base mt-6">Common obstacles</h3>
          <ul className="mt-2 grid gap-3 text-sm">
            {preview.obstacles.map((o) => <li key={o.obstacle}><div className="font-semibold">{o.obstacle}</div><div className="text-ink-2">{o.solution}</div></li>)}
          </ul>
          <figure className="mt-6 panel-quiet p-4">
            <blockquote>“{preview.successStory.quote}”</blockquote>
            <figcaption className="text-sm text-ink-3 mt-2">{preview.successStory.outcome}</figcaption>
          </figure>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-primary" onClick={() => applyTemplate(preview)}>Use this dream</button>
            <button className="btn btn-ghost" onClick={() => setPreview(null)}>Keep browsing</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
