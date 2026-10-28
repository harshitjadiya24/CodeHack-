import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Everything Saajha holds about the signed-in person, read through RLS as that person. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorised", { status: 401 });
  const supabase = await createClient();
  const [bookings, badges, incidents, notifications] = await Promise.all([
    supabase.from("bookings").select("id, resource_id, starts_at, ends_at, status, purpose, credits, decision_receipt").eq("user_id", user.id),
    supabase.from("user_badges").select("badge_id, status, issued_at, expires_at, note").eq("user_id", user.id),
    supabase.from("incidents").select("id, booking_id, type, severity, status, description, borrower_response, decision"),
    supabase.from("notifications").select("kind, title, body, created_at").eq("user_id", user.id),
  ]);
  const body = {
    exported_at: new Date().toISOString(),
    profile: { id: user.id, full_name: user.full_name, email: user.email, roll_no: user.roll_no, role: user.role, verified: user.verified, strikes: user.strikes },
    bookings: bookings.data,
    badges: badges.data,
    incidents: incidents.data,
    notifications: notifications.data,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="my-saajha-data.json"' },
  });
}
