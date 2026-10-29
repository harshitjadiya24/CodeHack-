"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button, inputClass } from "@/components/ui";
import { verifyUserAction, type GovState } from "@/app/(app)/manager/actions";

export function VerifyUserForm({ userId, verified }: { userId: string; verified: boolean }) {
  const [state, action, pending] = useActionState<GovState, FormData>(verifyUserAction, {});
  const t = useTranslations("People");
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
  if (state.ok) return <span className="text-xs text-ok">{t("saved")}</span>;
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="verified" value={String(!verified)} />
      <label className="sr-only" htmlFor={`r-${userId}`}>
        {t("reason")}
      </label>
      <input id={`r-${userId}`} name="reason" required minLength={5} className={`${inputClass} py-1 text-xs`} placeholder={verified ? t("whyPause") : t("checked")} />
      <Button disabled={pending} variant={verified ? "ghost" : "primary"} className="px-3 py-1 text-xs">
        {verified ? t("unverify") : t("verify")}
      </Button>
    </form>
  );
}
