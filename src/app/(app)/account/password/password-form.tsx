"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, inputClass } from "@/components/ui";
import { changePassword, type PasswordState } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  const t = useTranslations("Login");
  return (
    <form action={action} className="space-y-4">
      <Field label={t("newPassword")} hint={t("newHint")}>
        <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} />
      </Field>
      <Field label={t("confirmPassword")}>
        <input name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button disabled={pending} className="w-full">
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
