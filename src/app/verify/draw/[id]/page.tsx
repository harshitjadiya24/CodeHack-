import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Mono, Pill } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampus } from "@/lib/domain/time";
import { DrawVerifier } from "./draw-verifier";

export const metadata: Metadata = { title: "Verify a Fair Draw" };

type Row = { bookingId: string; weight: number; key: number; rank: number };

/** Public: anyone can audit a draw. Entrants are shown by anonymous booking reference only. */
export default async function DrawVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: draw } = await createAdminClient()
    .from("draw_windows")
    .select("*, resource:resources(name)")
    .eq("id", id)
    .maybeSingle();
  if (!draw) notFound();
  const results = (draw.results ?? []) as Row[];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="font-display text-2xl">
        Saajha
      </Link>
      <p className="mt-8 text-sm text-saffron">Fair Draw · public verification</p>
      <h1 className="font-display text-4xl leading-tight">{draw.resource?.name}</h1>
      <p className="text-subtle">
        Slot {formatCampus(draw.slot_start, { weekday: "short" })} – {formatCampus(draw.slot_end, { day: undefined, month: undefined })}
      </p>

      <Card className="mt-8 space-y-4 p-6">
        <h2 className="font-bold">How this draw stays honest</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
          <li>When the first clash happened, Saajha generated a secret random seed and published only its SHA-256 hash (the commit).</li>
          <li>Nobody could change the seed afterwards without the hash changing.</li>
          <li>At draw time the seed was revealed. Each entrant got a key u^(1/weight), where u comes from hashing the seed with their booking reference.</li>
          <li>Highest key wins. Higher priority means better odds, never certainty, and request order plays no part.</li>
        </ol>
        <dl className="grid gap-2 text-sm">
          <div>
            <dt className="text-subtle">Commit (published {formatCampus(draw.created_at)})</dt>
            <dd>
              <Mono className="break-all text-ink">{draw.commit_hash}</Mono>
            </dd>
          </div>
          <div>
            <dt className="text-subtle">Revealed seed</dt>
            <dd>{draw.seed ? <Mono className="break-all text-ink">{draw.seed}</Mono> : <Pill tone="warn">Not drawn yet: seed still secret</Pill>}</dd>
          </div>
        </dl>
      </Card>

      {draw.seed && results.length > 0 && (
        <Card className="mt-6 p-6">
          <h2 className="mb-3 font-bold">Published result · drawn {draw.drawn_at && formatCampus(draw.drawn_at)}</h2>
          <table className="mb-5 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-subtle">
                <th className="pb-1 font-normal">Rank</th>
                <th className="pb-1 font-normal">Booking ref</th>
                <th className="pb-1 font-normal">Weight</th>
                <th className="pb-1 text-right font-normal">Key</th>
              </tr>
            </thead>
            <tbody>
              {[...results].sort((a, b) => a.rank - b.rank).map((r) => (
                <tr key={r.bookingId} className="border-t border-rule">
                  <td className="py-2">{r.rank === 1 ? <Pill tone="ok">1 · won</Pill> : r.rank}</td>
                  <td className="py-2 font-mono text-xs">{r.bookingId.slice(0, 8)}</td>
                  <td className="py-2 font-mono">{r.weight}</td>
                  <td className="py-2 text-right font-mono text-xs">{r.key.toFixed(6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <DrawVerifier seed={draw.seed} commit={draw.commit_hash} published={results} />
        </Card>
      )}
    </main>
  );
}
