import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { ResourceIcon } from "@/components/resource-icon";
import { DecisionReceiptCard } from "@/components/decision-receipt";
import { AuditTimeline } from "@/components/audit-timeline";
import { CancelForm, DecisionForm } from "@/components/action-forms";
import { ConfirmCheckInForm, ReportIncidentForm, VerifyReturnForm } from "@/components/handover-forms";
import { ConditionRecord } from "@/components/condition-record";
import { DisputeForm, ExtendForm } from "@/components/booking-extras";
import { campusParts } from "@/lib/domain/time";
import { signedHandoverPhotos } from "@/lib/services/handovers";
import { OWNER_ROLES, STAFF_ROLES, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_STATUS } from "@/lib/status";
import { formatCampus } from "@/lib/domain/time";
import type { DecisionReceipt } from "@/lib/domain/receipt";

export const metadata: Metadata = { title: "Booking" };

const CANCELLABLE = ["requested", "in_draw", "waitlisted", "approved"];

export default async function BookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await requireUser();
  const supabase = await createClient();

  // RLS decides visibility: requester, resource owner, attendants and staff of that campus.
  const { data: b } = await supabase
    .from("bookings")
    .select("*, resource:resources(id, name, category, location, owner_id, requires_supervision, photo_slots), requester:profiles!bookings_user_id_fkey(full_name, roll_no)")
    .eq("id", id)
    .maybeSingle();
  if (!b?.resource) notFound();

  // The RLS read above already proved this user may see the booking, so signing photo URLs is safe.
  const [{ data: timeline }, { data: incidents }, handovers] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id, action, reason, created_at, hash, actor:profiles!audit_log_actor_id_fkey(full_name)")
      .eq("entity_id", id)
      .order("id"),
    supabase.from("incidents").select("id, type, severity, status, description, decision, borrower_response").eq("booking_id", id).order("created_at"),
    signedHandoverPhotos(id),
  ]);

  const isRequester = b.user_id === user.id;
  const canManage = STAFF_ROLES.includes(user.role) || (OWNER_ROLES.includes(user.role) && b.resource.owner_id === user.id);
  const checkIn = handovers.find((h) => h.phase === "check_in");
  const returned = handovers.find((h) => h.phase === "return");
  const awaitingAttendant = b.status === "approved" && b.resource.requires_supervision && !!checkIn && !checkIn.attendant_confirmed_at;
  const isAttendant = ["attendant", ...STAFF_ROLES].includes(user.role);
  const status = BOOKING_STATUS[b.status];
  const receipt = b.decision_receipt as DecisionReceipt | null;
  const startsSoon = new Date(b.starts_at).getTime() - Date.now() < 24 * 3_600_000;
  const endParts = campusParts(new Date(b.ends_at));
  const endDate = `${endParts.year}-${String(endParts.month + 1).padStart(2, "0")}-${String(endParts.day).padStart(2, "0")}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {isNew && (
          <div role="status" className="rounded-lg border border-accent bg-accent-soft p-4 text-sm text-accent">
            Request recorded. Below is exactly what happened and why. You will be notified of every change.
          </div>
        )}

        <div className="flex flex-wrap items-start gap-4">
          <ResourceIcon category={b.resource.category} />
          <div className="flex-1">
            <p className="text-sm text-muted">Booking · {b.id.slice(0, 8)}</p>
            <h1 className="font-display text-3xl leading-tight">
              <Link href={`/resources/${b.resource.id}`} className="hover:underline">
                {b.resource.name}
              </Link>
            </h1>
            <p className="text-sm text-muted">
              {formatCampus(b.starts_at, { weekday: "long" })} – {formatCampus(b.ends_at, { day: undefined, month: undefined })} · {b.resource.location}
            </p>
          </div>
          <Pill tone={status.tone} className="text-sm">
            {status.label}
            {b.status === "waitlisted" && b.waitlist_position ? ` #${b.waitlist_position}` : ""}
          </Pill>
        </div>

        <ConditionRecord handovers={handovers} slots={(b.resource.photo_slots as string[]) ?? []} />

        {!!incidents?.length && (
          <Card className="p-5">
            <h2 className="mb-3 font-medium">Incidents</h2>
            <ul className="space-y-3">
              {incidents.map((i) => (
                <li key={i.id} className="rounded-md border border-rule p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="danger">{i.type}</Pill>
                    <Pill tone={i.severity === "high" ? "danger" : i.severity === "medium" ? "warn" : "neutral"}>{i.severity}</Pill>
                    <Pill tone={i.status === "resolved" ? "ok" : "info"}>{i.status === "resolved" ? "Decided" : "Awaiting manager"}</Pill>
                  </div>
                  <p className="mt-2 text-ink-2">{i.description}</p>
                  {i.borrower_response && <p className="mt-1 text-ink-2">Borrower’s response: “{i.borrower_response}”</p>}
                  {i.decision && <p className="mt-1 text-ink">Decision: {i.decision}</p>}
                  {isRequester && i.status !== "resolved" && !i.borrower_response && <DisputeForm incidentId={i.id} />}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {receipt && <DecisionReceiptCard receipt={receipt} />}

        <Card className="p-5">
          <h2 className="mb-1 font-medium">Purpose</h2>
          <p className="text-sm text-ink-2">{b.purpose}</p>
          {b.deadline_note && <p className="mt-2 text-sm text-ink-2">Deadline: {b.deadline_note}</p>}
          {!isRequester && (
            <p className="mt-2 text-sm text-muted">
              Requested by {b.requester?.full_name} {b.requester?.roll_no ? `(${b.requester.roll_no})` : ""}
            </p>
          )}
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="space-y-3 p-5">
          <h2 className="font-medium">Next step</h2>
          {awaitingAttendant && (
            <p className="rounded-md bg-info-soft p-3 text-sm text-info">Condition recorded. Waiting for a lab attendant to confirm in person.</p>
          )}
          {awaitingAttendant && isAttendant && <ConfirmCheckInForm bookingId={b.id} />}
          {b.status === "returned" && canManage && <VerifyReturnForm bookingId={b.id} flagged={!!returned?.ai_flag} />}
          {b.status === "returned" && !canManage && <p className="text-sm text-ink-2">Returned. The owner is verifying the condition.</p>}
          {b.status === "approved" && isRequester && !checkIn && (
            <>
              <p className="text-sm text-ink-2">
                {startsSoon ? "Your slot is close. Scan the QR tag on the resource, or start check-in here." : "Check-in opens on the day of your slot."}
              </p>
              <ButtonLink href={`/bookings/${b.id}/handover?phase=check_in`} className="w-full">
                Start check-in
              </ButtonLink>
            </>
          )}
          {["approved", "checked_in"].includes(b.status) && isRequester && (
            <ExtendForm bookingId={b.id} date={endDate} endHour={Math.floor(endParts.minutes / 60)} />
          )}
          {["checked_in", "overdue"].includes(b.status) && isRequester && (
            <ButtonLink href={`/bookings/${b.id}/handover?phase=return`} className="w-full">
              Return and record condition
            </ButtonLink>
          )}
          {["requested", "in_draw"].includes(b.status) && canManage && <DecisionForm bookingId={b.id} />}
          {CANCELLABLE.includes(b.status) && !checkIn && (isRequester || canManage) && <CancelForm bookingId={b.id} needsReason={!isRequester} />}
          {["approved", "checked_in", "overdue", "returned", "closed"].includes(b.status) && (isRequester || canManage || isAttendant) && (
            <ReportIncidentForm bookingId={b.id} />
          )}
          {["closed", "cancelled", "rejected"].includes(b.status) && <p className="text-sm text-muted">This booking is finished. Its record stays in the audit chain.</p>}
          <ButtonLink href={`/bookings/${b.id}/receipt`} variant="ghost" className="w-full">
            Printable record (PDF)
          </ButtonLink>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-medium">History</h2>
          <AuditTimeline entries={timeline ?? []} />
          <Link href="/audit/verify" className="mt-4 inline-block text-sm text-accent underline">
            Verify the audit chain
          </Link>
        </Card>
      </aside>
    </div>
  );
}
