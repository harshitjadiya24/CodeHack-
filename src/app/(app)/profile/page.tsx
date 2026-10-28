import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader, Pill } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/demo";
import { MAX_STRIKES } from "@/lib/domain/eligibility";
import { creditsUsedThisWeek } from "@/lib/domain/fairness";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingHistory } from "@/lib/services/context";

export const metadata: Metadata = { title: "Profile" };

const VISIBILITY = [
  ["Your name, roll number and department", "People at your institution, so owners and managers know who is asking"],
  ["Your bookings, photos and incidents", "You, the resource's owner, lab attendants and managers. Never other students"],
  ["Your certificate uploads", "Managers only, through links that expire after 10 minutes"],
  ["Your Passport QR page", "Anyone you show it to: name, roll number and current badges only"],
  ["Fair Draw results", "Public, by anonymous booking reference only"],
];

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: org }, { data: cfg }, history] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", user.org_id).single(),
    supabase.from("fairness_config").select("weekly_credits").eq("org_id", user.org_id).single(),
    bookingHistory(createAdminClient(), user.id),
  ]);
  const used = creditsUsedThisWeek(history, new Date());

  return (
    <>
      <PageHeader eyebrow={org?.name} title={user.full_name}>
        <a href="/profile/export" className="rounded-md border border-rule bg-card px-4 py-2 text-sm">
          Download my data (JSON)
        </a>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="space-y-3 p-5 text-sm">
          <p>
            <span className="text-muted">Role</span> · {ROLE_LABEL[user.role]}
          </p>
          <p>
            <span className="text-muted">Email</span> · {user.email}
          </p>
          {user.roll_no && (
            <p>
              <span className="text-muted">Roll number</span> · {user.roll_no}
            </p>
          )}
          <p className="flex items-center gap-2">
            <span className="text-muted">Identity</span> <Pill tone={user.verified ? "ok" : "warn"}>{user.verified ? "Verified by the admin office" : "Not verified yet"}</Pill>
          </p>
          <p>
            <span className="text-muted">Credits this week</span> · {Math.max(0, (cfg?.weekly_credits ?? 20) - used)} of {cfg?.weekly_credits ?? 20} left
          </p>
          <p>
            <span className="text-muted">Standing</span> · {user.strikes} of {MAX_STRIKES} strikes
          </p>
          <Link href="/passport" className="inline-block text-accent underline">
            Trust Passport →
          </Link>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-medium">Who can see what</h2>
          <dl className="space-y-3 text-sm">
            {VISIBILITY.map(([what, who]) => (
              <div key={what}>
                <dt className="font-medium text-ink">{what}</dt>
                <dd className="text-ink-2">{who}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">
            These rules are enforced by row-level security in the database, not just hidden in the interface.{" "}
            <Link href="/privacy" className="underline">
              Privacy notice
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}
