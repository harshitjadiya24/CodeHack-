import type { Metadata } from "next";
import { ButtonLink, Card, PageHeader, Pill } from "@/components/ui";
import { Heatmap, Stat, UtilisationBar } from "@/components/insight-views";
import { requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { campusInsights } from "@/lib/services/insights";
import { inr } from "@/lib/utils";
import { FairnessForm } from "./fairness-form";

export const metadata: Metadata = { title: "Insights" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requirePageRole(["admin"]);
  const { welcome } = await searchParams;
  const [ins, { data: config }, { data: org }] = await Promise.all([
    campusInsights(user.org_id),
    createAdminClient().from("fairness_config").select("*").eq("org_id", user.org_id).single(),
    createAdminClient().from("organizations").select("name, status, city, state").eq("id", user.org_id).single(),
  ]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const giniTone = ins.fairness.gini < 0.35 ? "ok" : ins.fairness.gini < 0.55 ? "warn" : "danger";

  return (
    <>
      <PageHeader eyebrow={`Last ${ins.weeks} weeks · ${org?.name ?? "Your institute"}`} title="Campus insights">
        <ButtonLink href="/admin/report" variant="secondary">
          NAAC report
        </ButtonLink>
      </PageHeader>

      {org?.status === "pending" && (
        <p role="status" className="mb-6 rounded-[22px] border border-rule bg-warn-soft px-5 py-3 text-[15px] text-warn">
          <b>Pending review.</b> Your institute works for your own campus now. Other campuses will see it once the Saajha team has checked it is real.
        </p>
      )}
      {welcome && (
        <section aria-labelledby="setup-title" className="mb-10 rounded-[22px] border border-rule bg-card">
          <h2 id="setup-title" className="chart-code bg-board px-5 py-3 text-[15px] text-board-ink">
            {org?.name} is on Saajha. Four things to do next
          </h2>
          <ol className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Share the sign-up link", "Students and lab in-charges join at /signup and pick your institute."],
              ["Verify people", "Check roll numbers on the People page. Unverified accounts can browse but not book."],
              ["Make lab in-charges owners", "On the People page, change their role to owner with a short reason."],
              ["Owners list equipment", "Each listing sets its training, deposit and hours. Students see only what they’re cleared for."],
            ].map(([t, d], i) => (
              <li key={t} className="bg-card p-5">
                <span className="readout text-3xl">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 font-bold">{t}</h3>
                <p className="mt-1 text-[15px] text-subtle">{d}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Value unlocked" value={inr(ins.totals.value)} note="Market rent of hours actually used" />
        <Stat label="Hours shared" value={String(Math.round(ins.totals.hours))} note={`${ins.totals.bookings} completed bookings`} />
        <Stat label="People served" value={`${ins.totals.uniqueUsers}/${ins.totals.borrowers}`} note="Borrowers with at least one session" />
        <Stat label="Mostly idle resources" value={String(ins.totals.idleResources)} note="Under 10% utilisation" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-5">
          <h2 className="font-bold">When is equipment actually used?</h2>
          <p className="mb-4 text-sm text-subtle">Booked hours by weekday and hour, campus time. Pale cells are idle capacity you could lend.</p>
          <Heatmap heat={ins.heat} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">Is access fair?</h2>
          <dl className="space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt>
                Usage concentration (Gini)
                <span className="block text-xs text-subtle">0 = everyone gets equal time, 1 = one person takes all</span>
              </dt>
              <dd>
                <Pill tone={giniTone} className="font-mono text-sm">
                  {ins.fairness.gini.toFixed(2)}
                </Pill>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt>
                Share used by heaviest 20%
                <span className="block text-xs text-subtle">Watch for monopolisation</span>
              </dt>
              <dd className="font-mono">{pct(ins.fairness.top20Share)}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt>
                Requests from first-time users
                <span className="block text-xs text-subtle">New people getting a turn</span>
              </dt>
              <dd className="font-mono">{pct(ins.fairness.firstTimeShare)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Fair Draws run · waitlist promotions</dt>
              <dd className="font-mono">
                {ins.fairness.drawsRun} · {ins.fairness.promoted}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Incidents per 100 bookings · strikes</dt>
              <dd className="font-mono">
                {ins.safety.per100.toFixed(1)} · {ins.safety.strikes}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="px-5 pt-5 text-left font-medium">Utilisation by resource</caption>
          <thead className="text-left text-xs text-subtle">
            <tr>
              <th className="px-5 py-2 font-normal">Resource</th>
              <th className="px-5 py-2 font-normal">Department</th>
              <th className="px-5 py-2 font-normal">Hours</th>
              <th className="px-5 py-2 font-normal">Utilisation</th>
              <th className="px-5 py-2 text-right font-normal">Value unlocked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {ins.perResource.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-2">
                  {r.name} {r.demand === "high" && <Pill tone="saffron">High demand</Pill>}
                </td>
                <td className="px-5 py-2 text-ink-2">{r.dept?.name ?? "Shared"}</td>
                <td className="px-5 py-2 font-mono">{Math.round(r.hours)}</td>
                <td className="px-5 py-2">
                  <UtilisationBar value={r.utilisation} />
                </td>
                <td className="px-5 py-2 text-right font-mono">{inr(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {config && (
        <Card className="p-5">
          <h2 className="font-bold">Fairness policy</h2>
          <p className="mb-4 text-sm text-subtle">These published rules drive every decision receipt. Changes are versioned in the audit log.</p>
          <FairnessForm config={config} />
        </Card>
      )}
    </>
  );
}
