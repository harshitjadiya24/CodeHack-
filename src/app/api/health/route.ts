import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** For uptime monitors: 200 when the app can reach its database, 503 when it can't. Says nothing else. */
export async function GET() {
  const started = Date.now();
  const { error } = await createAdminClient().from("organizations").select("id", { head: true, count: "exact" }).limit(1);
  const body = { ok: !error, db: error ? "unreachable" : "ok", ms: Date.now() - started };
  return Response.json(body, { status: error ? 503 : 200, headers: { "cache-control": "no-store" } });
}
