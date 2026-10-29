import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, Card, DownloadLink, EmptyState, PageHeader, Pill } from "@/components/ui";
import { ResourceIcon } from "@/components/resource-icon";
import { BookingTabs } from "@/components/booking-tabs";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_STATUS } from "@/lib/status";
import { formatCampus } from "@/lib/domain/time";
import { CalendarPlus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Bookings"))("title") };
}

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

  const [t, status, locale] = await Promise.all([getTranslations("Bookings"), getTranslations("Status"), getLocale().then(intlLocale)]);
  const live = (bookings ?? []).filter((b) => LIVE.includes(b.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = (bookings ?? []).filter((b) => !LIVE.includes(b.status));

  const Row = ({ b }: { b: NonNullable<typeof bookings>[number] }) => (
    <li>
      <Link href={`/bookings/${b.id}`} className="group block">
        <Card className="flex items-center gap-4 p-4 transition group-hover:border-accent">
          <ResourceIcon category={b.resource?.category ?? ""} className="size-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{b.resource?.name}</p>
            <p className="text-sm text-subtle">
              {formatCampus(b.starts_at, { weekday: "short" }, locale)} – {formatCampus(b.ends_at, { day: undefined, month: undefined }, locale)} ·{" "}
              {t("credits", { count: b.credits })}
            </p>
          </div>
          <Pill tone={BOOKING_STATUS[b.status].tone}>{status(b.status)}</Pill>
        </Card>
      </Link>
    </li>
  );

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")}>
        <div className="flex flex-wrap gap-2">
          {live.some((b) => ["approved", "checked_in", "waitlisted"].includes(b.status)) && (
            <DownloadLink href="/bookings/calendar">
              <CalendarPlus className="size-4" aria-hidden /> {t("addAll")}
            </DownloadLink>
          )}
          <ButtonLink href="/resources">{t("find")}</ButtonLink>
        </div>
      </PageHeader>

      <BookingTabs
        counts={[live.length, past.length]}
        labels={[t("active"), t("history")]}
        active={live.length ? <ul className="space-y-2">{live.map((b) => <Row key={b.id} b={b} />)}</ul> : <EmptyState title={t("emptyActive")}>{t("emptyActiveBody")}</EmptyState>}
        history={past.length ? <ul className="space-y-2">{past.map((b) => <Row key={b.id} b={b} />)}</ul> : <EmptyState title={t("emptyHistory")}>{t("emptyHistoryBody")}</EmptyState>}
      />
    </>
  );
}
