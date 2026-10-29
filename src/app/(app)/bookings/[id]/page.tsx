import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Card, DownloadLink, Pill } from "@/components/ui";
import { CalendarPlus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocale } from "@/i18n/config";
import { ResourceIcon } from "@/components/resource-icon";
import { DecisionReceiptCard } from "@/components/decision-receipt";
import { AuditTimeline } from "@/components/audit-timeline";
import { CancelForm, DecisionForm } from "@/components/action-forms";
import { ConfirmCheckInForm, ReportIncidentForm, VerifyReturnForm } from "@/components/handover-forms";
import { ConditionRecord } from "@/components/condition-record";
import { DisputeForm, ExtendForm } from "@/components/booking-extras";
import { Ticket } from "@/components/common-room/ticket";
import { campusParts } from "@/lib/domain/time";
import { signedHandoverPhotos } from "@/lib/services/handovers";
import { OWNER_ROLES, STAFF_ROLES, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_STATUS } from "@/lib/status";
import { formatCampus } from "@/lib/domain/time";
import type { DecisionReceipt } from "@/lib/domain/receipt";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Booking"))("title") };
}

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

  const [t, statusLabel, locale] = await Promise.all([getTranslations("Booking"), getTranslations("Status"), getLocale().then(intlLocale)]);
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions = {}) => formatCampus(d, opts, locale);
  const isRequester = b.user_id === user.id;
  const canManage = STAFF_ROLES.includes(user.role) || (OWNER_ROLES.includes(user.role) && b.resource.owner_id === user.id);
  const checkIn = handovers.find((h) => h.phase === "check_in");
  const returned = handovers.find((h) => h.phase === "return");
  const awaitingAttendant = b.status === "approved" && b.resource.requires_supervision && !!checkIn && !checkIn.attendant_confirmed_at;
  const isAttendant = ["attendant", ...STAFF_ROLES].includes(user.role);
  const status = { ...BOOKING_STATUS[b.status], label: statusLabel(b.status) };
  const receipt = b.decision_receipt as DecisionReceipt | null;
  const startsSoon = new Date(b.starts_at).getTime() - Date.now() < 24 * 3_600_000;
  const endParts = campusParts(new Date(b.ends_at));
  const endDate = `${endParts.year}-${String(endParts.month + 1).padStart(2, "0")}-${String(endParts.day).padStart(2, "0")}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {isNew && (
          <div role="status" className="rounded-[22px] border border-accent bg-accent-soft p-4 text-sm text-accent">
            {t("newNotice")}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-4">
          <ResourceIcon category={b.resource.category} />
          <div className="flex-1">
            <p className="text-sm text-subtle">{t("id", { id: b.id.slice(0, 8) })}</p>
            <h1 className="type-h2">
              <Link href={`/resources/${b.resource.id}`} className="hover:underline">
                {b.resource.name}
              </Link>
            </h1>
            <p className="text-sm text-subtle">
              {fmt(b.starts_at, { weekday: "long" })} – {fmt(b.ends_at, { day: undefined, month: undefined })} · {b.resource.location}
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
            <h2 className="mb-3 font-bold">{t("incidents")}</h2>
            <ul className="space-y-3">
              {incidents.map((i) => (
                <li key={i.id} className="rounded-xl border border-rule p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="danger">{t(`incidentTypes.${i.type}`)}</Pill>
                    <Pill tone={i.severity === "high" ? "danger" : i.severity === "medium" ? "warn" : "neutral"}>{t(`severities.${i.severity}`)}</Pill>
                    <Pill tone={i.status === "resolved" ? "ok" : "info"}>{i.status === "resolved" ? t("decided") : t("awaitingManager")}</Pill>
                  </div>
                  <p className="mt-2 text-ink-2">{i.description}</p>
                  {i.borrower_response && <p className="mt-1 text-ink-2">{t("borrowerResponse", { text: i.borrower_response })}</p>}
                  {i.decision && <p className="mt-1 text-ink">{t("decision", { text: i.decision })}</p>}
                  {isRequester && i.status !== "resolved" && !i.borrower_response && <DisputeForm incidentId={i.id} />}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {receipt && <DecisionReceiptCard receipt={receipt} />}

        <Card className="p-5">
          <h2 className="mb-1 font-bold">{t("purpose")}</h2>
          <p className="text-sm text-ink-2">{b.purpose}</p>
          {b.deadline_note && <p className="mt-2 text-sm text-ink-2">{t("deadline", { note: b.deadline_note })}</p>}
          {!isRequester && (
            <p className="mt-2 text-sm text-subtle">
              {t("requestedBy", { name: `${b.requester?.full_name ?? ""}${b.requester?.roll_no ? ` (${b.requester.roll_no})` : ""}` })}
            </p>
          )}
        </Card>
      </div>

      {/* On a phone the ticket and the next step come first: they are what you act on. */}
      <aside className="order-first space-y-4 lg:order-none">
        <Ticket
          status={`${status.label}${b.status === "waitlisted" && b.waitlist_position ? ` #${b.waitlist_position}` : ""}`}
          code={`BT-${b.id.slice(0, 4).toUpperCase()}`}
          tone={["approved", "checked_in", "closed"].includes(b.status) ? "ok" : status.tone === "saffron" || status.tone === "info" ? "draw" : status.tone === "danger" ? "danger" : status.tone === "warn" ? "warn" : "neutral"}
          rows={[
            [t("borrower"), b.requester?.full_name ?? "—"],
            [t("slot"), `${fmt(b.starts_at, { weekday: "short", hour12: false })}–${fmt(b.ends_at, { day: undefined, month: undefined, hour12: false })}`],
            [t("where"), b.resource.location],
            [t("decidedBy"), receipt ? (receipt.decidedBy.kind === "person" ? receipt.decidedBy.name : t("publishedRules")) : t("pending")],
          ]}
          stub={timeline?.at(-1)?.hash ? { left: <span className="font-mono">{t("record", { hash: timeline.at(-1)!.hash.slice(0, 12) })}</span>, right: t("showAtDesk") } : undefined}
        />
        <Card className="space-y-3 p-5">
          <h2 className="font-bold">{t("nextStep")}</h2>
          {awaitingAttendant && (
            <p className="rounded-xl bg-info-soft p-3 text-sm text-info">{t("awaitingAttendant")}</p>
          )}
          {awaitingAttendant && isAttendant && <ConfirmCheckInForm bookingId={b.id} />}
          {b.status === "returned" && canManage && <VerifyReturnForm bookingId={b.id} flagged={!!returned?.ai_flag} />}
          {b.status === "returned" && !canManage && <p className="text-sm text-ink-2">{t("returnedVerifying")}</p>}
          {b.status === "approved" && isRequester && !checkIn && (
            <>
              <p className="text-sm text-ink-2">
                {startsSoon ? t("slotClose") : t("checkInOpens")}
              </p>
              <ButtonLink href={`/bookings/${b.id}/handover?phase=check_in`} className="w-full">
                {t("startCheckIn")}
              </ButtonLink>
            </>
          )}
          {["approved", "checked_in"].includes(b.status) && isRequester && (
            <ExtendForm bookingId={b.id} date={endDate} endHour={Math.floor(endParts.minutes / 60)} />
          )}
          {["checked_in", "overdue"].includes(b.status) && isRequester && (
            <ButtonLink href={`/bookings/${b.id}/handover?phase=return`} className="w-full">
              {t("returnRecord")}
            </ButtonLink>
          )}
          {["requested", "in_draw"].includes(b.status) && canManage && <DecisionForm bookingId={b.id} />}
          {CANCELLABLE.includes(b.status) && !checkIn && (isRequester || canManage) && <CancelForm bookingId={b.id} needsReason={!isRequester} />}
          {["approved", "checked_in", "overdue", "returned", "closed"].includes(b.status) && (isRequester || canManage || isAttendant) && (
            <ReportIncidentForm bookingId={b.id} />
          )}
          {["closed", "cancelled", "rejected"].includes(b.status) && <p className="text-sm text-subtle">{t("finished")}</p>}
          {isRequester && ["approved", "checked_in", "waitlisted"].includes(b.status) && (
            <DownloadLink href={`/bookings/${b.id}/calendar`} className="w-full">
              <CalendarPlus className="size-4" aria-hidden /> {t("addToCalendar")}
            </DownloadLink>
          )}
          <ButtonLink href={`/bookings/${b.id}/receipt`} variant="ghost" className="w-full">
            {t("printable")}
          </ButtonLink>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-bold">{t("history")}</h2>
          <AuditTimeline entries={timeline ?? []} />
          <Link href="/audit/verify" className="mt-4 inline-block text-sm text-accent underline">
            {t("verifyChain")}
          </Link>
        </Card>
      </aside>
    </div>
  );
}
