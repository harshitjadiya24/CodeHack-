"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import { groupDepartments } from "@/lib/departments";
import { signup, type SignupState } from "./actions";

type Campus = { id: string; name: string; city: string | null; state: string | null; verified: boolean; departments: { id: string; name: string; code: string }[] };

export function SignupForm({ campuses }: { campuses: Campus[] }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {});
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  const [orgId, setOrgId] = useState(v.orgId ?? "");
  const [stateFilter, setStateFilter] = useState("");
  const [query, setQuery] = useState("");
  const states = [...new Set(campuses.map((c) => c.state).filter((x): x is string => !!x))].sort();
  const needle = query.trim().toLowerCase();
  const matches = campuses.filter(
    (c) => (!stateFilter || c.state === stateFilter) && (!needle || `${c.name} ${c.city ?? ""}`.toLowerCase().includes(needle)),
  );
  const chosen = campuses.find((c) => c.id === orgId);
  const [showPassword, setShowPassword] = useState(false);
  const groups = groupDepartments(campuses.find((c) => c.id === orgId)?.departments ?? []);
  const errorId = (k: string) => (e[k as keyof typeof e] ? `${k}-error` : undefined);

  return (
    <form action={action} className="space-y-5" noValidate>
      {/* Honeypot: hidden from people and screen readers, filled in by bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field label="Full name" error={e.fullName}>
        <input name="fullName" autoComplete="name" required defaultValue={v.fullName} aria-invalid={!!e.fullName} aria-describedby={errorId("fullName")} className={inputClass} />
      </Field>

      <fieldset className="space-y-3 rounded-lg border border-rule p-4">
        <legend className="px-1 text-[15px] font-semibold text-ink">Your institute</legend>
        <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
          <label className="block">
            <span className="sr-only">State</span>
            <select value={stateFilter} onChange={(ev) => setStateFilter(ev.target.value)} className={inputClass}>
              <option value="">All states</option>
              {states.map((st) => (
                <option key={st}>{st}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Search by name or city</span>
            <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search by name or city" className={inputClass} />
          </label>
        </div>
        <Field label="Institute" error={e.orgId}>
          <select name="orgId" value={orgId} onChange={(ev) => setOrgId(ev.target.value)} required className={inputClass} aria-invalid={!!e.orgId}>
            <option value="" disabled>
              {matches.length ? `Choose from ${matches.length} ${matches.length === 1 ? "institute" : "institutes"}` : "No institute matches"}
            </option>
            {(chosen && !matches.includes(chosen) ? [chosen, ...matches] : matches).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.city ? `, ${c.city}` : ""}
                {c.verified ? "" : " (pending review)"}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-sm text-subtle">
          Not listed?{" "}
          <Link href="/institutions/new" className="font-semibold text-ink underline underline-offset-4">
            Ask your institute to register
          </Link>{" "}
          or register it yourself if you run its labs.
        </p>
      </fieldset>

      <div>
        <Field label="Department" error={e.deptId}>
          <select key={orgId} name="deptId" defaultValue={v.orgId === orgId ? v.deptId : ""} required disabled={!orgId} className={inputClass} aria-invalid={!!e.deptId}>
            <option value="" disabled>
              {orgId ? "Choose one" : "Choose your institute first"}
            </option>
            {groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Roll number" hint="As printed on your college ID." error={e.rollNo}>
          <input name="rollNo" required defaultValue={v.rollNo} autoCapitalize="characters" spellCheck={false} placeholder="NIT24CS012" aria-invalid={!!e.rollNo} className={cn(inputClass, "uppercase placeholder:normal-case")} />
        </Field>
        <fieldset>
          <legend className="text-[15px] font-semibold text-ink">I am a</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {(["student", "researcher"] as const).map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-rule bg-card px-3 text-[15px] has-[:checked]:border-ink has-[:checked]:font-semibold">
                <input type="radio" name="role" value={r} defaultChecked={(v.role ?? "student") === r} className="size-4 accent-[var(--ink)]" />
                {r === "student" ? "Student" : "Researcher"}
              </label>
            ))}
          </div>
          {e.role && <span className="mt-1.5 block text-sm text-danger">{e.role}</span>}
        </fieldset>
      </div>

      <Field label="Email" hint="Your college email if you have one. You’ll sign in with it." error={e.email}>
        <input name="email" type="email" autoComplete="email" required defaultValue={v.email} aria-invalid={!!e.email} className={inputClass} />
      </Field>

      <Field label="Password" hint="At least 8 characters, with a letter and a number." error={e.password}>
        <span className="relative block">
          <input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} aria-invalid={!!e.password} className={cn(inputClass, "pr-12")} />
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
          I agree to the{" "}
          <Link href="/privacy" className="font-semibold text-ink underline underline-offset-4" target="_blank">
            privacy notice
          </Link>
          . My name, roll number and booking history are shared only with my campus.
        </span>
      </label>
      {e.consent && <p className="-mt-3 text-sm text-danger">{e.consent}</p>}

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2.5 text-[15px] text-danger">
          {state.error}
        </p>
      )}
      {!!Object.keys(e).length && (
        <p role="alert" className="sr-only">
          Some fields need attention: {Object.values(e).join(" ")}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating your account…" : "Create account"}
      </Button>
    </form>
  );
}
