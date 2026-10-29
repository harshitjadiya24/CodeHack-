"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import {
  decideBadgeAction,
  decideEndorsementAction,
  decideIncidentAction,
  requestBadgeAction,
  requestEndorsementAction,
  revokeEndorsementAction,
  type GovState,
} from "@/app/(app)/manager/actions";

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

export function EndorsementRequestForm({ hostOrgId, hostName }: { hostOrgId: string; hostName: string }) {
  const [state, action, pending] = useActionState<GovState, FormData>(requestEndorsementAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="hostOrgId" value={hostOrgId} />
      <label className="block text-sm">
        <span className="font-semibold">What do you need {hostName} for?</span>
        <textarea
          name="purpose"
          rows={3}
          required
          minLength={10}
          maxLength={500}
          className={`${inputClass} mt-1.5`}
          placeholder="Final-year project: testing a motor driver on their oscilloscope, about 4 sessions this month."
        />
      </label>
      <Button disabled={pending} className="w-full">
        {pending ? "Sending…" : "Ask my institute to endorse me"}
      </Button>
      <p className="text-xs text-subtle">Your admin office decides. If they agree, {hostName} sees that your institute vouches for you.</p>
    </form>
  );
}

export function EndorsementDecisionForm({ endorsementId }: { endorsementId: string }) {
  const [state, action, pending] = useActionState<GovState, FormData>(decideEndorsementAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="endorsementId" value={endorsementId} />
      <label className="min-w-48 flex-1 text-sm">
        <span className="sr-only">Reason (shared with the student and the other campus)</span>
        <input name="reason" required minLength={5} placeholder="Reason, shared with both campuses" className={inputClass} />
      </label>
      <label className="text-sm">
        <span className="sr-only">How long</span>
        <select name="days" defaultValue="90" className={`${inputClass} w-auto`}>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="180">180 days</option>
        </select>
      </label>
      <Button name="decision" value="approve" disabled={pending}>
        Endorse
      </Button>
      <Button name="decision" value="decline" variant="ghost" disabled={pending} className="text-danger">
        Decline
      </Button>
    </form>
  );
}

export function EndorsementRevokeForm({ endorsementId }: { endorsementId: string }) {
  const [state, action, pending] = useActionState<GovState, FormData>(revokeEndorsementAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="endorsementId" value={endorsementId} />
      <label className="sr-only" htmlFor={`revoke-${endorsementId}`}>Reason for withdrawing</label>
      <input id={`revoke-${endorsementId}`} name="reason" required minLength={5} placeholder="Reason to withdraw" className={`${inputClass} min-w-40 flex-1`} />
      <Button variant="ghost" disabled={pending} className="text-danger">
        Withdraw
      </Button>
    </form>
  );
}
