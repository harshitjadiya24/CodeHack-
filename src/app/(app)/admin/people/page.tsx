import type { Metadata } from "next";
import { Card, PageHeader, Pill } from "@/components/ui";
import { requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROLE_LABEL } from "@/lib/demo";
import { VerifyUserForm } from "./verify-form";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const admin = await requirePageRole(["admin"]);
  const db = createAdminClient();
  const [{ data: people }, { data: badges }] = await Promise.all([
    db.from("profiles").select("id, full_name, roll_no, role, verified, strikes, dept:departments(code)").eq("org_id", admin.org_id).order("role").order("full_name"),
    db.from("user_badges").select("user_id, status, expires_at").eq("status", "verified"),
  ]);
  const now = new Date();
  const live = new Map<string, number>();
  for (const b of badges ?? []) if (!b.expires_at || new Date(b.expires_at) > now) live.set(b.user_id, (live.get(b.user_id) ?? 0) + 1);

  return (
    <>
      <PageHeader eyebrow="Identity and standing" title="People" />
      <p className="-mt-4 mb-6 max-w-2xl text-ink-2">
        Unverified accounts can browse but cannot request anything. Every change here needs a reason and is written to the audit chain.
      </p>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-rule text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-2 font-normal">Name</th>
              <th className="px-4 py-2 font-normal">Role</th>
              <th className="px-4 py-2 font-normal">Badges</th>
              <th className="px-4 py-2 font-normal">Strikes</th>
              <th className="px-4 py-2 font-normal">Identity</th>
              <th className="px-4 py-2 font-normal">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {(people ?? []).map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-2">
                  {p.full_name}
                  <span className="block text-xs text-muted">
                    {p.roll_no ?? "Staff"} {p.dept?.code && `· ${p.dept.code}`}
                  </span>
                </td>
                <td className="px-4 py-2 text-ink-2">{ROLE_LABEL[p.role]}</td>
                <td className="px-4 py-2 font-mono">{live.get(p.id) ?? 0}</td>
                <td className="px-4 py-2 font-mono">{p.strikes}</td>
                <td className="px-4 py-2">
                  <Pill tone={p.verified ? "ok" : "warn"}>{p.verified ? "Verified" : "Unverified"}</Pill>
                </td>
                <td className="px-4 py-2">{p.id !== admin.id && <VerifyUserForm userId={p.id} verified={p.verified} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
