import { useMemo } from 'react';
import { monthLabel } from '../lib/format.js';

export const starPath = (x, y, r) => {
  const k = r * 0.3;
  return `M${x},${y - r}L${x + k},${y - k}L${x + r},${y}L${x + k},${y + k}L${x},${y + r}L${x - k},${y + k}L${x - r},${y}L${x - k},${y - k}Z`;
};

/**
 * The roadmap drawn as a constellation: one star per month, milestones as
 * four-point stars, the travelled path in gold.
 */
export default function Constellation({ months, startDate, progressMonths = 0, currentMonth = 1, selected, onSelect, animate = true, compact = false, fluid = false }) {
  const gap = compact ? 84 : 112;
  const padX = 48;
  const height = compact ? 150 : 200;
  const width = Math.max(padX * 2 + (months.length - 1) * gap, 320);

  const pts = useMemo(() => months.map((m, i) => ({
    ...m,
    x: padX + i * gap,
    y: height / 2 + Math.sin(i * 1.1 + 0.6) * (compact ? 22 : 30),
  })), [months, gap, height, compact]);

  const d = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }).join(' ');

  // Travelled path stops at the current star (fractional within the month).
  const travelled = Math.min(progressMonths, months.length - 1);
  const travelledD = pts.slice(0, Math.floor(travelled) + 1).map((p, i, arr) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }).join(' ');

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1" role="group" aria-label="Roadmap timeline">
      <svg viewBox={`0 0 ${width} ${height}`} width={fluid ? '100%' : width} height={fluid ? undefined : height} className="block mx-auto" style={{ maxWidth: fluid ? '100%' : 'none' }}>
        <path d={d} fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
        {travelledD && pts.length > 1 && travelled > 0 && (
          <path d={travelledD} fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeLinecap="round"
            pathLength={1} className={animate ? 'draw-path' : ''} style={{ '--len': 1 }} />
        )}
        {pts.map((p, i) => {
          const done = p.month <= Math.floor(progressMonths);
          const current = p.month === currentMonth;
          const isSel = selected === p.month;
          const isMilestone = Boolean(p.milestone);
          const r = isMilestone ? (compact ? 11 : 14) : (compact ? 6 : 7);
          const labelAbove = i % 2 === 1;
          const fill = done || current ? 'var(--gold)' : 'var(--surface)';
          const stroke = done || current ? 'var(--gold)' : 'var(--ink-3)';
          const name = `Month ${p.month}${p.title ? `: ${p.title}` : ''}${done ? ', completed' : current ? ', current' : ''}`;
          return (
            <g key={p.month}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={name}
              aria-pressed={onSelect ? isSel : undefined}
              onClick={() => onSelect?.(p.month)}
              onKeyDown={(e) => { if (onSelect && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSelect(p.month); } }}
              style={{ cursor: onSelect ? 'pointer' : 'default', outline: 'none' }}
              className="group">
              <circle cx={p.x} cy={p.y} r={28} fill="transparent" />
              {current && <circle cx={p.x} cy={p.y} r={r + 9} fill="var(--gold)" opacity="0.18" className="halo" />}
              {isSel && <circle cx={p.x} cy={p.y} r={r + 6} fill="none" stroke="var(--ink)" strokeWidth="1.5" />}
              {isMilestone
                ? <path d={starPath(p.x, p.y, r)} fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
                : <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke={stroke} strokeWidth="1.5" />}
              <circle cx={p.x} cy={p.y} r={r + 12} fill="none" stroke="var(--gold)" strokeWidth="2" opacity="0" className="group-focus-visible:opacity-100" />
              <text x={p.x} y={labelAbove ? p.y - r - 16 : p.y + r + 22} textAnchor="middle"
                style={{ fontFamily: 'var(--font-display)', fontSize: compact ? 11 : 12, fill: current || isSel ? 'var(--ink)' : 'var(--ink-3)', fontWeight: current ? 600 : 400 }}>
                {startDate ? monthLabel(startDate, p.month) : `M${p.month}`}
              </text>
              {!compact && (i === 0 || pts[i - 1].phase !== p.phase) && (
                <text x={p.x} y={labelAbove ? p.y - r - 32 : p.y + r + 38} textAnchor="middle"
                  style={{ fontSize: 11, fill: 'var(--ink-3)' }}>
                  {(p.phase || '').slice(0, 14)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
