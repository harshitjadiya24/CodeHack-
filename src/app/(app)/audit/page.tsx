import type { Metadata } from "next";
import Link from "next/link";
import { Card, Mono, PageHeader, inputClass } from "@/components/ui";
import { STAFF_ROLES, requirePageRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACTION_LABEL } from "@/lib/status";
import { formatCampus } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  await requirePageRole(STAFF_ROLES);
  const { action = "" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, reason, created_at, hash, prev_hash, actor:profiles!audit_log_actor_id_fkey(full_name)")
    .order("id", { ascending: false })
    .limit(200);
  if (action) query = query.like("action", `${action}%`);
  const { data: rows } = await query;

  const groups = ["booking", "handover", "incident", "badge", "draw"];

  return (
    <>
      <PageHeader eyebrow="Append-only · SHA-256 hash chain" title="Audit log">
        <Link href="/audit/verify" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-ink">
          Verify chain integrity
        </Link>
        <a href="/audit/export" className="rounded-xl border border-rule bg-card px-4 py-2 text-sm">
          Export CSV
        </a>
      </PageHeader>

      <form className="mb-4 flex gap-2">
        <label className="sr-only" htmlFor="action">Filter</label>
        <select id="action" name="action" defaultValue={action} className={`${inputClass} max-w-xs`}>
          <option value="">All actions</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g[0].toUpperCase() + g.slice(1)} actions
            </option>
          ))}
        </select>
        <button className="rounded-xl bg-ink px-4 py-2 text-sm text-paper">Filter</button>
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-rule text-left text-xs text-subtle">
            <tr>
              <th className="px-4 py-2 font-normal">#</th>
              <th className="px-4 py-2 font-normal">When</th>
              <th className="px-4 py-2 font-normal">Action</th>
              <th className="px-4 py-2 font-normal">By</th>
              <th className="px-4 py-2 font-normal">Reason</th>
              <th className="px-4 py-2 font-normal">Hash ← prev</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-2 font-mono text-xs text-subtle">{r.id}</td>
                <td className="whitespace-nowrap px-4 py-2 text-ink-2">{formatCampus(r.created_at)}</td>
                <td className="px-4 py-2">
                  {r.entity === "booking" && r.entity_id ? (
                    <Link href={`/bookings/${r.entity_id}`} className="text-accent hover:underline">
                      {ACTION_LABEL[r.action] ?? r.action}
                    </Link>
                  ) : r.entity === "draw" && r.entity_id ? (
                    <Link href={`/verify/draw/${r.entity_id}`} className="text-accent hover:underline">
                      {r.action}
                    </Link>
                  ) : (
                    (ACTION_LABEL[r.action] ?? r.action)
                  )}
                </td>
                <td className="px-4 py-2 text-ink-2">{r.actor?.full_name ?? "Automatic rule"}</td>
                <td className="max-w-xs px-4 py-2 text-ink-2">{r.reason}</td>
                <td className="px-4 py-2">
                  <Mono title={r.hash}>{r.hash.slice(0, 10)}</Mono>
                  <Mono className="block opacity-60" title={r.prev_hash}>
                    ← {r.prev_hash.slice(0, 10)}
                  </Mono>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
