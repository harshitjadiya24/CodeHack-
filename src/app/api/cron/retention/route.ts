import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BATCH = 200;

/**
 * Daily (vercel.json): deletes handover photos a year after the handover, as the privacy notice promises.
 * The checklist and notes stay as the condition record; only the pictures go. Vercel sends CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorised", { status: 401 });

  const db = createAdminClient();
  const cutoff = new Date(Date.now() - 365 * 24 * 3_600_000).toISOString();
  const { data: old, error } = await db.from("handovers").select("id, photo_paths").lt("created_at", cutoff).filter("photo_paths", "neq", "{}").limit(BATCH);
  if (error) return Response.json({ ok: false }, { status: 500 });

  const paths = (old ?? []).flatMap((h) => h.photo_paths);
  if (paths.length) {
    const { error: removeError } = await db.storage.from("handovers").remove(paths);
    if (removeError) return Response.json({ ok: false }, { status: 500 });
    await db.from("handovers").update({ photo_paths: [] }).in("id", (old ?? []).map((h) => h.id));
  }
  return Response.json({ ok: true, handovers: old?.length ?? 0, photos: paths.length });
}
