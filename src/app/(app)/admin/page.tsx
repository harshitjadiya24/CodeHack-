import type { Metadata } from "next";
import { ButtonLink, Card, PageHeader, Pill } from "@/components/ui";
import { Heatmap, Stat, UtilisationBar } from "@/components/insight-views";
import { requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { campusInsights } from "@/lib/services/insights";
import { operationsInsights } from "@/lib/services/operations";
import { NudgeButton } from "@/components/operations/nudge-button";
import { inr } from "@/lib/utils";
import { FairnessForm } from "./fairness-form";

export const metadata: Metadata = { title: "Insights" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requirePageRole(["admin"]);
  const { welcome } = await searchParams;
  const [ins, ops, { data: config }, { data: org }] = await Promise.all([
    campusInsights(user.org_id),
    operationsInsights(user.org_id),
    createAdminClient().from("fairness_config").select("*").eq("org_id", user.org_id).single(),
    createAdminClient().from("organizations").select("name, status, city, state").eq("id", user.org_id).single(),
  ]);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const giniTone = ins.fairness.gini < 0.35 ? "ok" : ins.fairness.gini < 0.55 ? "warn" : "danger";

  return (
    <>
      <PageHeader eyebrow={`Last ${ins.weeks} weeks · ${org?.name ?? "Your institute"}`} title="Campus insights">
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/import" variant="secondary">
            Import from spreadsheets
          </ButtonLink>
          <ButtonLink href="/admin/report" variant="secondary">
            NAAC report
          </ButtonLink>
        </div>
      </PageHeader>

      {org?.status === "pending" && (
        <p role="status" className="mb-6 rounded-[22px] border border-rule bg-warn-soft px-5 py-3 text-[15px] text-warn">
          <b>Pending review.</b> Your institute works for your own campus now. Other campuses will see it once the Baanto team has checked it is real.
        </p>
      )}
      {welcome && (
        <section aria-labelledby="setup-title" className="mb-10 rounded-[22px] border border-rule bg-card">
          <h2 id="setup-title" className="chart-code bg-board px-5 py-3 text-[15px] text-board-ink">
            {org?.name} is on Baanto. Four things to do next
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
        <Card id="idle" className="scroll-mt-24 p-5">
          <h2 className="font-bold">Mostly idle this month</h2>
          <p className="mb-4 text-sm text-subtle">Used for under 10% of open hours in the last four weeks. Each change below is the one most likely to help, and the owner is told.</p>
          {ops.idle.length ? (
            <ul className="divide-y divide-rule">
              {ops.idle.slice(0, 4).map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <a href={`/resources/${r.id}`} className="font-semibold hover:underline">
                      {r.name}
                    </a>
                    <span className="tab text-sm text-subtle">
                      {r.hours} h of 180 · {Math.round(r.utilisation * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.actions.length ? (
                      r.actions.map((a) => <NudgeButton key={a} resourceId={r.id} action={a} />)
                    ) : (
                      <span className="text-sm text-subtle">Already as open as it can be. Tell students it exists: print its QR tag for the lab door.</span>
                    )}
                  </div>
                </li>
              ))}
              {ops.idle.length > 4 && <li className="pt-3 text-sm text-subtle">{ops.idle.length - 4} more, all in the table below.</li>}
            </ul>
          ) : (
            <p className="text-sm text-ok">Nothing idle. Every resource was used for at least a tenth of its open hours.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-bold">Next week</h2>
            <p className="mb-4 text-sm text-subtle">What is already booked, or recent weeks’ trend if that is higher. Full for weeks running is the case for buying a second one.</p>
            {ops.forecast.length ? (
              <ul className="space-y-3">
                {ops.forecast.slice(0, 6).map((f) => (
                  <li key={f.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold">{f.name}</span>
                      <Pill tone={f.level === "full" ? "danger" : "warn"}>{f.level === "full" ? "Likely full" : "Busy"}</Pill>
                    </div>
                    <UtilisationBar value={f.utilisation} />
                    <p className="text-xs text-subtle">
                      ~{f.hours} h of 45 · {f.booked ? `${Math.round(f.booked)} h already booked` : "from recent weeks"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-subtle">Nothing looks busy next week.</p>
            )}
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
      </div>

      <Card className="mb-8 p-5">
        <h2 className="font-bold">When is equipment actually used?</h2>
        <p className="mb-4 text-sm text-subtle">Booked hours by weekday and hour, campus time. Pale cells are idle capacity you could lend.</p>
        <Heatmap heat={ins.heat} />
      </Card>

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
