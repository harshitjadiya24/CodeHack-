import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card, Pill } from "@/components/ui";
import type { MatchResult } from "@/lib/ai";

type Info = { id: string; name: string; canUse: boolean; missing: { name: string }[]; partner: boolean };

export function CopilotResults({ ask, result, info }: { ask: string; result: MatchResult; info: Map<string, Info> }) {
  return (
    <Card className="mb-8 border-accent/40 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-medium">
          <Sparkles className="size-4 text-accent" aria-hidden /> Best matches for “{ask}”
        </h2>
        <Pill tone={result.source === "ai" ? "accent" : "neutral"}>
          {result.source === "ai" ? "AI suggestion · you decide" : "Keyword match (AI not configured)"}
        </Pill>
      </div>
      {result.matches.length === 0 ? (
        <p className="text-sm text-muted">Nothing in the catalogue fits that yet. Try describing the task differently.</p>
      ) : (
        <ol className="space-y-3">
          {result.matches.map((m, i) => {
            const r = info.get(m.id);
            if (!r) return null;
            return (
              <li key={m.id} className="flex gap-3">
                <span className="font-mono text-xs text-saffron">{i + 1}</span>
                <div className="text-sm">
                  <Link href={`/resources/${m.id}`} className="font-medium text-ink hover:underline">
                    {r.name}
                  </Link>
                  <p className="text-ink-2">{m.reason}</p>
                  <p className="mt-0.5">
                    {r.canUse ? (
                      <span className="text-ok">Path to access: you can request it now.</span>
                    ) : r.partner ? (
                      <span className="text-info">Path to access: needs a cross-campus endorsement.</span>
                    ) : (
                      <span className="text-warn">
                        Path to access: get {r.missing.map((x) => x.name).join(" and ")} verified in your{" "}
                        <Link href="/passport" className="underline">
                          Trust Passport
                        </Link>
                        .
                      </span>
                    )}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
