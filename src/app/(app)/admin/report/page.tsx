import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { requirePageRole } from "@/lib/auth";
import { accreditationReport } from "@/lib/services/insights";
import { createAdminClient } from "@/lib/supabase/admin";
import { academicYear, formatCampus } from "@/lib/domain/time";
import { inr } from "@/lib/utils";
import { DownloadLink } from "@/components/ui";
import { PrintButton } from "@/app/(app)/owner/resources/[id]/qr/print-button";

export const metadata: Metadata = { title: "NAAC infrastructure report" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Print-ready evidence of how shared infrastructure is used, for one academic year, arranged the way
 * NAAC Criterion IV (Infrastructure and Learning Resources) asks for it. IQAC attaches the PDF and the CSV.
 */
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const user = await requirePageRole(["admin", "manager"]);
  const current = academicYear(new Date()).start;
  const years = [current, current - 1, current - 2];
  const asked = Number((await searchParams).ay);
  const start = years.includes(asked) ? asked : current;

  const [r, { data: org }] = await Promise.all([
    accreditationReport(user.org_id, start),
    createAdminClient().from("organizations").select("name, city, state").eq("id", user.org_id).single(),
  ]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const h = (v: number) => Math.round(v).toLocaleString("en-IN");
  const inProgress = r.ay.to.getTime() > Date.now();
  const peak = Math.max(1, ...r.months.map((m) => m.hours));

  return (
    <article className="mx-auto max-w-3xl space-y-8 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <nav aria-label="Academic year" className="flex flex-wrap gap-1.5">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/report?ay=${y}`}
              aria-current={y === start ? "page" : undefined}
              className="rounded-full border border-rule px-3.5 py-1.5 text-[15px] font-semibold aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper"
            >
              {`${y}–${String((y + 1) % 100).padStart(2, "0")}`}
            </Link>
          ))}
        </nav>
        <div className="flex gap-2">
          <DownloadLink href={`/admin/report/csv?ay=${start}`}>
            <Download className="size-4" aria-hidden /> CSV
          </DownloadLink>
          <div className="w-56">
            <PrintButton label="Print or save as PDF" />
          </div>
        </div>
      </div>

      <header className="border-b border-rule pb-5">
        <p className="text-subtle">NAAC Criterion IV · Infrastructure and Learning Resources · supporting evidence</p>
        <h1 className="font-display text-4xl">Shared Facilities Utilisation Report</h1>
        <p className="mt-1 text-subtle">
          {org?.name}
          {org?.city ? `, ${org.city}` : ""} · academic year {r.ay.label} (1 July {start} – 30 June {start + 1})
          {inProgress ? `, ${r.weeks} weeks so far` : ""} · generated {formatCampus(new Date(), { year: "numeric" })} from the Baanto audit chain
        </p>
      </header>

      <section aria-labelledby="summary">
        <h2 id="summary" className="mb-2 text-base font-bold">
          1. Summary
        </h2>
        <table className="w-full">
          <tbody className="divide-y divide-rule">
            {[
              ["Shared facilities listed (equipment and spaces)", String(r.perResource.length)],
              ["Completed bookings", h(r.totals.bookings)],
              ["Hours of facility use", h(r.totals.hours)],
              ["Distinct students and researchers served", `${r.totals.uniqueUsers} of ${r.totals.borrowers} registered`],
              ["Average utilisation (of 45 open hours a week)", pct(r.totals.avgUtilisation)],
              ["Market value of access provided", inr(r.totals.value)],
              ["Hours used by students of partner institutes", h(r.sharing.guestHours)],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="py-1.5 text-ink-2">{k}</td>
                <td className="tab py-1.5 text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="facilities">
        <h2 id="facilities" className="mb-1 text-base font-bold">
          2. Facilities available for teaching, learning and research
        </h2>
        <p className="mb-3 text-ink-2">Evidence for the adequacy of facilities (Criterion IV, 4.1): every listed facility and how much it was used.</p>
        <table className="w-full">
          <thead className="text-left text-xs text-subtle">
            <tr>
              <th className="py-1 font-normal">Facility</th>
              <th className="py-1 font-normal">Department</th>
              <th className="py-1 font-normal">Access</th>
              <th className="py-1 pl-3 text-right font-normal">Bookings</th>
              <th className="py-1 pl-3 text-right font-normal">Hours</th>
              <th className="py-1 pl-3 text-right font-normal">Use</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {r.perResource.map((f) => (
              <tr key={f.id}>
                <td className="py-1.5 pr-2">
                  {f.name}
                  <span className="block text-xs text-subtle">{f.category}</span>
                </td>
                <td className="py-1.5 pr-2 text-ink-2">{f.dept?.name ?? "Shared"}</td>
                <td className="py-1.5 pr-2 text-ink-2">{[f.badgeGated && "Trained only", f.requires_supervision && "Supervised"].filter(Boolean).join(", ") || "Open"}</td>
                <td className="tab py-1.5 pl-3 text-right">{f.bookings}</td>
                <td className="tab py-1.5 pl-3 text-right">{h(f.hours)}</td>
                <td className="tab py-1.5 pl-3 text-right">{pct(f.utilisation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="procedures">
        <h2 id="procedures" className="mb-1 text-base font-bold">
          3. Systems and procedures for maintaining and using facilities
        </h2>
        <p className="mb-3 text-ink-2">Evidence for Criterion IV, 4.4 (maintenance of campus infrastructure). Each line is counted from records, not self-declared.</p>
        <ul className="list-disc space-y-1.5 pl-5 text-ink-2">
          <li>
            <b className="text-ink">Booking with published rules.</b> Every request is checked against the same eligibility and fair-use rules, and every decision
            carries a written reason. High-demand clashes settled by a verifiable Fair Draw: {r.fairness.drawsRun}.
          </li>
          <li>
            <b className="text-ink">Training before use.</b> Facilities that need a verified skill badge: {r.procedures.badgeGated}. Badges verified by a named
            manager this year: {r.procedures.badgesVerified}. Facilities that need an attendant present: {r.procedures.supervised}.
          </li>
          <li>
            <b className="text-ink">Condition at every handover.</b> Check-in and return records with photos and a checklist: {r.procedures.handoverRecords}.
            Incidents reported: {r.safety.incidents} ({r.safety.per100.toFixed(1)} per 100 bookings), each decided by a person; strikes given: {r.safety.strikes}.
          </li>
          <li>
            <b className="text-ink">Planned downtime.</b> A facility under maintenance can’t be booked, and taking it out of service needs a recorded reason.
            Maintenance periods this year: {r.procedures.maintenanceEvents}.
          </li>
          <li>
            <b className="text-ink">Tamper-evident records.</b> Approvals, handovers and decisions sit in a SHA-256 hash-chained log that rejects edits and deletions.
          </li>
        </ul>
      </section>

      <section aria-labelledby="months">
        <h2 id="months" className="mb-3 text-base font-bold">
          4. Use through the year
        </h2>
        <table className="w-full">
          <thead className="text-left text-xs text-subtle">
            <tr>
              <th className="py-1 font-normal">Month</th>
              <th className="py-1 text-right font-normal">Bookings</th>
              <th className="py-1 text-right font-normal">Hours</th>
              <th className="w-1/2 py-1 font-normal">
                <span className="sr-only">Hours as a bar</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {r.months.map((m) => (
              <tr key={`${m.year}-${m.month}`}>
                <td className="py-1.5">
                  {MONTHS[m.month]} {m.year}
                </td>
                <td className="tab py-1.5 text-right">{m.bookings}</td>
                <td className="tab py-1.5 text-right">{h(m.hours)}</td>
                <td className="py-1.5 pl-4">
                  <span aria-hidden className="block h-2 rounded-full bg-ink/70" style={{ width: `${(m.hours / peak) * 100}%` }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="access">
        <h2 id="access" className="mb-1 text-base font-bold">
          5. Equitable access
        </h2>
        <p className="mb-3 text-ink-2">
          Usage concentration (Gini) is {r.fairness.gini.toFixed(2)}; the most active 20% of users accounted for {pct(r.fairness.top20Share)} of hours.{" "}
          Waitlisted bookings moved in automatically when a slot freed up: {r.fairness.promoted}. Requests from people using a facility for the first time:{" "}
          {pct(r.fairness.firstTimeShare)}.
        </p>
        {r.departments.length > 0 && (
          <table className="w-full">
            <thead className="text-left text-xs text-subtle">
              <tr>
                <th className="py-1 font-normal">Users’ department</th>
                <th className="py-1 text-right font-normal">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {r.departments.map((d) => (
                <tr key={d.name}>
                  <td className="py-1.5">{d.name}</td>
                  <td className="tab py-1.5 text-right">{h(d.hours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="sharing">
        <h2 id="sharing" className="mb-1 text-base font-bold">
          6. Sharing with other institutes
        </h2>
        <p className="mb-3 text-ink-2">Students from another institute can book here only with their own institute’s endorsement.</p>
        <table className="w-full">
          <tbody className="divide-y divide-rule">
            {[
              ["Students and researchers from partner institutes who used these facilities", String(r.sharing.guestUsers)],
              ["Hours they used", h(r.sharing.guestHours)],
              ["Endorsements this institute gave its own students for other campuses", String(r.sharing.endorsementsGiven)],
              ["Partner campuses those endorsements cover", String(r.sharing.partnerCampuses)],
            ].map(([k, v]) => (
              <tr key={k}>
                <td className="py-1.5 text-ink-2">{k}</td>
                <td className="tab py-1.5 text-right font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="space-y-1 border-t border-rule pt-4 text-xs text-subtle">
        <p>
          Figures count completed bookings only. Criterion and metric numbers follow NAAC’s Revised Accreditation Framework; check them against the manual for
          your cycle before submission. Demonstration data is fictional.
        </p>
        <p>Prepared by {user.full_name}.</p>
      </footer>
    </article>
  );
}
