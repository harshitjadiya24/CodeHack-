"use client";

import { useActionState } from "react";
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

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
