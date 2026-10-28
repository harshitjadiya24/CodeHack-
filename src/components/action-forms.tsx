"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import { cancelAction, decideAction, runDrawAction, type ActionState } from "@/app/(app)/bookings/[id]/actions";

function useToast(state: ActionState) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}

export function CancelForm({ bookingId, needsReason }: { bookingId: string; needsReason: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelAction, {});
  const [open, setOpen] = useState(false);
  useToast(state);
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        Cancel booking
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="block text-sm">
        <span className="font-medium">Reason {needsReason ? "(shared with the requester)" : "(optional)"}</span>
        <input name="reason" required={needsReason} className={`${inputClass} mt-1`} placeholder="Plans changed" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending} className="flex-1">
          {pending ? "Cancelling…" : "Confirm cancel"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Keep
        </Button>
      </div>
    </form>
  );
}

export function DecisionForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(decideAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="sr-only" htmlFor={`reason-${bookingId}`}>Reason</label>
      <input
        id={`reason-${bookingId}`}
        name="reason"
        className={inputClass}
        placeholder="Reason (required to decline or waitlist)"
      />
      <div className="flex flex-wrap gap-2">
        <Button name="decision" value="approve" disabled={pending}>
          Approve
        </Button>
        <Button name="decision" value="waitlist" variant="secondary" disabled={pending}>
          Waitlist
        </Button>
        <Button name="decision" value="reject" variant="ghost" disabled={pending} className="text-danger">
          Decline
        </Button>
      </div>
    </form>
  );
}

export function RunDrawForm({ drawId, entrants }: { drawId: string; entrants: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(runDrawAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="drawId" value={drawId} />
      <Button disabled={pending} className="bg-saffron">
        {pending ? "Drawing…" : `Run Fair Draw (${entrants} entrants)`}
      </Button>
    </form>
  );
}
