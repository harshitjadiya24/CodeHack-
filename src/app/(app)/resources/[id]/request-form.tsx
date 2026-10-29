"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Field, inputClass } from "@/components/ui";
import { requestBookingAction, type RequestState } from "./actions";
import { DatePickerCard } from "@/components/date-picker-card";

const HOURS = Array.from({ length: 10 }, (_, i) => `${String(9 + i).padStart(2, "0")}:00`);

export function RequestForm({ resourceId, maxHours, minDate, openWeekdays }: { resourceId: string; maxHours: number; minDate: string; openWeekdays: number[] }) {
  const [state, action, pending] = useActionState<RequestState, FormData>(requestBookingAction, {});
  const t = useTranslations("Resource.form");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="resourceId" value={resourceId} />
      <DatePickerCard name="date" minDate={minDate} openWeekdays={openWeekdays} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("from")}>
          <select name="from" defaultValue="10:00" className={inputClass}>
            {HOURS.slice(0, -1).map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </Field>
        <Field label={t("to")} hint={t("maxHours", { count: maxHours })}>
          <select name="to" defaultValue="12:00" className={inputClass}>
            {HOURS.slice(1).map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("purpose")} hint={t("purposeHint")}>
        <textarea name="purpose" rows={3} required minLength={10} className={inputClass} placeholder={t("purposePlaceholder")} />
      </Field>
      <Field label={t("repeat")} hint={t("repeatHint")}>
        <select name="weeks" defaultValue="1" className={inputClass}>
          <option value="1">{t("once")}</option>
          {[2, 3, 4, 6, 8].map((n) => (
            <option key={n} value={n}>
              {t("weekly", { count: n })}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("deadline")} hint={t("deadlineHint")}>
        <input name="deadlineNote" className={inputClass} placeholder={t("deadlinePlaceholder")} />
      </Field>

      {state.error && (
        <div role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
          <p className="font-medium">{state.error}</p>
          {state.reasons && (
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {state.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state.series && (
        <div role="status" className="rounded-xl border border-rule bg-card p-3 text-sm">
          <p className="font-medium">{t("seriesDone", { sent: state.series.filter((w) => w.bookingId).length, total: state.series.length })}</p>
          <ul className="mt-2 space-y-1.5">
            {state.series.map((w) => (
              <li key={w.date} className="flex flex-wrap gap-x-2">
                <span className="font-mono text-[13px]">{w.date}</span>
                {w.bookingId ? (
                  <Link href={`/bookings/${w.bookingId}`} className="text-ok underline">
                    {t("seriesSent")}
                  </Link>
                ) : (
                  <span className="text-danger">{w.reason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
