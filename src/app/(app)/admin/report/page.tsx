import type { Metadata } from "next";
import { requirePageRole } from "@/lib/auth";
import { campusInsights } from "@/lib/services/insights";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampus } from "@/lib/domain/time";
import { inr } from "@/lib/utils";
import { PrintButton } from "@/app/(app)/owner/resources/[id]/qr/print-button";

export const metadata: Metadata = { title: "Infrastructure utilisation report" };

/** Print-ready evidence of how shared infrastructure is used, in the shape accreditation reviews ask for. */
export default async function ReportPage() {
  const user = await requirePageRole(["admin", "manager"]);
  const [ins, { data: org }] = await Promise.all([campusInsights(user.org_id), createAdminClient().from("organizations").select("name").eq("id", user.org_id).single()]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <article className="mx-auto max-w-3xl space-y-6 text-sm">
      <div className="flex justify-end print:hidden">
        <div className="w-48">
          <PrintButton />
        </div>
      </div>
      <header className="border-b border-rule pb-4">
        <p className="text-sm text-subtle">Infrastructure and learning resources · utilisation evidence</p>
        <h1 className="font-display text-4xl">Shared Facilities Utilisation Report</h1>
        <p className="text-subtle">
          {org?.name} · last {ins.weeks} weeks · generated {formatCampus(new Date(), { year: "numeric" })} from the Saajha audit chain
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-base font-bold">1. Summary</h2>
        <table className="w-full">
          <tbody className="divide-y divide-rule">
            {[
              ["Shared resources listed", String(ins.perResource.length)],
              ["Completed bookings", String(ins.totals.bookings)],
              ["Hours of equipment and space use", String(Math.round(ins.totals.hours))],
              ["Distinct students and researchers served", `${ins.totals.uniqueUsers} of ${ins.totals.borrowers} registered`],
              ["Average utilisation (of 45 open hours/week)", pct(ins.totals.avgUtilisation)],
              ["Market value of access provided", inr(ins.totals.value)],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="py-1.5 text-ink-2">{k}</td>
                <td className="py-1.5 text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold">2. Equitable access</h2>
        <p className="text-ink-2">
          Usage concentration (Gini) is {ins.fairness.gini.toFixed(2)}; the most active 20% of users accounted for {pct(ins.fairness.top20Share)} of hours.{" "}
          {ins.fairness.drawsRun} high-demand clashes were settled by verifiable Fair Draw and {ins.fairness.promoted} waitlisted users were promoted
          automatically. {pct(ins.fairness.firstTimeShare)} of requests came from people using a resource for the first time.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold">3. Safety and accountability</h2>
        <p className="text-ink-2">
          Access to every controlled resource required a verified, unexpired skill badge issued by a named manager. {ins.safety.incidents} incidents were recorded
          ({ins.safety.per100.toFixed(1)} per 100 bookings), each reviewed by a person; {ins.safety.strikes} resulted in a strike. Every approval, handover and
          decision is held in a SHA-256 hash-chained log that rejects edits and deletions.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold">4. Utilisation by facility</h2>
        <table className="w-full">
          <thead className="text-left text-xs text-subtle">
            <tr>
              <th className="py-1 font-normal">Facility</th>
              <th className="py-1 font-normal">Department</th>
              <th className="py-1 text-right font-normal">Hours</th>
              <th className="py-1 text-right font-normal">Utilisation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {ins.perResource.map((r) => (
              <tr key={r.id}>
                <td className="py-1.5">{r.name}</td>
                <td className="py-1.5 text-ink-2">{r.dept?.name ?? "Shared"}</td>
                <td className="py-1.5 text-right font-mono">{Math.round(r.hours)}</td>
                <td className="py-1.5 text-right font-mono">{pct(r.utilisation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="border-t border-rule pt-4 text-xs text-subtle">
        Figures are computed from completed bookings only. Demonstration data is fictional. Prepared by {user.full_name}.
      </footer>
    </article>
  );
}
