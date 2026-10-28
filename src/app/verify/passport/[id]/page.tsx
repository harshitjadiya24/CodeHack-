import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampus } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Passport check", robots: { index: false } };

/** Public by design (scanned at the lab door), so it shows only name, roll number and live badges. */
export default async function PassportVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("full_name, roll_no, verified, org:organizations(name)").eq("id", id).maybeSingle();
  if (!p) notFound();
  const { data: badges } = await db
    .from("user_badges")
    .select("expires_at, badge:skill_badges(name)")
    .eq("user_id", id)
    .eq("status", "verified")
    .gt("expires_at", new Date().toISOString());

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="mb-2 text-center font-display text-2xl">Saajha</p>
      <Card className="p-6">
        <p className="text-sm text-muted">Trust Passport · live check</p>
        <h1 className="mt-1 font-display text-3xl">{p.full_name}</h1>
        <p className="text-sm text-muted">
          {p.roll_no} · {p.org?.name} · {p.verified ? "Identity verified" : "Identity NOT verified"}
        </p>
        <ul className="mt-5 space-y-2">
          {(badges ?? []).length === 0 && <li className="text-sm text-muted">No current badges.</li>}
          {(badges ?? []).map((b) => (
            <li key={b.badge?.name} className="flex items-center justify-between gap-2 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
              <span className="flex items-center gap-2">
                <BadgeCheck className="size-4" aria-hidden /> {b.badge?.name}
              </span>
              <span className="text-xs">until {formatCampus(b.expires_at!, { hour: undefined, minute: undefined, year: "numeric" })}</span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-muted">Checked {formatCampus(new Date())}. Badges are issued by a named manager and recorded in the audit chain.</p>
      </Card>
    </main>
  );
}
