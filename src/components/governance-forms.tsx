"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import { decideBadgeAction, decideIncidentAction, requestBadgeAction, type GovState } from "@/app/(app)/manager/actions";

function useToast(state: GovState) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}

export function BadgeDecisionForm({ userBadgeId }: { userBadgeId: string }) {
  const [state, action, pending] = useActionState<GovState, FormData>(decideBadgeAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="userBadgeId" value={userBadgeId} />
      <label className="sr-only" htmlFor={`note-${userBadgeId}`}>Note</label>
      <input id={`note-${userBadgeId}`} name="note" placeholder="Note (required to reject)" className={`${inputClass} min-w-48 flex-1`} />
      <Button name="decision" value="approve" disabled={pending}>
        Verify & issue
      </Button>
      <Button name="decision" value="reject" variant="ghost" disabled={pending} className="text-danger">
        Reject
      </Button>
    </form>
  );
}

export function IncidentDecisionForm({ incidentId, proposed }: { incidentId: string; proposed?: string | null }) {
  const [state, action, pending] = useActionState<GovState, FormData>(decideIncidentAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="incidentId" value={incidentId} />
      <label className="block text-sm">
        <span className="font-medium">Your decision (shared with the borrower)</span>
        <textarea name="decision" rows={2} required minLength={10} defaultValue={proposed ?? ""} className={`${inputClass} mt-1`} placeholder="Scratch is cosmetic. Plate resurfaced from the maintenance fund; warning recorded." />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="strike" className="accent-[var(--danger)]" /> Record a strike (3 strikes pause booking)
      </label>
      <Button disabled={pending} className="w-full">
        {pending ? "Saving…" : "Record decision"}
      </Button>
    </form>
  );
}

export function BadgeRequestForm({ badgeId }: { badgeId: string }) {
  const [state, action, pending] = useActionState<GovState, FormData>(requestBadgeAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="mt-3 space-y-2">
      <input type="hidden" name="badgeId" value={badgeId} />
      <label className="block text-sm">
        <span className="font-medium">Certificate or attendance slip</span>
        <input type="file" name="evidence" accept="image/*,application/pdf" required className="mt-1 block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-accent" />
      </label>
      <input name="note" placeholder="e.g. Attended induction batch 9 on 21 Oct" className={inputClass} />
      <Button disabled={pending} variant="secondary" className="w-full">
        {pending ? "Uploading…" : "Request verification"}
      </Button>
    </form>
  );
}
