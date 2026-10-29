import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toIcs } from "@/lib/domain/calendar";
import { CALENDAR_SELECT, CALENDAR_STATUSES, bookingEvent, icsResponse } from "@/lib/services/calendar";

/** One booking as an .ics file, read through RLS as the signed-in person. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings").select(CALENDAR_SELECT).eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!b) return new Response("Not found", { status: 404 });
  if (!(CALENDAR_STATUSES as readonly string[]).includes(b.status)) return new Response("This booking has no slot to add to a calendar.", { status: 409 });
  const ics = toIcs([bookingEvent(b, new URL(request.url).origin)], { name: "Baanto" });
  return icsResponse(ics, `baanto-${b.id.slice(0, 8)}.ics`);
}
