import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, Coins, IndianRupee, MapPin, Timer } from "lucide-react";
import { ButtonLink, Card, Pill } from "@/components/ui";
import { ResourceIcon } from "@/components/resource-icon";
import { EligibilityPanel } from "@/components/eligibility-panel";
import { BORROWER_ROLES, OWNER_ROLES, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingHistory, eligibilityFor, loadResourceContext } from "@/lib/services/context";
import { creditsUsedThisWeek } from "@/lib/domain/fairness";
import { campusParts, formatCampus } from "@/lib/domain/time";
import { inr } from "@/lib/utils";
import { RequestForm } from "./request-form";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ctx = await loadResourceContext(createAdminClient(), id);
  return { title: ctx?.resource.name ?? "Resource" };
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const user = await requireUser();
  const db = createAdminClient();
  const ctx = await loadResourceContext(db, id);
  if (!ctx) notFound();
  const { resource: r } = ctx;

  const isBorrower = BORROWER_ROLES.includes(user.role);
  const canManage = OWNER_ROLES.includes(user.role) && (r.owner_id === user.id || user.role !== "owner");

  const [eligibility, history, { data: busy }, { data: owner }] = await Promise.all([
    eligibilityFor(db, user, ctx),
    bookingHistory(db, user.id),
    db
      .from("bookings")
      .select("starts_at, ends_at, status")
      .eq("resource_id", r.id)
      .in("status", ["approved", "checked_in", "overdue", "requested", "in_draw"])
      .gte("ends_at", new Date().toISOString())
      .lte("starts_at", new Date(Date.now() + 7 * 24 * 3_600_000).toISOString())
      .order("starts_at"),
    db.from("profiles").select("full_name").eq("id", r.owner_id).single(),
  ]);

  const used = creditsUsedThisWeek(history, new Date());
  const checklist = (r.checklist as string[]) ?? [];
  const hours = [...new Map(ctx.rules.availability.map((w) => [`${w.startTime}-${w.endTime}`, w])).values()].map((w) => ({
    days: ctx.rules.availability.filter((x) => x.startTime === w.startTime && x.endTime === w.endTime).map((x) => WEEKDAYS[x.weekday]),
    span: `${w.startTime.slice(0, 5)}–${w.endTime.slice(0, 5)}`,
  }));
  const tomorrow = new Date(Date.now() + 24 * 3_600_000);
  const p = campusParts(tomorrow);
  const minDate = `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="flex gap-4">
          <ResourceIcon category={r.category} className="size-16" />
          <div>
            <p className="text-sm text-muted">{r.category} · {r.kind}</p>
            <h1 className="font-display text-4xl leading-tight">{r.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-4" aria-hidden /> {r.location} · Owner: {owner?.full_name}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.demand === "high" && <Pill tone="saffron">High demand · Fair Draw for clashes</Pill>}
              {r.requires_supervision && <Pill tone="info">Attendant-supervised</Pill>}
              {r.auto_approve && !r.requires_supervision && <Pill tone="accent">Instant approval</Pill>}
            </div>
          </div>
        </div>

        <p className="text-ink-2">{r.description}</p>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Coins, label: "Credits / hour", value: String(r.credit_rate) },
            { icon: Timer, label: "Max per booking", value: `${r.max_hours} h` },
            { icon: IndianRupee, label: "Deposit", value: r.deposit_inr ? inr(r.deposit_inr) : "None" },
            { icon: IndianRupee, label: "Market rent", value: `${inr(r.rental_value_inr_per_hour)}/h` },
          ].map((s) => (
            <Card key={s.label} className="p-3">
              <dt className="flex items-center gap-1 text-xs text-muted">
                <s.icon className="size-3.5" aria-hidden /> {s.label}
              </dt>
              <dd className="mt-1 font-medium text-ink">{s.value}</dd>
            </Card>
          ))}
        </dl>

        <Card className="p-5">
          <h2 className="mb-2 font-medium">Usage rules</h2>
          <p className="text-sm text-ink-2">{r.rules}</p>
          {checklist.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-sm font-medium">Condition checked at every handover</h3>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                {checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
          <h3 className="mb-1 mt-4 text-sm font-medium">Opening hours (campus time)</h3>
          <ul className="text-sm text-ink-2">
            {hours.map((h) => (
              <li key={h.span}>
                {h.days.join(", ")} · {h.span}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-medium">
            <CalendarClock className="size-4" aria-hidden /> Next 7 days
          </h2>
          {busy?.length ? (
            <ul className="divide-y divide-rule text-sm">
              {busy.map((b, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>
                    {formatCampus(b.starts_at, { weekday: "short" })} – {formatCampus(b.ends_at, { day: undefined, month: undefined })}
                  </span>
                  <Pill tone={["requested", "in_draw"].includes(b.status) ? "warn" : "neutral"}>
                    {b.status === "in_draw" ? "Fair Draw pending" : b.status === "requested" ? "Requested" : "Booked"}
                  </Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Wide open. This resource has no bookings in the next week.</p>
          )}
          <p className="mt-2 text-xs text-muted">Only times are shown. Who booked stays private.</p>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-1 font-medium">Can I use it?</h2>
          <p className={`mb-4 text-sm ${eligibility.eligible ? "text-ok" : "text-danger"}`}>
            {eligibility.eligible ? "Yes, every requirement is met." : "Not yet. Here is exactly what is missing."}
          </p>
          <EligibilityPanel result={eligibility} />
        </Card>

        {isBorrower && (
          <Card className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-medium">Request a slot</h2>
              <span className="text-xs text-muted">
                {Math.max(0, ctx.config.weeklyCredits - used)} / {ctx.config.weeklyCredits} credits left this week
              </span>
            </div>
            {eligibility.eligible ? (
              <RequestForm resourceId={r.id} maxHours={r.max_hours} minDate={minDate} />
            ) : (
              <div className="space-y-3 text-sm text-ink-2">
                <p>Requests open once the missing items above are sorted.</p>
                <ButtonLink href="/passport" variant="secondary" className="w-full">
                  Open my Trust Passport
                </ButtonLink>
              </div>
            )}
          </Card>
        )}

        {canManage && (
          <Card className="p-5">
            <h2 className="mb-2 font-medium">Owner tools</h2>
            <div className="grid gap-2">
              <ButtonLink href={`/owner/resources/${r.id}/edit`} variant="secondary">Edit conditions / maintenance</ButtonLink>
              <ButtonLink href={`/owner/resources/${r.id}/qr`} variant="secondary">Print QR tag</ButtonLink>
              <ButtonLink href="/owner" variant="secondary">Review requests</ButtonLink>
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}
