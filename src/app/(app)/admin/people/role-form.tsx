"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/demo";
import { setRoleAction, type GovState } from "@/app/(app)/manager/actions";
import type { Role } from "@/lib/auth";

const ROLES: Role[] = ["student", "researcher", "owner", "attendant", "manager", "admin"];

/** The admin office builds its team here: lab in-charges become owners, lab staff become attendants. */
export function RoleForm({ userId, role }: { userId: string; role: Role }) {
  const [state, action, pending] = useActionState<GovState, FormData>(setRoleAction, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Role
      </label>
      <select id={`role-${userId}`} name="role" defaultValue={role} className={`${inputClass} w-36 py-1 text-sm`}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`role-reason-${userId}`}>
        Reason
      </label>
      <input id={`role-reason-${userId}`} name="reason" required minLength={5} className={`${inputClass} py-1 text-sm`} placeholder="Why? e.g. In-charge of the PCB lab" />
      <Button disabled={pending} variant="secondary" className="px-3 text-sm">
        Change
      </Button>
    </form>
  );
}
