import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, PageHeader, Pill } from "@/components/ui";
import { ResourceIcon } from "@/components/resource-icon";
import { OWNER_ROLES, STAFF_ROLES, requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { inr } from "@/lib/utils";

export const metadata: Metadata = { title: "My resources" };

const OPEN_HOURS_30D = 45 * 30 / 7;

export default async function OwnerResourcesPage() {
  const user = await requirePageRole(OWNER_ROLES);
  const db = createAdminClient();
  let q = db.from("resources").select("*").eq("org_id", user.org_id).order("name");
  if (!STAFF_ROLES.includes(user.role)) q = q.eq("owner_id", user.id);
  const { data: resources } = await q;

  const since = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
  const { data: used } = await db
    .from("bookings")
    .select("resource_id, starts_at, ends_at")
    .in("resource_id", (resources ?? []).map((r) => r.id))
    .in("status", ["checked_in", "returned", "closed", "overdue"])
    .gte("starts_at", since);
  const hours = new Map<string, number>();
  for (const b of used ?? []) hours.set(b.resource_id, (hours.get(b.resource_id) ?? 0) + (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 3_600_000);

  return (
    <>
      <PageHeader eyebrow="Last 30 days" title="My resources">
        <ButtonLink href="/owner/resources/new">List a resource</ButtonLink>
      </PageHeader>
      <Card className="divide-y divide-rule">
        {(resources ?? []).map((r) => {
          const h = hours.get(r.id) ?? 0;
          const util = Math.min(100, Math.round((h / OPEN_HOURS_30D) * 100));
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <ResourceIcon category={r.category} className="size-10" />
              <div className="min-w-48 flex-1">
                <Link href={`/resources/${r.id}`} className="font-medium hover:underline">
                  {r.name}
                </Link>
                <p className="text-xs text-muted">{r.location}</p>
              </div>
              <div className="w-48">
                <div className="flex justify-between text-xs text-muted">
                  <span>{Math.round(h)} h used</span>
                  <span>{util}% utilised</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-paper-2" aria-hidden>
                  <div className={`h-full ${util < 10 ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.max(util, 2)}%` }} />
                </div>
              </div>
              <span className="w-28 text-right text-sm">
                {inr(h * r.rental_value_inr_per_hour)}
                <span className="block text-xs text-muted">value unlocked</span>
              </span>
              {util < 10 && <Pill tone="warn">Mostly idle</Pill>}
              <ButtonLink href={`/owner/resources/${r.id}/edit`} variant="ghost" className="px-3 py-1.5">
                Edit
              </ButtonLink>
              <ButtonLink href={`/owner/resources/${r.id}/qr`} variant="secondary" className="px-3 py-1.5">
                QR tag
              </ButtonLink>
            </div>
          );
        })}
      </Card>
    </>
  );
}
