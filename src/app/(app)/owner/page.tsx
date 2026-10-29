import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, Mono, PageHeader, Pill } from "@/components/ui";
import { DecisionForm, RunDrawForm } from "@/components/action-forms";
import { OWNER_ROLES, STAFF_ROLES, requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampus } from "@/lib/domain/time";
import type { PriorityBreakdownItem } from "@/lib/domain/fairness";
import { BOOKING_STATUS } from "@/lib/status";

export const metadata: Metadata = { title: "Requests" };

export default async function OwnerQueuePage() {
  const user = await requirePageRole(OWNER_ROLES);
  const db = createAdminClient();
  const isStaff = STAFF_ROLES.includes(user.role);

  let resourcesQuery = db.from("resources").select("id, name").eq("org_id", user.org_id);
  if (!isStaff) resourcesQuery = resourcesQuery.eq("owner_id", user.id);
  const { data: resources } = await resourcesQuery;
  const ids = (resources ?? []).map((r) => r.id);

  const { data: rows } = ids.length
    ? await db
        .from("bookings")
        .select("*, resource:resources(name, demand, requires_supervision), requester:profiles!bookings_user_id_fkey(full_name, roll_no, strikes, org_id)")
        .in("resource_id", ids)
        .in("status", ["requested", "in_draw", "approved", "checked_in", "overdue", "returned"])
        .gte("ends_at", new Date(Date.now() - 7 * 24 * 3_600_000).toISOString())
        .order("starts_at")
    : { data: [] };

  const bookings = rows ?? [];

  // Guests from partner campuses: show who vouched for them and until when.
  const guestIds = [...new Set(bookings.filter((b) => b.requester && b.requester.org_id !== user.org_id).map((b) => b.user_id))];
  const { data: guestEndorsements } = guestIds.length
    ? await db
        .from("endorsements")
        .select("user_id, valid_until, home:organizations!endorsements_home_org_id_fkey(name)")
        .eq("host_org_id", user.org_id)
        .eq("status", "approved")
        .in("user_id", guestIds)
    : { data: [] };
  const guestOf = new Map((guestEndorsements ?? []).map((e) => [e.user_id, e]));
  const pending = bookings.filter((b) => b.status === "requested");
  const inDraw = bookings.filter((b) => b.status === "in_draw");
  const upcoming = bookings.filter((b) => ["approved", "checked_in", "overdue", "returned"].includes(b.status));

  const draws = new Map<string, typeof inDraw>();
  for (const b of inDraw) if (b.draw_id) draws.set(b.draw_id, [...(draws.get(b.draw_id) ?? []), b]);
  const { data: drawRows } = draws.size
    ? await db.from("draw_windows").select("id, commit_hash, slot_start, slot_end").in("id", [...draws.keys()])
    : { data: [] };

  const overlaps = (a: (typeof bookings)[number], b: (typeof bookings)[number]) =>
    a.id !== b.id && a.resource_id === b.resource_id && a.starts_at < b.ends_at && b.starts_at < a.ends_at;

  return (
    <>
      <PageHeader eyebrow={isStaff ? "All campus resources" : `${ids.length} resources you own`} title="Requests to review" />

      {drawRows && drawRows.length > 0 && (
        <section aria-labelledby="draws" className="mb-10">
          <h2 id="draws" className="mb-3 text-base font-bold text-saffron">
            Fair Draws ready
          </h2>
          <div className="space-y-4">
            {drawRows.map((d) => {
              const entrants = draws.get(d.id) ?? [];
              const total = entrants.reduce((s, e) => s + Number(e.priority_score ?? 1), 0);
              return (
                <Card key={d.id} className="border-saffron/40 p-5">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{entrants[0]?.resource?.name}</p>
                      <p className="text-sm text-subtle">
                        {formatCampus(d.slot_start, { weekday: "short" })} – {formatCampus(d.slot_end, { day: undefined, month: undefined })}
                      </p>
                      <p className="mt-1 text-xs text-subtle">
                        Seed committed: <Mono>{d.commit_hash.slice(0, 20)}…</Mono>
                      </p>
                    </div>
                    <RunDrawForm drawId={d.id} entrants={entrants.length} />
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-subtle">
                        <th className="pb-1 font-normal">Entrant</th>
                        <th className="pb-1 font-normal">Priority</th>
                        <th className="pb-1 text-right font-normal">Chance of winning</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entrants.map((e) => {
                        const share = Number(e.priority_score ?? 1) / total;
                        return (
                          <tr key={e.id} className="border-t border-rule">
                            <td className="py-2">
                              <Link href={`/bookings/${e.id}`} className="hover:underline">
                                {e.requester?.full_name}
                              </Link>
                            </td>
                            <td className="py-2 font-mono">{e.priority_score}</td>
                            <td className="py-2">
                              <div className="flex items-center justify-end gap-2">
                                <div className="h-1.5 w-24 overflow-hidden rounded bg-paper-2" aria-hidden>
                                  <div className="h-full bg-saffron" style={{ width: `${Math.round(share * 100)}%` }} />
                                </div>
                                <span className="w-10 text-right font-mono">{Math.round(share * 100)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-subtle">
                    Odds are approximate for weighted sampling with one winner. Everyone keeps a chance; heavy recent users simply have less of one.
                  </p>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="pending" className="mb-10">
        <h2 id="pending" className="mb-3 text-base font-bold text-ink">
          Awaiting your decision ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState title="You're all caught up">New requests appear here with their priority breakdown.</EmptyState>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => {
              const rivals = pending.filter((o) => overlaps(b, o));
              const breakdown = (b.priority_breakdown ?? []) as PriorityBreakdownItem[];
              return (
                <Card key={b.id} className="grid gap-4 p-5 md:grid-cols-[1fr_300px]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/bookings/${b.id}`} className="font-medium hover:underline">
                        {b.resource?.name}
                      </Link>
                      {b.resource?.requires_supervision && <Pill tone="info">Supervised</Pill>}
                      {rivals.length > 0 && <Pill tone="warn">Competes with {rivals.length} other request{rivals.length > 1 ? "s" : ""}</Pill>}
                      {guestOf.get(b.user_id) && (
                        <Pill tone="ok">
                          Guest from {guestOf.get(b.user_id)?.home?.name}, endorsed until {guestOf.get(b.user_id)?.valid_until}
                        </Pill>
                      )}
                    </div>
                    <p className="text-sm text-subtle">
                      {formatCampus(b.starts_at, { weekday: "short" })} – {formatCampus(b.ends_at, { day: undefined, month: undefined })} ·{" "}
                      {b.requester?.full_name} {b.requester?.roll_no && `(${b.requester.roll_no})`}
                    </p>
                    <p className="mt-2 text-sm text-ink-2">“{b.purpose}”</p>
                    {b.deadline_note && <p className="mt-1 text-sm text-ink-2">Deadline: {b.deadline_note}</p>}
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-accent">Priority {b.priority_score} — why</summary>
                      <ul className="mt-2 space-y-0.5">
                        {breakdown.map((x) => (
                          <li key={x.label} className="flex justify-between gap-4">
                            <span className="text-ink-2">{x.label}</span>
                            <span className={`font-mono ${x.points < 0 ? "text-danger" : "text-ok"}`}>
                              {x.points > 0 ? "+" : ""}
                              {x.points}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                  <DecisionForm bookingId={b.id} />
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="upcoming">
        <h2 id="upcoming" className="mb-3 text-base font-bold text-ink">
          Approved and in use
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming bookings" />
        ) : (
          <Card className="divide-y divide-rule">
            {upcoming.map((b) => (
              <Link key={b.id} href={`/bookings/${b.id}`} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-paper-2">
                <span>
                  <span className="font-medium">{b.resource?.name}</span>
                  <span className="text-subtle"> · {b.requester?.full_name} · {formatCampus(b.starts_at, { weekday: "short" })}</span>
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
