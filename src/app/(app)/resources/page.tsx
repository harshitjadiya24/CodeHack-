import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, ShieldCheck, Users } from "lucide-react";
import { Button, Card, EmptyState, PageHeader, Pill, inputClass } from "@/components/ui";
import { ResourceIcon } from "@/components/resource-icon";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sparkles } from "lucide-react";
import { matchResources } from "@/lib/ai";
import { CopilotResults } from "@/components/copilot-results";
import { NearbyMap, type NearbyPlace } from "@/components/nearby-map";
import { nextOpenSlot, slotLabel } from "@/lib/domain/nearby";

export const metadata: Metadata = { title: "Discover" };

type Search = { q?: string; category?: string; eligible?: string; ask?: string; where?: string };

// How far to look. Other institutes appear only once they are verified; a pending one stays on its own campus.
const SCOPES = [
  { key: "campus", label: "My campus" },
  { key: "city", label: "My city" },
  { key: "state", label: "My state" },
] as const;

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const user = await requireUser();
  const { q = "", category = "", eligible = "", ask = "", where = "campus" } = await searchParams;
  const scope = SCOPES.some((s) => s.key === where) ? where : "campus";
  const supabase = await createClient();

  const { data: home } = await supabase.from("organizations").select("name, city, state, lat, lng").eq("id", user.org_id).single();
  let orgIds = [user.org_id];
  if (scope !== "campus" && home) {
    const { data: nearby } = await createAdminClient()
      .from("organizations")
      .select("id")
      .in("status", ["active", "domain_verified"])
      .eq(scope === "city" ? "city" : "state", (scope === "city" ? home.city : home.state) ?? "");
    orgIds = [...new Set([user.org_id, ...(nearby ?? []).map((o) => o.id)])];
  }

  const [{ data: resources }, { data: myBadges }] = await Promise.all([
    supabase
      .from("resources")
      .select("*, requirements:resource_requirements(badge:skill_badges(id, name)), org:organizations(name, lat, lng), windows:availability_windows(weekday, start_time, end_time)")
      .eq("status", "active")
      .in("org_id", orgIds)
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
  const { data: ahead } = await createAdminClient()
    .from("bookings")
    .select("resource_id, starts_at, ends_at")
    .in("resource_id", (resources ?? []).map((r) => r.id))
    .in("status", ["approved", "checked_in", "overdue"])
    .gt("ends_at", now.toISOString())
    .lt("starts_at", new Date(now.getTime() + 9 * 24 * 3_600_000).toISOString());
  const held = new Set(
    (myBadges ?? []).filter((b) => b.status === "verified" && (!b.expires_at || new Date(b.expires_at) > now)).map((b) => b.badge_id),
  );

  const all = (resources ?? []).map((r) => {
    const required = r.requirements.flatMap((x) => (x.badge ? [x.badge] : []));
    const missing = required.filter((b) => !held.has(b.id));
    const sameOrg = r.org_id === user.org_id;
    const open = nextOpenSlot(
      r.windows.map((w) => ({ weekday: w.weekday, startTime: w.start_time, endTime: w.end_time })),
      (ahead ?? []).filter((b) => b.resource_id === r.id).map((b) => ({ startsAt: b.starts_at, endsAt: b.ends_at })),
      now,
    );
    return { ...r, required, missing, canUse: sameOrg && missing.length === 0, hours: hoursByResource.get(r.id) ?? 0, open };
  });

  const copilot = ask.trim() ? await matchResources(ask.trim(), all) : null;
  const info = new Map(all.map((r) => [r.id, { id: r.id, name: r.name, canUse: r.canUse, missing: r.missing, partner: r.org_id !== user.org_id }]));

  const categories = [...new Set(all.map((r) => r.category))].sort();
  const needle = q.trim().toLowerCase();
  const shown = all.filter(
    (r) =>
      (!needle || `${r.name} ${r.description} ${r.category} ${r.location}`.toLowerCase().includes(needle)) &&
      (!category || r.category === category) &&
      (!eligible || r.canUse),
  );

  // One pin per building (or per institute when it has no building points), for what the filters show.
  const places = new Map<string, NearbyPlace>();
  for (const r of shown) {
    const lat = r.lat ?? r.org?.lat;
    const lng = r.lng ?? r.org?.lng;
    if (lat == null || lng == null) continue;
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const org = r.org?.name ?? "Another institute";
    const place = places.get(key) ?? { id: key, lat, lng, title: r.lat != null ? r.location.split(",")[0] : org, org, items: [] };
    place.items.push({
      id: r.id,
      name: r.name,
      canUse: r.canUse,
      note: r.canUse ? "You can book this" : r.org_id !== user.org_id ? "Needs your institute’s endorsement" : `Needs: ${r.missing.map((m) => m.name).join(", ")}`,
      opensAt: r.open?.startsAt.toISOString() ?? null,
      opensLabel: r.open ? slotLabel(r.open, now) : null,
    });
    places.set(key, place);
  }

  // ~45 open hours a week → ~190 a month. Good enough for a demand signal, not billing.
  const demandLabel = (hours: number) => (hours > 60 ? "High demand" : hours > 15 ? "Moderate" : "Mostly idle");

  return (
    <>
      <PageHeader eyebrow={`${all.length} resources · ${new Set(all.map((r) => r.location.split(",")[0])).size} buildings`} title="Discover what your campus can lend" />

      <form className="mb-4 flex gap-2" aria-label="Ask Saajha Copilot">
        <label className="sr-only" htmlFor="ask">Describe what you need</label>
        <div className="relative flex-1">
          <Sparkles className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            id="ask"
            name="ask"
            defaultValue={ask}
            className={`${inputClass} pl-9`}
            placeholder="Describe your task: “I need to test a 12V motor driver circuit next week”"
          />
        </div>
        <Button>Ask Copilot</Button>
      </form>

      {copilot && <CopilotResults ask={ask} result={copilot} info={info} />}

      <nav aria-label="How far to look" className="mb-4 flex flex-wrap items-center gap-2">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={{ pathname: "/resources", query: { ...(q && { q }), ...(category && { category }), ...(eligible && { eligible }), where: s.key } }}
            aria-current={scope === s.key ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-[15px] transition-colors ${scope === s.key ? "border-ink bg-accent font-semibold text-accent-ink" : "border-rule bg-card hover:border-subtle"}`}
          >
            {s.label}
          </Link>
        ))}
        {scope !== "campus" && home && (
          <span className="text-[15px] text-subtle">
            Verified institutes in {scope === "city" ? home.city : home.state}. Using another campus’s equipment needs your institute’s endorsement.
          </span>
        )}
      </nav>

      <form className="mb-8 grid gap-3 md:grid-cols-[1fr_220px_auto_auto]" role="search">
        <input type="hidden" name="where" value={scope} />
        <label className="sr-only" htmlFor="q">Search</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search oscilloscope, camera, 3D printer…" className={inputClass} />
        <label className="sr-only" htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={category} className={inputClass}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-rule bg-card px-3 text-[15px]">
          <input type="checkbox" name="eligible" value="1" defaultChecked={!!eligible} className="size-4 accent-[var(--ink)]" />
          Only what I can use
        </label>
        <Button variant="secondary">Apply</Button>
      </form>

      {home?.lat != null && home.lng != null && places.size > 0 && (
        <NearbyMap home={{ lat: home.lat, lng: home.lng }} homeLabel={home.name} places={[...places.values()]} />
      )}

      {shown.length === 0 ? (
        <EmptyState title="Nothing matches those filters">Try clearing the search or the eligibility toggle.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={`/resources/${r.id}`} className="group block h-full">
                <Card className="flex h-full gap-4 p-5 transition-colors duration-150 group-hover:border-subtle">
                  <ResourceIcon category={r.category} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-bold text-ink">{r.name}</h2>
                      {r.demand === "high" && <Pill tone="saffron">High demand · Fair Draw</Pill>}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-subtle">
                      <MapPin className="size-3.5" aria-hidden /> {r.location}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-ink-2">{r.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.canUse ? (
                        <Pill tone="ok">
                          <ShieldCheck className="size-3" aria-hidden /> You can book this
                        </Pill>
                      ) : r.org_id !== user.org_id ? (
                        <Pill tone="info">{r.org?.name ?? "Another institute"}: endorsement needed</Pill>
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
