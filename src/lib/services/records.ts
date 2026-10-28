import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

type Db = ReturnType<typeof createAdminClient>;

/** Append to the tamper-evident audit chain. The DB trigger computes the hashes. */
export async function audit(
  db: Db,
  entry: { orgId: string | null; actorId: string | null; action: string; entity: string; entityId: string | null; reason?: string | null; payload?: Json },
) {
  const { error } = await db.from("audit_log").insert({
    org_id: entry.orgId,
    actor_id: entry.actorId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    reason: entry.reason ?? null,
    payload: entry.payload ?? {},
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

export async function notify(db: Db, n: { userId: string; kind: string; title: string; body?: string; link?: string }) {
  await db.from("notifications").insert({ user_id: n.userId, kind: n.kind, title: n.title, body: n.body ?? "", link: n.link ?? null });
}
