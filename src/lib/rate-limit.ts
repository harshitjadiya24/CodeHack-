import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

// Limits are per IP (and per email for sign-in), counted in Postgres so every server instance agrees.
// Generous on purpose: a hackathon hall or a college hostel shares one IP.
const LIMITS = {
  signup: { max: 20, windowSeconds: 3600 },
  institution: { max: 5, windowSeconds: 3600 },
  "login-ip": { max: 60, windowSeconds: 600 },
  "login-email": { max: 10, windowSeconds: 600 },
} as const;

export type Bucket = keyof typeof LIMITS;

export const RATE_LIMITED = "Too many attempts from here. Wait a few minutes and try again.";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Counts one attempt. False means stop. If the counter itself fails, let the person through rather than lock everyone out. */
export async function allow(bucket: Bucket, subject: string): Promise<boolean> {
  const { max, windowSeconds } = LIMITS[bucket];
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: `${bucket}:${subject.toLowerCase()}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data;
}
