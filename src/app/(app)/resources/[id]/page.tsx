import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, Coins, IndianRupee, MapPin, Star, Timer, Wrench, Users } from "lucide-react";
import { ratingFor } from "@/lib/services/operations";
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
import { EndorsementRequestForm } from "@/components/governance-forms";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocale } from "@/i18n/config";

// Short weekday names in the reader's language: 4 Jan 1970 was a Sunday.
const weekdayNames = (locale: string) =>
  Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(1970, 0, 4 + i))));

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
  const guest = user.org_id !== r.org_id;
  const canManage = OWNER_ROLES.includes(user.role) && (r.owner_id === user.id || user.role !== "owner");

  const [eligibility, history, { data: busy }, { data: owner }, rating] = await Promise.all([
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
    ratingFor(r.id),
  ]);
  const downtime = (ctx.rules.downtime ?? []).filter((d) => new Date(d.startsAt).getTime() < Date.now() + 7 * 24 * 3_600_000);
  // A guest whose endorsement hasn't been granted yet: have they asked already?
  const needsEndorsement = isBorrower && guest && !eligibility.checks.find((c) => c.id === "org")?.passed;
  const [{ data: host }, { data: asked }] = needsEndorsement
    ? await Promise.all([
        db.from("organizations").select("id, name").eq("id", r.org_id).single(),
        db.from("endorsements").select("created_at").eq("user_id", user.id).eq("host_org_id", r.org_id).eq("status", "requested").maybeSingle(),
      ])
    : [{ data: null }, { data: null }];

  const [t, te, tr, tm, locale] = await Promise.all([
    getTranslations("Resource"),
    getTranslations("Eligibility"),
    getTranslations("Ratings"),
    getTranslations("Maintenance"),
    getLocale().then(intlLocale),
  ]);
  const WEEKDAYS = weekdayNames(locale);
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
            <p className="text-sm text-subtle">
              {r.category} · {t(`kinds.${r.kind}`)}
            </p>
            <h1 className="font-display text-4xl leading-tight">{r.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-subtle">
              <MapPin className="size-4" aria-hidden /> {r.location} · {t("owner", { name: owner?.full_name ?? "" })}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.demand === "high" && <Pill tone="saffron">{t("highDemand")}</Pill>}
              {r.requires_supervision && <Pill tone="info">{t("supervised")}</Pill>}
              {r.auto_approve && !r.requires_supervision && <Pill tone="accent">{t("instant")}</Pill>}
              <Pill tone="neutral">
                <Star className="size-3" aria-hidden />{" "}
                {rating.average ? tr("summary", { average: rating.average.toFixed(1), count: rating.count }) : tr("none")}
              </Pill>
            </div>
          </div>
        </div>

        <p className="text-ink-2">{r.description}</p>
        {rating.recent.length > 0 && (
          <ul className="space-y-2">
            {rating.recent.map((c) => (
              <li key={c.created_at} className="rounded-2xl border border-rule px-4 py-3 text-sm text-ink-2">
                <span className="tab font-semibold text-ink">{"★".repeat(c.rating)}</span> “{c.comment}”
              </li>
            ))}
          </ul>
        )}

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Coins, label: t("creditsPerHour"), value: String(r.credit_rate) },
            { icon: Timer, label: t("maxPerBooking"), value: t("hours", { count: r.max_hours }) },
            { icon: IndianRupee, label: t("deposit"), value: r.deposit_inr ? inr(r.deposit_inr) : t("none") },
            { icon: IndianRupee, label: t("marketRent"), value: t("perHour", { amount: inr(r.rental_value_inr_per_hour) }) },
            ...(r.capacity ? [{ icon: Users, label: t("seats"), value: String(r.capacity) }] : []),
          ].map((s) => (
            <Card key={s.label} className="p-3">
              <dt className="flex items-center gap-1 text-xs text-subtle">
                <s.icon className="size-3.5" aria-hidden /> {s.label}
              </dt>
              <dd className="mt-1 font-medium text-ink">{s.value}</dd>
            </Card>
          ))}
        </dl>

        <Card className="p-5">
          <h2 className="mb-2 font-bold">{t("usageRules")}</h2>
          <p className="text-sm text-ink-2">{r.rules}</p>
          {checklist.length > 0 && (
            <>
              <h3 className="mb-1 mt-4 text-sm font-bold">{t("checklist")}</h3>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                {checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </>
          )}
          <h3 className="mb-1 mt-4 text-sm font-bold">{t("openingHours")}</h3>
          <ul className="text-sm text-ink-2">
            {hours.map((h) => (
              <li key={h.span}>
                {h.days.join(", ")} · {h.span}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <CalendarClock className="size-4" aria-hidden /> {t("next7")}
          </h2>
          {downtime.length > 0 && (
            <ul className="mb-3 space-y-2">
              {downtime.map((d) => (
                <li key={d.startsAt} className="tone-rose flex gap-2 rounded-xl px-3 py-2 text-sm">
                  <Wrench className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>
                    <b>{tm("closed")}</b> · {formatCampus(d.startsAt, { weekday: "short" }, locale)} – {formatCampus(d.endsAt, {}, locale)}
                    <span className="block">{d.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {busy?.length ? (
            <ul className="divide-y divide-rule text-sm">
              {busy.map((b, i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <span>
                    {formatCampus(b.starts_at, { weekday: "short" }, locale)} – {formatCampus(b.ends_at, { day: undefined, month: undefined }, locale)}
                  </span>
                  <Pill tone={["requested", "in_draw"].includes(b.status) ? "warn" : "neutral"}>
                    {b.status === "in_draw" ? t("drawPending") : b.status === "requested" ? t("requested") : t("booked")}
                  </Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-subtle">{t("wideOpen")}</p>
          )}
          <p className="mt-2 text-xs text-subtle">{t("private")}</p>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-1 font-bold">{t("canIUse")}</h2>
          <p className={`mb-4 text-sm ${eligibility.eligible ? "text-ok" : "text-danger"}`}>
            {eligibility.eligible ? te("yes") : te("no")}
          </p>
          <EligibilityPanel result={eligibility} />
        </Card>

        {isBorrower && (
          <Card className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-bold">{t("requestSlot")}</h2>
              <span className="text-xs text-subtle">
                {t("creditsLeft", { left: Math.max(0, ctx.config.weeklyCredits - used), total: ctx.config.weeklyCredits })}
              </span>
            </div>
            {needsEndorsement && host ? (
              asked ? (
                <p className="tone-butter rounded-2xl px-4 py-3 text-sm">
                  {t.rich("waitingAdmin", { b: (c) => <b>{c}</b>, date: formatCampus(asked.created_at, {}, locale), host: host.name })}
                </p>
              ) : (
                <EndorsementRequestForm hostOrgId={host.id} hostName={host.name} />
              )
            ) : eligibility.eligible ? (
              <RequestForm resourceId={r.id} maxHours={r.max_hours} minDate={minDate} openWeekdays={[...new Set(ctx.rules.availability.map((w) => w.weekday))]} />
            ) : (
              <div className="space-y-3 text-sm text-ink-2">
                <p>{t("requestsOpen")}</p>
                <ButtonLink href="/passport" variant="secondary" className="w-full">
                  {t("openPassport")}
                </ButtonLink>
              </div>
            )}
          </Card>
        )}

        {canManage && (
          <Card className="p-5">
            <h2 className="mb-2 font-bold">{t("ownerTools")}</h2>
            <div className="grid gap-2">
              <ButtonLink href={`/owner/resources/${r.id}/edit`} variant="secondary">
                {t("editConditions")}
              </ButtonLink>
              <ButtonLink href={`/owner/resources/${r.id}/qr`} variant="secondary">
                {t("printQr")}
              </ButtonLink>
              <ButtonLink href="/owner" variant="secondary">
                {t("reviewRequests")}
              </ButtonLink>
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}
