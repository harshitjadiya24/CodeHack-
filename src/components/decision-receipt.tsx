import Link from "next/link";
import { Bot, Scale, UserCheck } from "lucide-react";
import { Card, Mono } from "@/components/ui";
import type { DecisionReceipt } from "@/lib/domain/receipt";
import { formatCampus } from "@/lib/domain/time";

export function DecisionReceiptCard({ receipt }: { receipt: DecisionReceipt }) {
  const byPerson = receipt.decidedBy.kind === "person";
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-rule bg-paper-2 px-5 py-3">
        <p className="text-sm text-subtle">Decision receipt</p>
        <h2 className="font-display text-2xl">{receipt.headline}</h2>
      </div>
      <div className="space-y-5 p-5">
        <div>
          <h3 className="mb-1 text-sm font-bold">Why</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
            {receipt.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        <p className="flex items-center gap-2 text-sm text-ink-2">
          {byPerson ? <UserCheck className="size-4 text-accent" aria-hidden /> : <Bot className="size-4 text-subtle" aria-hidden />}
          {receipt.decidedBy.kind === "person"
            ? `Decided by ${receipt.decidedBy.name} (${receipt.decidedBy.role})`
            : "Applied automatically by published rules"}
          <span className="text-subtle">· {formatCampus(receipt.at)}</span>
        </p>

        {receipt.priority && (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Scale className="size-4 text-saffron" aria-hidden /> Priority score: {receipt.priority.score}
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {receipt.priority.breakdown.map((b) => (
                  <tr key={b.label} className="border-t border-rule">
                    <td className="py-1.5 text-ink-2">{b.label}</td>
                    <td className={`py-1.5 text-right font-mono ${b.points < 0 ? "text-danger" : "text-ok"}`}>
                      {b.points > 0 ? "+" : ""}
                      {b.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {receipt.draw && (
          <div className="rounded-xl bg-saffron-soft p-3 text-sm">
            <p className="font-medium text-saffron">Fair Draw{receipt.draw.rank ? ` · rank ${receipt.draw.rank} of ${receipt.draw.entrants}` : " · pending"}</p>
            <p className="mt-1 break-all">
              Commit <Mono className="text-ink">{receipt.draw.commit.slice(0, 24)}…</Mono>
            </p>
            <Link href={`/verify/draw/${receipt.draw.drawId}`} className="mt-1 inline-block text-accent underline">
              Verify this draw yourself
            </Link>
          </div>
        )}
      </div>
    </Card>
  );
}
