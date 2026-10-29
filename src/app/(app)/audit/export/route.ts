import { NextResponse } from "next/server";
import { getCurrentUser, STAFF_ROLES } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const csvCell = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) return new NextResponse("Forbidden", { status: 403 });
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, created_at, action, entity, entity_id, actor_id, reason, prev_hash, hash")
    .order("id");
  const header = ["id", "created_at", "action", "entity", "entity_id", "actor_id", "reason", "prev_hash", "hash"];
  const lines = [header.join(","), ...(data ?? []).map((r) => header.map((h) => csvCell(r[h as keyof typeof r])).join(","))];
  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="baanto-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
