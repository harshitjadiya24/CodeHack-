"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import type { GovState } from "@/app/(app)/manager/actions";
import { reviewInstituteAction } from "./actions";

/** One reason, then the decisions that make sense for the institute's current status. */
export function ReviewForm({ orgId, status }: { orgId: string; status: string }) {
  const [state, action, pending] = useActionState<GovState, FormData>(reviewInstituteAction, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <label className="sr-only" htmlFor={`reason-${orgId}`}>
        Reason (the institute sees it)
      </label>
      <input
        id={`reason-${orgId}`}
        name="reason"
        required
        minLength={5}
        placeholder={status === "suspended" ? "Why it can come back" : "What you checked, or what’s wrong"}
        className={`${inputClass} min-w-56 flex-1`}
      />
      {status === "suspended" ? (
        <Button name="decision" value="reactivate" disabled={pending}>
          Reactivate
        </Button>
      ) : (
        <>
          {status !== "active" && (
            <Button name="decision" value="approve" disabled={pending}>
              Approve
            </Button>
          )}
          <Button name="decision" value="suspend" variant="ghost" disabled={pending} className="text-danger">
            Suspend
          </Button>
        </>
      )}
    </form>
  );
}
