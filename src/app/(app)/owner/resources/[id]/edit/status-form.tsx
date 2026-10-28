"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import { setStatusAction, type StatusState } from "../../actions";

export function StatusForm({ resourceId, status }: { resourceId: string; status: string }) {
  const [state, action, pending] = useActionState<StatusState, FormData>(setStatusAction, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
  const toMaintenance = status === "active";
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="status" value={toMaintenance ? "maintenance" : "active"} />
      {toMaintenance && (
        <>
          <label className="sr-only" htmlFor="reason">Reason</label>
          <input id="reason" name="reason" required minLength={5} className={inputClass} placeholder="Nozzle replacement, back Friday" />
        </>
      )}
      <Button disabled={pending} variant={toMaintenance ? "danger" : "primary"} className="w-full">
        {pending ? "Saving…" : toMaintenance ? "Take out of service" : "Put back in service"}
      </Button>
    </form>
  );
}
