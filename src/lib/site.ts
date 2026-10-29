import "server-only";
import { headers } from "next/headers";

/** Absolute origin people use, for QR codes, PDFs, email links and calendar feeds. NEXT_PUBLIC_SITE_URL wins when set. */
export async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * New accounts confirm their email before signing in. Off until Supabase sends mail through a verified domain
 * (see README, "Email"); until then accounts work at once, and borrowing still waits for the admin office.
 */
export const emailConfirmation = () => process.env.EMAIL_CONFIRMATION === "1";
