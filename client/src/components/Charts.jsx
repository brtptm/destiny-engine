import { ResponsiveContainer, ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { inr, inrShort, monthLabel } from '../lib/format.js';

const axis = { stroke: 'var(--line)', tickLine: false, axisLine: false, tick: { fill: 'var(--ink-3)', fontSize: 12 } };

function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2 mb-3" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="inline-flex items-center gap-2">
          {i.dashed
            ? <svg width="18" height="4" aria-hidden="true"><line x1="0" y1="2" x2="18" y2="2" stroke={i.color} strokeWidth="2" strokeDasharray="4 3" /></svg>
            : <span className="w-3 h-3 rounded-[3px]" style={{ background: i.color }} aria-hidden="true" />}
          {i.label}
        </li>
      ))}
    </ul>
  );
}

function Tip({ active, payload, label, labels }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold mb-1">{label}</div>
      {payload.filter((p) => p.value != null).map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="text-ink-2">{labels[p.dataKey]}</span>
          <span className="num">{inr(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Roadmap month of a date, 1-based. */
const monthOf = (startDate, date) => Math.max(1, Math.floor((new Date(date) - new Date(startDate)) / (30.44 * 86400000)) + 1);

export function IncomeChart({ projection, incomeLog = [], startDate, currentMonth, height = 260 }) {
  const base = projection.currentMonthlyIncome;
  const actual = {};
  for (const x of incomeLog) { const m = monthOf(startDate, x.date); actual[m] = (actual[m] || 0) + Number(x.amount); }
  const data = projection.byMonth.map((b) => ({
    name: monthLabel(startDate, b.month),
    planned: Math.max(0, b.income - base),
    actual: b.month <= currentMonth ? (actual[b.month] || 0) : null,
  }));
  const labels = { planned: 'Planned new income', actual: 'New income logged' };
  return (
    <figure>
      <Legend items={[{ label: labels.actual, color: 'var(--chart-actual)' }, { label: labels.planned, color: 'var(--chart-plan)', dashed: true }]} />
      <div style={{ height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={52} tickFormatter={inrShort} />
            <Tooltip content={<Tip labels={labels} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="actual" fill="var(--chart-actual)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line dataKey="planned" stroke="var(--chart-plan)" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 5 }} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Planned new income per month compared with income you logged.</figcaption>
    </figure>
  );
}

export function SavingsChart({ projection, savingsLog = [], startSavings = 0, startDate, currentMonth, height = 240 }) {
  const byM = {};
  for (const x of savingsLog) { const m = monthOf(startDate, x.date); byM[m] = (byM[m] || 0) + Number(x.amount); }
  let run = startSavings;
  const data = projection.byMonth.map((b) => {
    if (b.month <= currentMonth) run += byM[b.month] || 0;
    return { name: monthLabel(startDate, b.month), planned: b.cumulative, actual: b.month <= currentMonth ? run : null };
  });
  const labels = { planned: 'Planned savings', actual: 'Your savings' };
  return (
    <figure>
      <Legend items={[{ label: labels.actual, color: 'var(--chart-savings)' }, { label: labels.planned, color: 'var(--chart-plan)', dashed: true }]} />
      <div style={{ height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sav" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-savings)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-savings)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={56} tickFormatter={inrShort} />
            <Tooltip content={<Tip labels={labels} />} />
            <Line dataKey="planned" stroke="var(--chart-plan)" strokeWidth={2} strokeDasharray="6 4" dot={false} activeDot={{ r: 5 }} type="monotone" />
            <Area dataKey="actual" stroke="var(--chart-savings)" strokeWidth={2} fill="url(#sav)" dot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} activeDot={{ r: 6 }} type="monotone" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Planned cumulative savings compared with your actual savings.</figcaption>
    </figure>
  );
}

/** Projection-only chart for the roadmap and feasibility views. */
export function ProjectionChart({ projection, startDate, height = 220 }) {
  const data = projection.byMonth.map((b) => ({ name: monthLabel(startDate, b.month), income: b.income, expenses: b.expenses }));
  const labels = { income: 'Monthly income', expenses: 'Monthly expenses' };
  return (
    <figure>
      <Legend items={[{ label: labels.income, color: 'var(--chart-actual)' }, { label: labels.expenses, color: 'var(--chart-plan)', dashed: true }]} />
      <div style={{ height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="name" {...axis} />
            <YAxis {...axis} width={52} tickFormatter={inrShort} />
            <Tooltip content={<Tip labels={labels} />} cursor={{ fill: 'var(--surface-2)' }} />
            <Bar dataKey="income" fill="var(--chart-actual)" radius={[4, 4, 0, 0]} maxBarSize={26} />
            <Line dataKey="expenses" stroke="var(--chart-plan)" strokeWidth={2} strokeDasharray="6 4" dot={false} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
