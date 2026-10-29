import { createAdminClient } from "@/lib/supabase/admin";
import { toIcs } from "@/lib/domain/calendar";
import { CALENDAR_SELECT, CALENDAR_STATUSES, bookingEvent, icsResponse } from "@/lib/services/calendar";
import { userForCalendarToken } from "@/lib/services/operations";

/**
 * A person's bookings as a calendar feed. Calendar apps fetch it without signing in, so the secret token in the
 * URL is the only key; it maps to one person and can be replaced from their profile.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const userId = await userForCalendarToken(token.replace(/\.ics$/, ""));
  if (!userId) return new Response("Not found", { status: 404 });
  const { data } = await createAdminClient()
    .from("bookings")
    .select(CALENDAR_SELECT)
    .eq("user_id", userId)
    .in("status", [...CALENDAR_STATUSES])
    .gte("ends_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
    .order("starts_at");
  const origin = new URL(request.url).origin;
  const res = icsResponse(toIcs((data ?? []).map((b) => bookingEvent(b, origin)), { name: "Baanto" }), "baanto.ics");
  // Feeds are fetched, not downloaded, and calendar apps poll; keep it inline.
  res.headers.set("content-disposition", 'inline; filename="baanto.ics"');
  return res;
}
