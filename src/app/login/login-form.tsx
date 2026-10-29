"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button, Field, inputClass } from "@/components/ui";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const t = useTranslations("Login");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label={t("email")}>
        <input name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@college.ac.in" />
      </Field>
      <Field label={t("password")}>
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
