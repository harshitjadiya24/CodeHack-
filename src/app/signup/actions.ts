"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { confirmCode, registerAccount, resendCode, sessionTokenFor, signupSchema, type SignupInput } from "@/lib/services/accounts";

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

  const result = await registerAccount(parsed.data);
  if (!result.ok) return result.field ? { fieldErrors: { [result.field]: result.error }, values } : { error: result.error, values };
  redirect(`/signup/verify?email=${encodeURIComponent(result.email)}`);
}

export type CodeState = { error?: string; sent?: string };

export async function verifyEmail(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") ?? "");
  const result = await confirmCode(email, String(formData.get("code") ?? ""));
  if (!result.ok) return { error: result.error };

  // Turn the confirmed email straight into a session, so nobody has to type their password again.
  const token = await sessionTokenFor(result.email);
  if (token) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: "email", token_hash: token });
    if (!error) redirect("/passport?welcome=1");
  }
  redirect(`/login?created=1`);
}

export async function sendNewCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const result = await resendCode(String(formData.get("email") ?? ""));
  return result.ok ? { sent: "A new code is on its way. Check your inbox and spam folder." } : { error: result.error };
}
