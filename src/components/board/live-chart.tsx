"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChartCell, ChartRow } from "@/lib/services/chart";
import { cn } from "@/lib/utils";

const CODE: Record<ChartCell["kind"], string> = {
  cnf: "bg-ok-soft text-ok",
  draw: "bg-saffron-soft text-saffron",
  asked: "bg-paper-2 text-ink-2",
  open: "board-chip cursor-pointer hover:brightness-95",
  closed: "text-subtle font-medium",
};

function label(c: ChartCell) {
  switch (c.kind) {
    case "cnf":
      return `CNF ${c.initials}`;
    case "draw":
      return `DRAW ${c.count}`;
    case "asked":
      return `REQ ${c.count}`;
    case "open":
      return "OPEN";
    case "closed":
      return "CLOSED";
  }
}

/** The reservation chart for one campus day. OPEN cells can be held; holding leads into the real request flow. */
export function LiveChart({ rows, slots, dayLabel }: { rows: ChartRow[]; slots: readonly { label: string }[]; dayLabel: string }) {
  const [held, setHeld] = useState<{ row: number; col: number } | null>(null);
  const heldRow = held ? rows[held.row] : null;

  return (
    <figure className="overflow-hidden rounded-lg border border-rule bg-card shadow-plate">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule px-4 py-3 sm:px-5">
        <span className="font-display text-lg font-bold">Booking chart, {dayLabel}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-subtle">
          <span>
            <b className="chart-code text-ok">CNF</b> confirmed
          </span>
          <span>
            <b className="chart-code text-ink">OPEN</b> free to hold
          </span>
          <span>
            <b className="chart-code text-saffron">DRAW</b> people in the draw
          </span>
        </span>
      </figcaption>
      <div className="overflow-x-auto">
        <table className="tab w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr className="text-[13px] text-subtle">
              <th scope="col" className="sticky left-0 z-10 bg-card px-4 py-2.5 font-semibold sm:px-5">
                Equipment
              </th>
              {slots.map((s) => (
                <th key={s.label} scope="col" className="px-3 py-2.5 font-semibold">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={r.id} className="border-t border-rule">
                <th scope="row" className="sticky left-0 z-10 max-w-[11rem] bg-card px-4 py-3 font-normal sm:max-w-none sm:px-5">
                  <span className="block font-bold leading-tight">{r.name}</span>
                  <span className="block text-[13px] text-subtle">
                    {r.location}
                    {r.needs ? `, needs ${r.needs.toLowerCase()}` : ", open to all"}
                  </span>
                </th>
                {r.cells.map((c, ci) => {
                  const isHeld = held?.row === ri && held?.col === ci;
                  const style = { animationDelay: `${600 + ri * 90 + ci * 45}ms` };
                  return (
                    <td key={ci} className="px-3 py-3">
                      {c.kind === "open" ? (
                        <button
                          type="button"
                          onClick={() => setHeld(isHeld ? null : { row: ri, col: ci })}
                          aria-pressed={isHeld}
                          aria-label={`${r.name} at ${slots[ci].label}: open. ${isHeld ? "Release" : "Hold"} this slot`}
                          style={style}
                          className={cn(
                            "chart-cell chart-code inline-flex min-h-11 min-w-[5.5rem] items-center rounded-[4px] px-2 text-sm transition-transform duration-150 active:scale-[0.97]",
                            isHeld ? "bg-ink text-board" : CODE.open,
                          )}
                        >
                          {isHeld ? "HELD · YOU" : "OPEN"}
                        </button>
                      ) : (
                        <span style={style} className={cn("chart-cell chart-code inline-flex min-h-11 min-w-[5.5rem] items-center rounded-[4px] px-2 text-sm", CODE[c.kind])}>
                          {label(c)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-4 py-3 text-[15px] sm:px-5" aria-live="polite">
        {heldRow && held ? (
          <>
            <span>
              Holding <b>{heldRow.name}</b> at <b>{slots[held.col].label}</b>. Request it to make it yours.
            </span>
            <Link href={`/resources/${heldRow.id}`} className="font-semibold underline decoration-2 underline-offset-4 hover:decoration-board">
              Request this slot
            </Link>
          </>
        ) : (
          <span className="text-subtle">Live from the demo campus. Tap any OPEN slot to hold it.</span>
        )}
      </div>
    </figure>
  );
}
