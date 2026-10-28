"use client";

import { useEffect, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { commitFor, newSeed, runDraw, type DrawResultRow } from "@/lib/domain/draw";
import { cn } from "@/lib/utils";

// The real Fair Draw from src/lib/domain/draw.ts, running in the visitor's browser.
const ENTRANTS = [
  { bookingId: "meera", name: "Meera", note: "9 of 20 hours used", weight: 130 },
  { bookingId: "arjun", name: "Arjun", note: "12 of 20 hours used", weight: 100 },
  { bookingId: "kavya", name: "Kavya", note: "first time on this camera", weight: 160 },
  { bookingId: "rohan", name: "Rohan", note: "18 of 20 hours used", weight: 80 },
  { bookingId: "vivek", name: "Vivek", note: "12 of 20 hours used", weight: 100 },
  { bookingId: "harshit", name: "Harshit", note: "deadline on Friday", weight: 120 },
];

/** Names in a hat. Each chip shows its weight; the draw lifts one out and lines the rest up behind it. */
export function DrawHat({ slot }: { slot: string }) {
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

  const order = result ? result.map((r) => ENTRANTS.find((e) => e.bookingId === r.bookingId)!) : ENTRANTS;
  const winner = result ? order[0] : null;

  return (
    <div className="flex h-full flex-col">
      <p className="text-xl font-bold [font-stretch:112%]">{slot}</p>
      <LayoutGroup>
        <ul className="mt-5 flex flex-wrap gap-2.5" aria-label="People in the draw">
          {order.map((e, i) => {
            const won = winner?.bookingId === e.bookingId;
            return (
              <motion.li
                layout={!reduce}
                key={e.bookingId}
                animate={{ scale: won ? 1.1 : 1, rotate: won ? -3 : 0, opacity: result && !won ? 0.55 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                title={e.note}
                className={cn(
                  "rounded-full border px-4 py-2.5 text-[15px] font-[650]",
                  won ? "border-ink bg-ink text-paper" : "border-rule bg-paper text-ink",
                )}
              >
                {result && !won && <span className="tab mr-1.5 text-subtle">{i + 1}.</span>}
                {e.name}
                <small className={cn("tab ml-1.5 font-medium", won ? "text-paper/70" : "text-subtle")}>{(e.weight / 100).toFixed(1)}×</small>
              </motion.li>
            );
          })}
        </ul>
      </LayoutGroup>
      <p aria-live="polite" className="mt-5 min-h-12 text-[15px]">
        {winner ? (
          <>
            <b>{winner.name}</b> gets it ({winner.note}). Everyone else waits in the order shown.
          </>
        ) : (
          "Weight goes up for people who’ve had less time. Tap to draw."
        )}
      </p>
      <div className="mt-2">
        {!result ? (
          <button
            type="button"
            onClick={async () => setResult(await runDraw(seed, ENTRANTS))}
            disabled={!seed}
            className="min-h-11 rounded-full bg-ink px-6 font-semibold text-paper transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50"
          >
            Draw a name
          </button>
        ) : (
          <button
            type="button"
            onClick={prepare}
            className="min-h-11 rounded-full border border-current/25 px-6 font-semibold transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-0.5 active:scale-[0.97]"
          >
            New seed, draw again
          </button>
        )}
      </div>
      <dl className="mt-auto grid gap-3 pt-8 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="opacity-80">Sealed before anyone asked</dt>
          <dd className="break-all font-mono text-xs">{commit || "…"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="opacity-80">The seed, shown after</dt>
          <dd className="break-all font-mono text-xs">{result ? seed : "hidden until the draw"}</dd>
        </div>
      </dl>
    </div>
  );
}
