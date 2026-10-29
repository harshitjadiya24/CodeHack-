"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { homeFor, type Role } from "@/lib/auth";
import { allow, clientIp, RATE_LIMITED } from "@/lib/rate-limit";
import { getTranslations } from "next-intl/server";
import { siteOrigin } from "@/lib/site";

// `unconfirmed`: the email exists but its confirmation link was never opened, so offer to send it again.
export type LoginState = { error?: string; unconfirmed?: string; message?: string };

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

/** Only same-site paths, so `next` can never redirect off Baanto. */
function safeNext(next: string | undefined, role: Role): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(role);
}

async function signIn(email: string, password: string, next?: string): Promise<LoginState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  const t = await getTranslations("Login");
  if (error?.code === "email_not_confirmed") return { error: t("unconfirmed"), unconfirmed: email };
  if (error || !data.user) return { error: t("wrong") };
  const { data: profile } = await supabase.from("profiles").select("role, org:organizations(status)").eq("id", data.user.id).single();
  if (profile?.org?.status === "suspended") {
    await supabase.auth.signOut();
    return { error: "Your institute’s account is paused by the Baanto team. Ask your admin office, or write to the Baanto team." };
  }
  redirect(safeNext(next, profile?.role ?? "student"));
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // Demo buttons skip this: judges in one hall share an IP and click them a lot.
  if (!(await allow("login-ip", await clientIp())) || !(await allow("login-email", parsed.data.email))) return { error: RATE_LIMITED };
  return signIn(parsed.data.email, parsed.data.password, parsed.data.next);
}

export async function loginAsDemo(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  if (!DEMO_ACCOUNTS.some((a) => a.email === email)) return;
  await signIn(email, DEMO_PASSWORD);
}

const emailOnly = z.object({ email: z.string().trim().email("Enter a valid email.") });

/** Sends the confirmation link again. Answers the same whether or not the email exists. */
export async function resendConfirmation(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailOnly.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const t = await getTranslations("Login");
  if (!(await allow("resend-email", parsed.data.email))) return { error: RATE_LIMITED };
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: { emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/passport?welcome=1` } });
  return { message: t("resent") };
}

/** Emails a reset link. Never says whether the account exists, so it can't be used to find out who has one. */
export async function requestReset(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailOnly.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const t = await getTranslations("Login");
  if (!(await allow("reset-ip", await clientIp())) || !(await allow("reset-email", parsed.data.email))) return { error: RATE_LIMITED };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${await siteOrigin()}/account/password` });
  if (error) console.error("[auth] reset email failed:", error.message);
  return { message: t("resetSent") };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
