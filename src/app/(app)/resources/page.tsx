import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ShieldCheck, Users } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, inputClass } from "@/components/ui";
import { ResourceIcon } from "@/components/resource-icon";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Discover" };

type Search = { q?: string; category?: string; eligible?: string };

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const { q = "", category = "", eligible = "" } = await searchParams;
  const supabase = await createClient();

  const [{ data: resources }, { data: myBadges }] = await Promise.all([
    supabase
      .from("resources")
      .select("*, requirements:resource_requirements(badge:skill_badges(id, name)), org:organizations(name)")
      .eq("status", "active")
      .order("demand", { ascending: false })
      .order("name"),
    supabase.from("user_badges").select("badge_id, status, expires_at").eq("user_id", user.id),
  ]);

  // Booking rows are private, so usage is aggregated with the server client: counts only, no names.
  const since = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
  const { data: recent } = await createAdminClient()
    .from("bookings")
    .select("resource_id, starts_at, ends_at")
    .in("status", ["approved", "checked_in", "returned", "closed", "overdue"])
    .gte("starts_at", since);
  const hoursByResource = new Map<string, number>();
  for (const b of recent ?? []) {
    const h = (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 3_600_000;
    hoursByResource.set(b.resource_id, (hoursByResource.get(b.resource_id) ?? 0) + h);
  }

  const now = new Date();
  const held = new Set(
    (myBadges ?? []).filter((b) => b.status === "verified" && (!b.expires_at || new Date(b.expires_at) > now)).map((b) => b.badge_id),
  );

  const all = (resources ?? []).map((r) => {
    const required = r.requirements.flatMap((x) => (x.badge ? [x.badge] : []));
    const missing = required.filter((b) => !held.has(b.id));
    const sameOrg = r.org_id === user.org_id;
    return { ...r, required, missing, canUse: sameOrg && missing.length === 0, hours: hoursByResource.get(r.id) ?? 0 };
  });

  const categories = [...new Set(all.map((r) => r.category))].sort();
  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (r) =>
      (!needle || `${r.name} ${r.description} ${r.category} ${r.location}`.toLowerCase().includes(needle)) &&
      (!category || r.category === category) &&
      (!eligible || r.canUse),
  );

  // ~45 open hours a week → ~190 a month. Good enough for a demand signal, not billing.
  const demandLabel = (hours: number) => (hours > 60 ? "High demand" : hours > 15 ? "Moderate" : "Mostly idle");

  return (
    <>
      <PageHeader eyebrow={`${all.length} resources · ${new Set(all.map((r) => r.location.split(",")[0])).size} buildings`} title="Discover what your campus can lend" />

      <form className="mb-8 grid gap-3 md:grid-cols-[1fr_220px_auto_auto]" role="search">
        <label className="sr-only" htmlFor="q">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search oscilloscope, camera, 3D printer…" className={inputClass} />
        <label className="sr-only" htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={category} className={inputClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-md border border-rule bg-card px-3 py-2 text-sm">
          <input type="checkbox" name="eligible" value="1" defaultChecked={!!eligible} className="accent-[var(--accent)]" />
          Only what I can use
        </label>
        <button className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">Apply</button>
      </form>

      {shown.length === 0 ? (
        <EmptyState title="Nothing matches those filters">Try clearing the search or the eligibility toggle.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={`/resources/${r.id}`} className="group block h-full">
                <Card className="flex h-full gap-4 p-5 transition group-hover:border-accent">
                  <ResourceIcon category={r.category} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-medium text-ink">{r.name}</h2>
                      {r.demand === "high" && <Pill tone="saffron">High demand · Fair Draw</Pill>}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <MapPin className="size-3.5" aria-hidden /> {r.location}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-2">{r.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.canUse ? (
                        <Pill tone="ok">
                          <ShieldCheck className="size-3" aria-hidden /> You can book this
                        </Pill>
                      ) : r.org_id !== user.org_id ? (
                        <Pill tone="info">Partner campus · endorsement needed</Pill>
                      ) : (
                        <Pill tone="warn">Needs: {r.missing.map((m) => m.name).join(", ")}</Pill>
                      )}
                      {r.requires_supervision && (
                        <Pill>
                          <Users className="size-3" aria-hidden /> Supervised
                        </Pill>
                      )}
                      {r.auto_approve && !r.requires_supervision && <Pill tone="accent">Instant approval</Pill>}
                      <Pill>{demandLabel(r.hours)}</Pill>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
