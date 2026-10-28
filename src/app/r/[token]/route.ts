import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * QR tag entry point. Scanning the sticker on a device takes the borrower straight to the
 * right step: check-in for today's approved slot, return while in use, otherwise the listing.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const db = createAdminClient();
  const { data: resource } = await db.from("resources").select("id").eq("qr_token", token).maybeSingle();
  if (!resource) return go("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return go(`/login?next=/r/${token}`);

  const now = Date.now();
  const { data: mine } = await db
    .from("bookings")
    .select("id, status, starts_at, ends_at")
    .eq("resource_id", resource.id)
    .eq("user_id", user.id)
    .in("status", ["approved", "checked_in", "overdue"])
    .gte("ends_at", new Date(now - 6 * 3_600_000).toISOString())
    .order("starts_at")
    .limit(1);
  const b = mine?.[0];
  if (b?.status === "checked_in" || b?.status === "overdue") return go(`/bookings/${b.id}/handover?phase=return`);
  if (b?.status === "approved" && new Date(b.starts_at).getTime() - now < 12 * 3_600_000) return go(`/bookings/${b.id}/handover?phase=check_in`);
  return go(`/resources/${resource.id}`);
}
