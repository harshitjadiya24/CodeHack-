"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, inputClass } from "@/components/ui";
import { requestReset, type LoginState } from "../actions";

export function ForgotForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(requestReset, {});
  const t = useTranslations("Login");
  if (state.message)
    return (
      <p role="status" className="text-[15px] text-ok">
        {state.message}
      </p>
    );
  return (
    <form action={action} className="space-y-4">
      <Field label={t("email")}>
        <input name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@college.ac.in" />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button disabled={pending} className="w-full">
        {pending ? t("sending") : t("sendLink")}
      </Button>
    </form>
  );
}
