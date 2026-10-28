import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui";
import { ConfirmCheckInForm } from "@/components/handover-forms";
import { STAFF_ROLES, requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampus } from "@/lib/domain/time";
import { BOOKING_STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "Handovers" };

export default async function AttendantPage() {
  const user = await requirePageRole(["attendant", ...STAFF_ROLES]);
  const db = createAdminClient();
  const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { data: rows } = await db
    .from("bookings")
    .select("id, status, starts_at, ends_at, resource:resources(name, location, org_id, requires_supervision), user:profiles!bookings_user_id_fkey(full_name, roll_no), handovers(phase, attendant_confirmed_at)")
    .in("status", ["approved", "checked_in", "overdue"])
    .gte("ends_at", dayAgo)
    .order("starts_at")
    .limit(100);
  const mine = (rows ?? []).filter((b) => b.resource?.org_id === user.org_id);
  const waiting = mine.filter(
    (b) => b.status === "approved" && b.resource?.requires_supervision && b.handovers.some((h) => h.phase === "check_in" && !h.attendant_confirmed_at),
  );
  const live = mine.filter((b) => b.status !== "approved");

  return (
    <>
      <PageHeader eyebrow="Lab floor" title="Handovers" />

      <section aria-labelledby="waiting" className="mb-10">
        <h2 id="waiting" className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Supervised check-ins waiting for you ({waiting.length})
        </h2>
        {waiting.length === 0 ? (
          <EmptyState title="Nobody waiting">When a borrower records a supervised check-in, it appears here for you to confirm in person.</EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {waiting.map((b) => (
              <Card key={b.id} className="space-y-3 p-5">
                <div>
                  <p className="font-medium">{b.resource?.name}</p>
                  <p className="text-sm text-muted">
                    {b.user?.full_name} ({b.user?.roll_no}) · {formatCampus(b.starts_at)}
                  </p>
                  <Link href={`/bookings/${b.id}`} className="text-sm text-accent underline">
                    See the condition photos first
                  </Link>
                </div>
                <ConfirmCheckInForm bookingId={b.id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="live">
        <h2 id="live" className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          In use right now
        </h2>
        {live.length === 0 ? (
          <EmptyState title="Nothing checked out" />
        ) : (
          <Card className="divide-y divide-rule">
            {live.map((b) => (
              <Link key={b.id} href={`/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-paper-2">
                <span>
                  <span className="font-medium">{b.resource?.name}</span>
                  <span className="text-muted">
                    {" "}
                    · {b.user?.full_name} · due {formatCampus(b.ends_at, { day: undefined, month: undefined })}
                  </span>
                </span>
                <Pill tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].label}</Pill>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
