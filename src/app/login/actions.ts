"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { homeFor, type Role } from "@/lib/auth";
import { allow, clientIp, RATE_LIMITED } from "@/lib/rate-limit";

export type LoginState = { error?: string };

const credentials = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

/** Only same-site paths, so `next` can never redirect off Saajha. */
function safeNext(next: string | undefined, role: Role): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(role);
}

async function signIn(email: string, password: string, next?: string): Promise<LoginState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Email or password is incorrect." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
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

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
