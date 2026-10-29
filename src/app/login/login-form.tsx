"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Field, inputClass } from "@/components/ui";
import { login, resendConfirmation, type LoginState } from "./actions";

/** `emailLinks`: Baanto can send email (confirmation and reset links), so offer them. */
export function LoginForm({ next, emailLinks = false }: { next?: string; emailLinks?: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const t = useTranslations("Login");
  return (
    <div className="space-y-3">
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
      {state.unconfirmed && <ResendLink email={state.unconfirmed} />}
      {emailLinks && (
        <p className="text-center text-[15px]">
          <Link href="/login/forgot" className="text-subtle underline-offset-2 hover:text-ink hover:underline">
            {t("forgot")}
          </Link>
        </p>
      )}
    </div>
  );
}

function ResendLink({ email }: { email: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(resendConfirmation, {});
  const t = useTranslations("Login");
  if (state.message)
    return (
      <p role="status" className="text-sm text-ok">
        {state.message}
      </p>
    );
  return (
    <form action={action}>
      <input type="hidden" name="email" value={email} />
      <Button variant="secondary" disabled={pending} className="w-full">
        {pending ? t("sending") : t("resend")}
      </Button>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
    </form>
  );
}
