// Fairness and utilisation metrics for the admin dashboard and accreditation report.

/** Gini coefficient of a usage distribution: 0 = perfectly even, 1 = one person uses everything. */
export function gini(values: number[]): number {
  const xs = values.filter((v) => v >= 0).sort((a, b) => a - b);
  const n = xs.length;
  const total = xs.reduce((s, v) => s + v, 0);
  if (n < 2 || total === 0) return 0;
  const weighted = xs.reduce((s, v, i) => s + (i + 1) * v, 0);
  return (2 * weighted) / (n * total) - (n + 1) / n;
}

/** Share of all usage taken by the heaviest `fraction` of users (at least one user). */
export function topShare(values: number[], fraction = 0.2): number {
  const xs = [...values].sort((a, b) => b - a);
  const total = xs.reduce((s, v) => s + v, 0);
  if (!total) return 0;
  const k = Math.max(1, Math.round(xs.length * fraction));
  return xs.slice(0, k).reduce((s, v) => s + v, 0) / total;
}

export function hoursOf(b: { starts_at: string; ends_at: string }): number {
  return (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 3_600_000;
}
