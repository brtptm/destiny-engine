export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export function inrShort(n) {
  const v = Math.round(Number(n) || 0);
  const a = Math.abs(v);
  if (a >= 1e7) return `₹${+(v / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `₹${+(v / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `₹${+(v / 1e3).toFixed(0)}k`;
  return `₹${v}`;
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function feasibilityTone(pct) {
  if (pct >= 75) return { color: 'var(--sea)', label: 'Strong' };
  if (pct >= 50) return { color: 'var(--gold-text)', label: 'Achievable' };
  return { color: 'var(--rose)', label: 'Stretch' };
}

export const confidenceLabel = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence', 'very-high': 'Very high confidence' };

export function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setDate(1); // a start on the 31st must not roll "31 Feb" over into March
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}
export const monthLabel = (startDate, m) => addMonths(startDate, m - 1).toLocaleDateString('en-IN', { month: 'short' });
