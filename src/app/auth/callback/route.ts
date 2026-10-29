import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Google sends people back here. New people finish sign-up with their campus details; everyone else goes home. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  if (!code) return NextResponse.redirect(new URL("/login", url.origin));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?oauth=failed", url.origin));

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", data.user.id).maybeSingle();
  return NextResponse.redirect(new URL(profile ? (safeNext ?? "/") : "/signup/complete", url.origin));
}
