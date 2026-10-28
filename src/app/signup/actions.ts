"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { allow, clientIp, RATE_LIMITED } from "@/lib/rate-limit";
import { registerAccount, signupSchema, type SignupInput } from "@/lib/services/accounts";

export type SignupState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof SignupInput, string>>;
  values?: Partial<Record<string, string>>;
};

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  // Kept so the form doesn't empty itself on an error. Never the password.
  const values = { fullName: raw.fullName, email: raw.email, orgId: raw.orgId, deptId: raw.deptId, rollNo: raw.rollNo, role: raw.role };

  // Bots fill every field; people never see this one.
  if (raw.website) return { error: "Something went wrong. Reload the page and try again.", values };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: SignupState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof SignupInput;
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors, values };
  }

  if (!(await allow("signup", await clientIp()))) return { error: RATE_LIMITED, values };

  const result = await registerAccount(parsed.data);
  if (!result.ok) return result.field ? { fieldErrors: { [result.field]: result.error }, values } : { error: result.error, values };
  // Sign the new account straight in.
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: result.email, password: parsed.data.password });
  redirect(error ? "/login?created=1" : "/passport?welcome=1");
}
