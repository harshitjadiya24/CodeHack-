import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCampus } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Verify audit chain" };

export default async function VerifyChainPage() {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("verify_audit_chain");
  const result = data?.[0];

  return (
    <>
      <PageHeader eyebrow="Tamper evidence" title="Audit chain integrity" />
      <Card className={`max-w-2xl p-6 ${result?.ok ? "border-ok/50" : "border-danger/50"}`}>
        <div className="flex items-start gap-3">
          {result?.ok ? <CheckCircle2 className="size-8 shrink-0 text-ok" aria-hidden /> : <XCircle className="size-8 shrink-0 text-danger" aria-hidden />}
          <div>
            <h2 className="font-display text-3xl">{result?.ok ? "Chain intact" : "Chain broken"}</h2>
            <p className="mt-1 text-ink-2">
              {result?.ok
                ? `All ${result.checked} records were re-hashed just now (${formatCampus(new Date())}) and every link matches.`
                : `Record #${result?.broken_at} does not match its hash. Something was altered outside Saajha.`}
            </p>
          </div>
        </div>
        <h3 className="mb-1 mt-6 text-sm font-bold">What this proves</h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
          <li>Each record stores the SHA-256 of its own contents plus the previous record’s hash.</li>
          <li>The database rejects any UPDATE or DELETE on the log, and even a database administrator who bypassed that would break every later hash.</li>
          <li>Approvals, rejections, cancellations, check-ins, returns, incidents and penalties are all in this chain.</li>
        </ul>
      </Card>
    </>
  );
}
