"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui";
import { nudgeAction, type SimpleState } from "@/app/(app)/operations-actions";
import type { NudgeAction } from "@/lib/domain/forecast";

const LABEL: Record<NudgeAction, string> = {
  open_to_partners: "Open to partner campuses",
  instant_approval: "Turn on instant approval",
  normal_demand: "Drop the Fair Draw",
  fewer_credits: "Charge 1 credit an hour",
};

export function NudgeButton({ resourceId, action: nudge }: { resourceId: string; action: NudgeAction }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(nudgeAction, {});
  if (state.ok) return <span className="text-sm text-ok">{state.message}</span>;
  return (
    <form action={action} className="inline">
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="action" value={nudge} />
      <Button variant="secondary" disabled={pending} className="min-h-9 px-3.5 py-1 text-sm">
        {LABEL[nudge]}
      </Button>
      {state.error && <span className="ml-2 text-sm text-danger">{state.error}</span>}
    </form>
  );
}
