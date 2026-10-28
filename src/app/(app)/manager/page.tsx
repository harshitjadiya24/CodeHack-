import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui";
import { BadgeDecisionForm, IncidentDecisionForm } from "@/components/governance-forms";
import { STAFF_ROLES, requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampus } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Review desk" };

export default async function ManagerPage() {
  const user = await requirePageRole(STAFF_ROLES);
  const db = createAdminClient();

  const [{ data: badges }, { data: incidents }, { data: recent }] = await Promise.all([
    db
      .from("user_badges")
      .select("id, note, evidence_path, created_at, user:profiles!user_badges_user_id_fkey(full_name, roll_no, org_id), badge:skill_badges(name, validity_days)")
      .eq("status", "pending")
      .order("created_at"),
    db
      .from("incidents")
      .select("*, resource:resources(name, org_id), booking:bookings(id, user:profiles!bookings_user_id_fkey(full_name, strikes)), reporter:profiles!incidents_reported_by_fkey(full_name)")
      .neq("status", "resolved")
      .order("created_at"),
    db
      .from("incidents")
      .select("id, type, decision, strike_applied, decided_at, resource:resources(name, org_id), decider:profiles!incidents_decided_by_fkey(full_name)")
      .eq("status", "resolved")
      .order("decided_at", { ascending: false })
      .limit(5),
  ]);

  const myBadges = (badges ?? []).filter((b) => b.user?.org_id === user.org_id);
  const myIncidents = (incidents ?? []).filter((i) => i.resource?.org_id === user.org_id);
  const evidenceUrls = new Map<string, string>();
  for (const b of myBadges) {
    if (!b.evidence_path) continue;
    const { data } = await db.storage.from("evidence").createSignedUrl(b.evidence_path, 600);
    if (data) evidenceUrls.set(b.id, data.signedUrl);
  }

  return (
    <>
      <PageHeader eyebrow="Human oversight" title="Review desk" />
      <p className="-mt-4 mb-8 max-w-2xl text-ink-2">
        Saajha never issues a badge or applies a penalty on its own. Everything that affects someone’s access lands here for a person to decide, and every decision is recorded with its reason.
      </p>

      <section aria-labelledby="badges" className="mb-10">
        <h2 id="badges" className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Trust Passport requests ({myBadges.length})
        </h2>
        {myBadges.length === 0 ? (
          <EmptyState title="No badges waiting">Students’ certificate uploads appear here.</EmptyState>
        ) : (
          <div className="space-y-3">
            {myBadges.map((b) => (
              <Card key={b.id} className="space-y-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <span className="font-medium">{b.user?.full_name}</span> <span className="text-sm text-muted">{b.user?.roll_no}</span>
                  </p>
                  <Pill tone="accent">{b.badge?.name}</Pill>
                </div>
                {b.note && <p className="text-sm text-ink-2">“{b.note}”</p>}
                <p className="text-sm">
                  {evidenceUrls.get(b.id) ? (
                    <a href={evidenceUrls.get(b.id)} target="_blank" rel="noreferrer" className="text-accent underline">
                      Open evidence (private link, expires in 10 min)
                    </a>
                  ) : (
                    "No evidence attached"
                  )}
                  <span className="text-muted"> · valid {b.badge?.validity_days} days once issued · submitted {formatCampus(b.created_at)}</span>
                </p>
                <BadgeDecisionForm userBadgeId={b.id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="incidents" className="mb-10">
        <h2 id="incidents" className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Incidents awaiting a decision ({myIncidents.length})
        </h2>
        {myIncidents.length === 0 ? (
          <EmptyState title="No open incidents" />
        ) : (
          <div className="space-y-3">
            {myIncidents.map((i) => (
              <Card key={i.id} className="grid gap-4 p-5 md:grid-cols-[1fr_340px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="danger">{i.type}</Pill>
                    <Pill tone={i.severity === "high" ? "danger" : i.severity === "medium" ? "warn" : "neutral"}>{i.severity}</Pill>
                    <span className="font-medium">{i.resource?.name}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink-2">{i.description}</p>
                  <p className="mt-2 text-xs text-muted">
                    Reported by {i.reporter?.full_name ?? "Saajha (automatic rule)"} · {formatCampus(i.created_at)}
                    {i.booking?.user && ` · Borrower: ${i.booking.user.full_name} (${i.booking.user.strikes} strike${i.booking.user.strikes === 1 ? "" : "s"})`}
                  </p>
                  {i.ai_summary && <p className="mt-2 rounded bg-accent-soft p-2 text-sm text-accent">AI summary (advisory): {i.ai_summary}</p>}
                  {i.proposed_action && <p className="mt-2 text-sm text-info">Suggested by rules (advisory): {i.proposed_action}</p>}
                  {i.booking && (
                    <Link href={`/bookings/${i.booking.id}`} className="mt-2 inline-block text-sm text-accent underline">
                      Open booking with before/after photos
                    </Link>
                  )}
                </div>
                <IncidentDecisionForm incidentId={i.id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {!!recent?.length && (
        <section aria-labelledby="recent">
          <h2 id="recent" className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
            Recent decisions
          </h2>
          <Card className="divide-y divide-rule">
            {recent
              .filter((r) => r.resource?.org_id === user.org_id)
              .map((r) => (
                <div key={r.id} className="px-5 py-3 text-sm">
                  <span className="font-medium">{r.resource?.name}</span> · {r.type} · {r.decision}
                  {r.strike_applied && <Pill tone="danger" className="ml-2">Strike</Pill>}
                  <span className="block text-xs text-muted">
                    {r.decider?.full_name} · {r.decided_at && formatCampus(r.decided_at)}
                  </span>
                </div>
              ))}
          </Card>
        </section>
      )}
    </>
  );
}
