"use client";

import { useActionState } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { sendNewCode, verifyEmail, type CodeState } from "../actions";

export function CodeForm({ email }: { email: string }) {
  const [state, verify, verifying] = useActionState<CodeState, FormData>(verifyEmail, {});
  const [resent, resend, resending] = useActionState<CodeState, FormData>(sendNewCode, {});

  return (
    <div className="space-y-5">
      <form action={verify} className="space-y-5">
        <input type="hidden" name="email" value={email} />
        <Field label="6-digit code" error={state.error}>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]*"
            maxLength={7}
            required
            autoFocus
            aria-invalid={!!state.error}
            className={cn(inputClass, "tab h-14 text-center text-3xl font-extrabold tracking-[0.4em]")}
          />
        </Field>
        <Button type="submit" disabled={verifying || !email} className="w-full">
          {verifying ? "Checking…" : "Confirm email"}
        </Button>
      </form>
      <form action={resend} className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
        <input type="hidden" name="email" value={email} />
        <span className="text-[15px] text-subtle">No email after a minute?</span>
        <Button type="submit" variant="ghost" disabled={resending || !email} className="min-h-10 px-3">
          {resending ? "Sending…" : "Send a new code"}
        </Button>
        {(resent.sent || resent.error) && (
          <p role="status" className={cn("w-full text-sm", resent.error ? "text-danger" : "text-ok")}>
            {resent.error ?? resent.sent}
          </p>
        )}
      </form>
    </div>
  );
}
