import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCampus } from "@/lib/domain/time";
import { ACTION_LABEL, BOOKING_STATUS } from "@/lib/status";
import type { DecisionReceipt } from "@/lib/domain/receipt";
import { PrintButton } from "@/app/(app)/owner/resources/[id]/qr/print-button";

export const metadata: Metadata = { title: "Booking record" };

/** Printable, self-contained record of one booking. "Save as PDF" from the print dialog. */
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("*, resource:resources(name, location), requester:profiles!bookings_user_id_fkey(full_name, roll_no)")
    .eq("id", id)
    .maybeSingle();
  if (!b?.resource) notFound();
  const [{ data: log }, { data: handovers }, { data: incidents }] = await Promise.all([
    supabase.from("audit_log").select("id, action, reason, created_at, hash, actor:profiles!audit_log_actor_id_fkey(full_name)").eq("entity_id", id).order("id"),
    supabase.from("handovers").select("phase, checklist, notes, created_at, attendant_confirmed_at, photo_paths").eq("booking_id", id).order("created_at"),
    supabase.from("incidents").select("type, severity, status, description, decision").eq("booking_id", id),
  ]);
  const receipt = b.decision_receipt as DecisionReceipt | null;

  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm">
      <div className="flex justify-end print:hidden">
        <div className="w-48">
          <PrintButton />
        </div>
      </div>
      <header className="border-b border-rule pb-4">
        <p className="text-sm text-muted">Saajha booking record · {b.id}</p>
        <h1 className="font-display text-3xl">{b.resource.name}</h1>
        <p className="text-ink-2">
          {b.requester?.full_name} ({b.requester?.roll_no}) · {formatCampus(b.starts_at, { weekday: "long", year: "numeric" })} –{" "}
          {formatCampus(b.ends_at, { day: undefined, month: undefined })} · {b.resource.location}
        </p>
        <p className="mt-1">
          Status: <strong>{BOOKING_STATUS[b.status].label}</strong> · {b.credits} credits · Purpose: {b.purpose}
        </p>
      </header>

      {receipt && (
        <section>
          <h2 className="mb-1 text-base font-semibold">Decision: {receipt.headline}</h2>
          <ul className="list-disc pl-5 text-ink-2">
            {receipt.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {receipt.priority && <p className="mt-1 text-ink-2">Priority score {receipt.priority.score}: {receipt.priority.breakdown.map((x) => `${x.label} (${x.points > 0 ? "+" : ""}${x.points})`).join(", ")}</p>}
        </section>
      )}

      {!!handovers?.length && (
        <section>
          <h2 className="mb-1 text-base font-semibold">Condition record</h2>
          {handovers.map((h) => (
            <div key={h.phase} className="mb-2">
              <p className="font-medium">
                {h.phase === "check_in" ? "Check-in" : "Return"} · {formatCampus(h.created_at)} · {h.photo_paths.length} photos
                {h.attendant_confirmed_at && " · attendant confirmed"}
              </p>
              <p className="text-ink-2">
                {Object.entries(h.checklist as Record<string, boolean>)
                  .map(([k, v]) => `${v ? "✓" : "✗"} ${k}`)
                  .join(" · ")}
              </p>
              {h.notes && <p className="text-ink-2">Notes: {h.notes}</p>}
            </div>
          ))}
        </section>
      )}

      {!!incidents?.length && (
        <section>
          <h2 className="mb-1 text-base font-semibold">Incidents</h2>
          {incidents.map((i, n) => (
            <p key={n} className="text-ink-2">
              {i.type} ({i.severity}, {i.status}): {i.description} {i.decision && `— Decision: ${i.decision}`}
            </p>
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-1 text-base font-semibold">Audit trail</h2>
        <table className="w-full">
          <tbody className="divide-y divide-rule">
            {(log ?? []).map((e) => (
              <tr key={e.id} className="align-top">
                <td className="py-1 pr-2 whitespace-nowrap">{formatCampus(e.created_at)}</td>
                <td className="py-1 pr-2">{ACTION_LABEL[e.action] ?? e.action}</td>
                <td className="py-1 pr-2 text-ink-2">{e.actor?.full_name ?? "Automatic rule"}</td>
                <td className="py-1 font-mono text-[10px] text-muted">{e.hash.slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <footer className="border-t border-rule pt-3 text-xs text-muted">
        Each hash links to the previous entry in the campus audit chain. Verify at /audit/verify. Generated {formatCampus(new Date(), { year: "numeric" })}.
      </footer>
    </article>
  );
}
