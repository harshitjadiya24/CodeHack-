"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, inputClass } from "@/components/ui";
import { useTranslations } from "next-intl";
import { setRoleAction, type GovState } from "@/app/(app)/manager/actions";
import type { Role } from "@/lib/auth";

const ROLES: Role[] = ["student", "researcher", "owner", "attendant", "manager", "admin"];

/** The admin office builds its team here: lab in-charges become owners, lab staff become attendants. */
export function RoleForm({ userId, role }: { userId: string; role: Role }) {
  const [state, action, pending] = useActionState<GovState, FormData>(setRoleAction, {});
  const t = useTranslations("People");
  const roles = useTranslations("Shell.roles");
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        {t("role")}
      </label>
      <select id={`role-${userId}`} name="role" defaultValue={role} className={`${inputClass} w-36 py-1 text-sm`}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {roles(r)}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor={`role-reason-${userId}`}>
        {t("reason")}
      </label>
      <input id={`role-reason-${userId}`} name="reason" required minLength={5} className={`${inputClass} py-1 text-sm`} placeholder={t("roleReason")} />
      <Button disabled={pending} variant="secondary" className="px-3 text-sm">
        {t("change")}
      </Button>
    </form>
  );
}
