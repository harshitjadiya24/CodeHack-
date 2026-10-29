"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button, inputClass } from "@/components/ui";
import { extendAction, type ActionState } from "@/app/(app)/bookings/[id]/actions";
import { disputeAction, type GovState } from "@/app/(app)/manager/actions";

function useToast(state: { error?: string; message?: string }) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}

/** Ask for more time. Options run hourly from the current end to closing time. */
export function ExtendForm({ bookingId, date, endHour }: { bookingId: string; date: string; endHour: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(extendAction, {});
  const [open, setOpen] = useState(false);
  const t = useTranslations("Booking.forms");
  useToast(state);
  const options = Array.from({ length: Math.max(0, 18 - endHour) }, (_, i) => `${String(endHour + 1 + i).padStart(2, "0")}:00`);
  if (!options.length) return null;
  if (!open)
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        {t("moreTime")}
      </Button>
    );
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="date" value={date} />
      <label className="sr-only" htmlFor="extend-to">
        {t("newEnd")}
      </label>
      <select id="extend-to" name="to" className={inputClass}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <Button disabled={pending}>{pending ? t("checking") : t("extend")}</Button>
    </form>
  );
}

export function DisputeForm({ incidentId }: { incidentId: string }) {
  const [state, action, pending] = useActionState<GovState, FormData>(disputeAction, {});
  const [open, setOpen] = useState(false);
  const t = useTranslations("Booking.forms");
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-sm text-accent underline">
        {t("contest")}
      </button>
    );
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <label className="sr-only" htmlFor={`resp-${incidentId}`}>
        {t("response")}
      </label>
      <textarea id={`resp-${incidentId}`} name="response" rows={3} required minLength={15} className={inputClass} placeholder={t("responsePlaceholder")} />
      <Button disabled={pending} variant="secondary">
        {pending ? t("sending") : t("sendManager")}
      </Button>
    </form>
  );
}
