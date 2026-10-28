"use client";

import { useActionState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Campus email">
        <input name="email" type="email" autoComplete="email" required className={inputClass} placeholder="you@northfield.demo" />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
