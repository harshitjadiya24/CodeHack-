"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { INDIAN_STATES, INSTITUTE_KINDS } from "@/lib/india";
import { registerInstitutionAction, type InstitutionState } from "./actions";

export function InstitutionForm() {
  const [state, action, pending] = useActionState<InstitutionState, FormData>(registerInstitutionAction, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-8" noValidate>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave empty
          <input name="website_confirm" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <fieldset className="space-y-5">
        <legend className="type-h3 mb-1">The institute</legend>
        <Field label="Full name" hint="As it appears on official letters." error={e.name}>
          <input name="name" required defaultValue={v.name} aria-invalid={!!e.name} className={inputClass} placeholder="Government College of Engineering, Amravati" />
        </Field>
        <Field label="Type" error={e.kind}>
          <select name="kind" defaultValue={v.kind ?? "engineering"} className={inputClass} aria-invalid={!!e.kind}>
            {Object.entries(INSTITUTE_KINDS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="State or union territory" error={e.state}>
            <select name="state" defaultValue={v.state ?? ""} required className={inputClass} aria-invalid={!!e.state}>
              <option value="" disabled>
                Choose one
              </option>
              {INDIAN_STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="City or town" error={e.city}>
            <input name="city" required defaultValue={v.city} aria-invalid={!!e.city} className={inputClass} autoComplete="address-level2" />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Website" hint="Helps us confirm the institute is real." error={e.website}>
            <input name="website" required defaultValue={v.website} aria-invalid={!!e.website} className={inputClass} inputMode="url" placeholder="gcoea.ac.in" spellCheck={false} />
          </Field>
          <Field label="AISHE code (optional)" hint="From aishe.gov.in, like C-12345." error={e.aisheCode}>
            <input name="aisheCode" defaultValue={v.aisheCode} aria-invalid={!!e.aisheCode} className={cn(inputClass, "uppercase placeholder:normal-case")} spellCheck={false} placeholder="C-12345" />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-rule pt-8">
        <legend className="type-h3 mb-1">You, the admin office</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your full name" error={e.adminName}>
            <input name="adminName" required defaultValue={v.adminName} aria-invalid={!!e.adminName} className={inputClass} autoComplete="name" />
          </Field>
          <Field label="Your role" error={e.designation}>
            <input name="designation" required defaultValue={v.designation} aria-invalid={!!e.designation} className={inputClass} placeholder="Registrar, Dean R&D, Lab In-charge" />
          </Field>
        </div>
        <Field label="Official email" hint="Use your email on the institute’s domain if you have one. It makes the review quicker." error={e.email}>
          <input name="email" type="email" required defaultValue={v.email} aria-invalid={!!e.email} className={inputClass} autoComplete="email" />
        </Field>
        <Field label="Password" hint="At least 8 characters, with a letter and a number." error={e.password}>
          <span className="relative block">
            <input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required aria-invalid={!!e.password} className={cn(inputClass, "pr-12")} />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-subtle hover:text-ink"
            >
              {showPassword ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
            </button>
          </span>
        </Field>
        <label className="flex cursor-pointer gap-3 text-[15px] text-ink-2">
          <input type="checkbox" name="consent" className="mt-1 size-4 shrink-0 accent-[var(--ink)]" aria-invalid={!!e.consent} />
          <span>
            I am authorised to register this institute, and I agree to the{" "}
            <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4" target="_blank">
              privacy notice
            </Link>
            .
          </span>
        </label>
        {e.consent && <p className="-mt-3 text-sm text-danger">{e.consent}</p>}
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-[15px] text-danger">
          {state.error}
        </p>
      )}
      {!!Object.keys(e).length && (
        <p role="alert" className="sr-only">
          Some fields need attention: {Object.values(e).join(" ")}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Registering…" : "Register the institute"}
      </Button>
    </form>
  );
}
