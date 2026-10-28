"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { commitFor, newSeed, runDraw, type DrawResultRow } from "@/lib/domain/draw";

// The real Fair Draw code from src/lib/domain/draw.ts, running in the visitor's browser.
const ENTRANTS = [
  { bookingId: "ishaan", name: "Ishaan", note: "first time on this printer", weight: 120 },
  { bookingId: "meera", name: "Meera", note: "deadline stated, some recent use", weight: 96 },
  { bookingId: "kabir", name: "Kabir", note: "heavy recent use", weight: 72 },
];
const TOTAL = ENTRANTS.reduce((s, e) => s + e.weight, 0);

export function DrawDemo() {
  const reduce = useReducedMotion();
  const [seed, setSeed] = useState("");
  const [commit, setCommit] = useState("");
  const [result, setResult] = useState<DrawResultRow[] | null>(null);
  const [wins, setWins] = useState<Record<string, number>>({});
  const [runs, setRuns] = useState(0);

  const prepare = async () => {
    const s = newSeed();
    setSeed(s);
    setCommit(await commitFor(s));
    setResult(null);
  };
  useEffect(() => {
    void prepare();
  }, []);

  async function draw() {
    const r = await runDraw(seed, ENTRANTS);
    setResult(r);
    setRuns((n) => n + 1);
    setWins((w) => ({ ...w, [r[0].bookingId]: (w[r[0].bookingId] ?? 0) + 1 }));
  }

  const order = result ? result.map((r) => ENTRANTS.find((e) => e.bookingId === r.bookingId)!) : ENTRANTS;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div>
        <h2 className="font-display text-4xl font-semibold leading-tight md:text-5xl">Scarce slot? Draw it fairly, in public.</h2>
        <p className="mt-4 max-w-lg text-ink-2">
          Three students want the same Friday on the 3D printer. The seed is fixed and its hash published before the draw, so nobody, not even
          the owner, can steer it. Higher priority means better odds, never a guarantee.
        </p>
        <dl className="mt-6 space-y-2 text-sm">
          <div>
            <dt className="text-muted">Published before the draw</dt>
            <dd className="break-all font-mono text-xs">{commit || "…"}</dd>
          </div>
          <div>
            <dt className="text-muted">Seed, revealed after</dt>
            <dd className="break-all font-mono text-xs">{result ? seed : "hidden until the draw"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-rule bg-card p-6">
        <LayoutGroup>
          <ol className="space-y-3">
            {order.map((e, i) => (
              <motion.li
                layout={!reduce}
                key={e.bookingId}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={`flex items-center gap-4 rounded-xl border p-4 ${result && i === 0 ? "border-accent bg-accent-soft" : "border-rule bg-paper"}`}
              >
                <span className="grid size-9 place-items-center rounded-full bg-card font-semibold">{result ? i + 1 : "?"}</span>
                <span className="flex-1">
                  <span className="block font-medium">{e.name}</span>
                  <span className="block text-xs text-muted">{e.note}</span>
                </span>
                <span className="text-right">
                  <span className="block font-mono text-sm">{Math.round((e.weight / TOTAL) * 100)}%</span>
                  <span className="block text-xs text-muted">weight {e.weight}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </LayoutGroup>
        <AnimatePresence mode="wait">
          {result && (
            <motion.p key={runs} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-sm text-ink-2">
              {order[0].name} wins; the others join the waitlist in this order.
            </motion.p>
          )}
        </AnimatePresence>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!result ? (
            <button onClick={draw} disabled={!seed} className="rounded-full bg-saffron px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              Run the draw
            </button>
          ) : (
            <button onClick={prepare} className="rounded-full border border-rule px-5 py-2.5 text-sm">
              New seed, draw again
            </button>
          )}
          {runs > 1 && (
            <span className="text-xs text-muted">
              Wins after {runs} draws:{" "}
              {ENTRANTS.map((e) => `${e.name} ${wins[e.bookingId] ?? 0}`).join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
