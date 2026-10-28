"use client";

import { useEffect, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { commitFor, newSeed, runDraw, type DrawResultRow } from "@/lib/domain/draw";
import { cn } from "@/lib/utils";

// The real Fair Draw from src/lib/domain/draw.ts, running in the visitor's browser.
const ENTRANTS = [
  { bookingId: "meera", name: "Meera S.", note: "9 of 20 hours used", weight: 130 },
  { bookingId: "arjun", name: "Arjun R.", note: "12 of 20 hours used", weight: 100 },
  { bookingId: "kavya", name: "Kavya P.", note: "first time on this camera", weight: 160 },
  { bookingId: "rohan", name: "Rohan S.", note: "18 of 20 hours used", weight: 80 },
  { bookingId: "vivek", name: "Vivek N.", note: "12 of 20 hours used", weight: 100 },
  { bookingId: "harshit", name: "Harshit J.", note: "deadline on Friday", weight: 120 },
];

export function DrawBoard() {
  const reduce = useReducedMotion();
  const [seed, setSeed] = useState("");
  const [commit, setCommit] = useState("");
  const [result, setResult] = useState<DrawResultRow[] | null>(null);

  async function prepare() {
    const s = newSeed();
    setSeed(s);
    setCommit(await commitFor(s));
    setResult(null);
  }
  useEffect(() => {
    void prepare();
  }, []);

  async function draw() {
    setResult(await runDraw(seed, ENTRANTS));
  }

  const order = result ? result.map((r) => ENTRANTS.find((e) => e.bookingId === r.bookingId)!) : ENTRANTS;

  return (
    <div>
      <LayoutGroup>
        <ol className="overflow-hidden rounded-lg border border-rule bg-card" aria-live="polite">
          {order.map((e, i) => {
            const won = result && i === 0;
            return (
              <motion.li
                layout={!reduce}
                key={e.bookingId}
                transition={{ type: "spring", duration: 0.55, bounce: 0.15 }}
                className={cn("grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0 sm:grid-cols-[2.5rem_1fr_6rem_5rem]", won && "bg-board-soft")}
              >
                <span className={cn("readout text-2xl", won ? "!text-board" : "!text-subtle")}>{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <span className="block font-bold">{e.name}</span>
                  <span className="block truncate text-sm text-subtle">{e.note}</span>
                </span>
                <span className="tab hidden text-sm text-subtle sm:block">weight {(e.weight / 100).toFixed(1)}×</span>
                <span className={cn("chart-code text-right text-sm", won ? "text-board" : "text-subtle")}>{result ? (won ? "CNF" : `WL ${i}`) : "IN DRAW"}</span>
              </motion.li>
            );
          })}
        </ol>
      </LayoutGroup>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!result ? (
          <button
            type="button"
            onClick={draw}
            disabled={!seed}
            className="board-chip min-h-11 rounded-md px-5 font-semibold transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
          >
            Run the draw
          </button>
        ) : (
          <button
            type="button"
            onClick={prepare}
            className="min-h-11 rounded-md border border-rule px-5 font-semibold transition-[transform,border-color] duration-150 hover:border-ink active:scale-[0.97]"
          >
            New seed, draw again
          </button>
        )}
        <span className="text-sm text-subtle">{result ? `${order[0].name} gets the camera. The rest wait in this order.` : "Weight is higher for people who have had less time."}</span>
      </div>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-subtle">Locked before anyone asked</dt>
          <dd className="break-all font-mono text-xs text-ink-2">{commit || "…"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-subtle">Seed, shown after the draw</dt>
          <dd className="break-all font-mono text-xs text-ink-2">{result ? seed : "hidden until the draw"}</dd>
        </div>
      </dl>
    </div>
  );
}
