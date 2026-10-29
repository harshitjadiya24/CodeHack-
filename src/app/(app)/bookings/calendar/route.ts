import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toIcs } from "@/lib/domain/calendar";
import { CALENDAR_SELECT, CALENDAR_STATUSES, bookingEvent, icsResponse } from "@/lib/services/calendar";

/** Every upcoming booking of the signed-in person in one .ics file. Importing it again updates the same events. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select(CALENDAR_SELECT)
    .eq("user_id", user.id)
    .in("status", [...CALENDAR_STATUSES])
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  const origin = new URL(request.url).origin;
  return icsResponse(toIcs((data ?? []).map((b) => bookingEvent(b, origin)), { name: "My Baanto bookings" }), "baanto-bookings.ics");
}
