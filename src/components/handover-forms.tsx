"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button, Field, inputClass } from "@/components/ui";
import {
  confirmCheckInAction,
  reportIncidentAction,
  verifyReturnAction,
  type HandoverState,
} from "@/app/(app)/bookings/[id]/handover/actions";

function useToast(state: HandoverState) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}

export function ConfirmCheckInForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<HandoverState, FormData>(confirmCheckInAction, {});
  const t = useTranslations("Booking.forms");
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button disabled={pending} className="w-full">
        {pending ? t("confirming") : t("confirmCheckIn")}
      </Button>
    </form>
  );
}

export function VerifyReturnForm({ bookingId, flagged }: { bookingId: string; flagged: boolean }) {
  const [state, action, pending] = useActionState<HandoverState, FormData>(verifyReturnAction, {});
  const [issue, setIssue] = useState(flagged);
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="flex gap-2" role="radiogroup" aria-label="Condition outcome">
        <label className="flex-1 cursor-pointer rounded-xl border border-rule p-2 text-center text-sm has-[:checked]:border-ok has-[:checked]:bg-ok-soft">
          <input type="radio" name="outcome" value="ok" checked={!issue} onChange={() => setIssue(false)} className="sr-only" />
          Condition OK
        </label>
        <label className="flex-1 cursor-pointer rounded-xl border border-rule p-2 text-center text-sm has-[:checked]:border-danger has-[:checked]:bg-danger-soft">
          <input type="radio" name="outcome" value="issue" checked={issue} onChange={() => setIssue(true)} className="sr-only" />
          Report an issue
        </label>
      </div>
      {issue && (
        <Field label="Severity">
          <select name="severity" defaultValue="medium" className={inputClass}>
            <option value="low">Low: cosmetic or consumable</option>
            <option value="medium">Medium: needs repair</option>
            <option value="high">High: unsafe or out of service</option>
          </select>
        </Field>
      )}
      <Field label={issue ? "What is wrong?" : "Notes (optional)"}>
        <textarea name="notes" rows={2} required={issue} className={inputClass} />
      </Field>
      <Button disabled={pending} variant={issue ? "danger" : "primary"} className="w-full">
        {pending ? "Saving…" : issue ? "Close and send to manager" : "Verify and close"}
      </Button>
      <p className="text-xs text-subtle">Penalties are never automatic. A manager reviews every incident.</p>
    </form>
  );
}

export function ReportIncidentForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<HandoverState, FormData>(reportIncidentAction, {});
  const [open, setOpen] = useState(false);
  const t = useTranslations("Booking");
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  if (!open)
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="w-full text-danger">
        {t("forms.reportProblem")}
      </Button>
    );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("forms.type")}>
          <select name="type" className={inputClass}>
            {(["damage", "safety", "conflict", "misuse", "delay"] as const).map((type) => (
              <option key={type} value={type}>
                {t(`incidentTypes.${type}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("forms.severity")}>
          <select name="severity" defaultValue="medium" className={inputClass}>
            {(["low", "medium", "high"] as const).map((level) => (
              <option key={level} value={level}>
                {t(`severities.${level}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("forms.whatHappened")}>
        <textarea name="description" rows={3} required minLength={10} className={inputClass} />
      </Field>
      <Button disabled={pending} variant="danger" className="w-full">
        {pending ? t("forms.sending") : t("forms.sendToManager")}
      </Button>
    </form>
  );
}
