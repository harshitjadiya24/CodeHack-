import { Mono } from "@/components/ui";
import { useLocale, useTranslations } from "next-intl";
import { ACTION_LABEL } from "@/lib/status";
import { intlLocale } from "@/i18n/config";
import { formatCampus } from "@/lib/domain/time";

export type TimelineEntry = {
  id: number;
  action: string;
  reason: string | null;
  created_at: string;
  hash: string;
  actor: { full_name: string } | null;
};

export function AuditTimeline({ entries }: { entries: TimelineEntry[] }) {
  const t = useTranslations();
  const locale = intlLocale(useLocale());
  // Booking events have Hindi labels (messages Actions.*); anything else falls back to the English label.
  const label = (action: string) => {
    const key = `Actions.${action.replace(/\./g, "_")}`;
    return t.has(key) ? t(key) : (ACTION_LABEL[action] ?? action);
  };
  if (!entries.length) return <p className="text-sm text-subtle">{t("Booking.noHistory")}</p>;
  return (
    <ol className="relative space-y-5 border-l border-rule pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-card bg-accent" aria-hidden />
          <p className="text-sm font-medium text-ink">{label(e.action)}</p>
          <p className="text-xs text-subtle">
            {formatCampus(e.created_at, {}, locale)} · {e.actor?.full_name ?? t("Booking.automatic")}
          </p>
          {e.reason && <p className="mt-0.5 text-sm text-ink-2">“{e.reason}”</p>}
          <Mono className="mt-0.5 block" title={e.hash}>
            #{e.hash.slice(0, 12)}
          </Mono>
        </li>
      ))}
    </ol>
  );
}
