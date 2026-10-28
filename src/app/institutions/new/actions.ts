"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { allow, clientIp, RATE_LIMITED } from "@/lib/rate-limit";
import { institutionSchema, registerInstitution, type InstitutionInput } from "@/lib/services/institutions";

export type InstitutionState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof InstitutionInput, string>>;
  values?: Partial<Record<string, string>>;
};

export async function registerInstitutionAction(_prev: InstitutionState, formData: FormData): Promise<InstitutionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const { password: _password, ...rest } = raw;
  void _password;
  const values = rest; // never echo the password back

  if (raw.website_confirm) return { error: "Something went wrong. Reload the page and try again.", values };

  const parsed = institutionSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: InstitutionState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as keyof InstitutionInput] ??= issue.message;
    return { fieldErrors, values };
  }

  if (!(await allow("institution", await clientIp()))) return { error: RATE_LIMITED, values };

  const result = await registerInstitution(parsed.data);
  if (!result.ok) return result.field ? { fieldErrors: { [result.field]: result.error }, values } : { error: result.error, values };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: result.email, password: parsed.data.password });
  redirect(error ? "/login?created=1" : "/admin?welcome=1");
}
