"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
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
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button disabled={pending} className="w-full">
        {pending ? "Confirming…" : "I am present. Confirm check-in"}
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
        <label className="flex-1 cursor-pointer rounded-md border border-rule p-2 text-center text-sm has-[:checked]:border-ok has-[:checked]:bg-ok-soft">
          <input type="radio" name="outcome" value="ok" checked={!issue} onChange={() => setIssue(false)} className="sr-only" />
          Condition OK
        </label>
        <label className="flex-1 cursor-pointer rounded-md border border-rule p-2 text-center text-sm has-[:checked]:border-danger has-[:checked]:bg-danger-soft">
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
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  if (!open)
    return (
      <Button variant="ghost" onClick={() => setOpen(true)} className="w-full text-danger">
        Report a problem
      </Button>
    );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Type">
          <select name="type" className={inputClass}>
            <option value="damage">Damage</option>
            <option value="safety">Safety</option>
            <option value="conflict">Conflict</option>
            <option value="misuse">Misuse</option>
            <option value="delay">Delay</option>
          </select>
        </Field>
        <Field label="Severity">
          <select name="severity" defaultValue="medium" className={inputClass}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
      </div>
      <Field label="What happened?">
        <textarea name="description" rows={3} required minLength={10} className={inputClass} />
      </Field>
      <Button disabled={pending} variant="danger" className="w-full">
        {pending ? "Sending…" : "Send to manager"}
      </Button>
    </form>
  );
}
