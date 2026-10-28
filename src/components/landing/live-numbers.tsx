"use client";

import { AnimatedNumber } from "@/components/motion/primitives";

type Stats = { value: number; hours: number; served: number; borrowers: number; idle: number; gini: number };

/** Real figures from the demo campus's database, not marketing numbers. */
export function LiveNumbers({ stats }: { stats: Stats }) {
  const items = [
    { n: stats.value, fmt: (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`, label: "worth of equipment time lent in six weeks, at market rent" },
    { n: stats.hours, fmt: undefined, label: "hours of idle labs put to use" },
    { n: stats.served, fmt: (v: number) => `${Math.round(v)} of ${stats.borrowers}`, label: "registered students served at least once" },
    { n: stats.gini, fmt: (v: number) => v.toFixed(2), label: "usage concentration (Gini). Low means no one monopolises" },
  ];
  return (
    <dl className="grid gap-px overflow-hidden rounded-2xl border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="bg-card p-6">
          <dd className="font-display text-4xl font-semibold">
            <AnimatedNumber value={it.n} format={it.fmt} />
          </dd>
          <dt className="mt-2 text-sm text-ink-2">{it.label}</dt>
        </div>
      ))}
    </dl>
  );
}
