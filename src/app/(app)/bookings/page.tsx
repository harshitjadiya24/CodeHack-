import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, EmptyState, PageHeader, Pill } from "@/components/ui";
import { ResourceIcon } from "@/components/resource-icon";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_STATUS } from "@/lib/status";
import { formatCampus } from "@/lib/domain/time";

export const metadata: Metadata = { title: "My bookings" };

const LIVE = ["requested", "in_draw", "waitlisted", "approved", "checked_in", "overdue", "returned"];

export default async function BookingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, purpose, credits, resource:resources(name, category, location)")
    .eq("user_id", user.id)
    .order("starts_at", { ascending: false })
    .limit(60);

  const live = (bookings ?? []).filter((b) => LIVE.includes(b.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = (bookings ?? []).filter((b) => !LIVE.includes(b.status));

  const Row = ({ b }: { b: NonNullable<typeof bookings>[number] }) => (
    <li>
      <Link href={`/bookings/${b.id}`} className="group block">
        <Card className="flex items-center gap-4 p-4 transition group-hover:border-accent">
          <ResourceIcon category={b.resource?.category ?? ""} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{b.resource?.name}</p>
            <p className="text-sm text-muted">
              {formatCampus(b.starts_at, { weekday: "short" })} – {formatCampus(b.ends_at, { day: undefined, month: undefined })} · {b.credits} credits
            </p>
          </div>
          <Pill tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Pill>
        </Card>
      </Link>
    </li>
  );

  return (
    <>
      <PageHeader eyebrow="Your activity" title="My bookings">
        <ButtonLink href="/resources">Find a resource</ButtonLink>
      </PageHeader>

      <section aria-labelledby="live" className="mb-10">
        <h2 id="live" className="mb-3 text-base font-semibold text-ink">
          Active and upcoming
        </h2>
        {live.length ? <ul className="space-y-2">{live.map((b) => <Row key={b.id} b={b} />)}</ul> : <EmptyState title="Nothing upcoming">Browse the catalogue to request something.</EmptyState>}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past">
          <h2 id="past" className="mb-3 text-base font-semibold text-ink">
            History
          </h2>
          <ul className="space-y-2">{past.map((b) => <Row key={b.id} b={b} />)}</ul>
        </section>
      )}
    </>
  );
}
