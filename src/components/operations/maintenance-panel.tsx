"use client";

import { useActionState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { cancelMaintenanceAction, maintenanceAction, type SimpleState } from "@/app/(app)/operations-actions";

export function MaintenanceForm({ resourceId, today }: { resourceId: string; today: string }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(maintenanceAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="resourceId" value={resourceId} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="From">
          <input type="date" name="fromDate" min={today} defaultValue={today} required className={inputClass} />
        </Field>
        <Field label="at">
          <input type="time" name="fromTime" defaultValue="09:00" required className={inputClass} />
        </Field>
        <Field label="Until">
          <input type="date" name="toDate" min={today} defaultValue={today} required className={inputClass} />
        </Field>
        <Field label="at">
          <input type="time" name="toTime" defaultValue="18:00" required className={inputClass} />
        </Field>
      </div>
      <Field label="What’s being done" hint="Borrowers see this.">
        <input name="reason" required minLength={5} maxLength={300} placeholder="Annual servicing by the vendor" className={inputClass} />
      </Field>
      <Button variant="secondary" disabled={pending} className="w-full">
        {pending ? "Planning…" : "Plan maintenance"}
      </Button>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-ok">{state.message}</p>}
    </form>
  );
}

export function CancelMaintenance({ windowId }: { windowId: string }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(cancelMaintenanceAction, {});
  if (state.ok) return <span className="text-xs text-ok">Removed</span>;
  return (
    <form action={action}>
      <input type="hidden" name="windowId" value={windowId} />
      <button disabled={pending} className="text-xs text-danger underline">
        Remove
      </button>
    </form>
  );
}
