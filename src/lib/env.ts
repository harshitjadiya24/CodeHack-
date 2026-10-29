import { z } from "zod";

// Checked once when the server starts, so a missing key fails the deploy loudly instead of one page at a time.
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be your Supabase project URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing").min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing"),
  SUPABASE_SECRET_KEY: z.string("SUPABASE_SECRET_KEY is missing").min(1, "SUPABASE_SECRET_KEY is missing"),
  NEXT_PUBLIC_SITE_URL: z.url("NEXT_PUBLIC_SITE_URL must be the full https:// address people use").optional(),
});

export type EnvReport = { errors: string[]; warnings: string[] };

export function checkEnv(env: Record<string, string | undefined>): EnvReport {
  const parsed = schema.safeParse(env);
  const errors = parsed.success ? [] : parsed.error.issues.map((i) => i.message);
  const warnings: string[] = [];
  const live = env.VERCEL_ENV === "production";
  if (live && env.NEXT_PUBLIC_DEMO_MODE === "1") warnings.push("NEXT_PUBLIC_DEMO_MODE=1 lets anyone check in at any time. Turn it off for real users.");
  if (live && !env.NEXT_PUBLIC_SITE_URL) warnings.push("Set NEXT_PUBLIC_SITE_URL so emails and calendar links point at the real address.");
  if (live && !env.NEXT_PUBLIC_SENTRY_DSN) warnings.push("NEXT_PUBLIC_SENTRY_DSN is not set, so errors in production go unreported.");
  if (live && !env.NEXT_PUBLIC_GRIEVANCE_EMAIL) warnings.push("NEXT_PUBLIC_GRIEVANCE_EMAIL is not set. The DPDP Act needs a published grievance contact.");
  return { errors, warnings };
}
