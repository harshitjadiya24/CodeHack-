"use client";

import { useActionState, useState } from "react";
import { Button, inputClass } from "@/components/ui";
import { deleteAccountAction, type DeleteState } from "./actions";

/** Two steps on purpose: open the form, then type your email. Deleting can't be undone. */
export function DeleteAccount({ email }: { email: string }) {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccountAction, {});
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button type="button" variant="secondary" className="text-danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
    );
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="font-semibold">
          Type <span className="break-all font-mono">{email}</span> to confirm
        </span>
        <input name="confirmEmail" type="email" autoComplete="off" required className={`${inputClass} mt-1.5`} />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account for good"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Keep my account
        </Button>
      </div>
    </form>
  );
}
