"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { runDraw, verifyCommit } from "@/lib/domain/draw";

type Row = { bookingId: string; weight: number; rank: number };

/** Recomputes the draw entirely in the browser: no trust in the server required. */
export function DrawVerifier({ seed, commit, published }: { seed: string; commit: string; published: Row[] }) {
  const [result, setResult] = useState<{ commitOk: boolean; rankingOk: boolean } | null>(null);

  async function verify() {
    const commitOk = await verifyCommit(seed, commit);
    const recomputed = await runDraw(seed, published.map((r) => ({ bookingId: r.bookingId, weight: r.weight })));
    const rankingOk = recomputed.every((r, i) => r.bookingId === [...published].sort((a, b) => a.rank - b.rank)[i].bookingId);
    setResult({ commitOk, rankingOk });
  }

  return (
    <div className="space-y-3">
      <Button onClick={verify}>Re-run the draw in my browser</Button>
      {result && (
        <ul className="space-y-1 text-sm" role="status">
          {[
            [result.commitOk, "The revealed seed matches the commit published before the draw."],
            [result.rankingOk, "Re-running the weighted lottery gives exactly the published ranking."],
          ].map(([ok, label]) => (
            <li key={String(label)} className={`flex items-center gap-2 ${ok ? "text-ok" : "text-danger"}`}>
              {ok ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
              {String(label)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
