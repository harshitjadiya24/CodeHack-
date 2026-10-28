import type { Metadata } from "next";
import QRCode from "qrcode";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import { Card, PageHeader, Pill } from "@/components/ui";
import { BadgeRequestForm } from "@/components/governance-forms";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCampus } from "@/lib/domain/time";
import { MAX_STRIKES } from "@/lib/domain/eligibility";
import { siteOrigin } from "@/lib/site";

export const metadata: Metadata = { title: "Trust Passport" };

export default async function PassportPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: badges }, { data: mine }, { data: unlocks }] = await Promise.all([
    supabase.from("skill_badges").select("*").eq("org_id", user.org_id).order("name"),
    supabase.from("user_badges").select("*").eq("user_id", user.id),
    supabase.from("resource_requirements").select("badge_id, resource:resources(name)"),
  ]);

  const qrUrl = `${await siteOrigin()}/verify/passport/${user.id}`;
  const qrSvg = await QRCode.toString(qrUrl, { type: "svg", margin: 0, color: { dark: "#1d1b16", light: "#00000000" } });
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow="Your verified skills" title="Trust Passport" />

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <ul className="grid gap-4 sm:grid-cols-2">
          {(badges ?? []).map((badge) => {
            const held = mine?.find((m) => m.badge_id === badge.id);
            const expired = held?.expires_at ? new Date(held.expires_at) <= now : false;
            const state = !held ? "none" : held.status === "verified" && !expired ? "verified" : expired ? "expired" : held.status;
            const opens = (unlocks ?? []).filter((u) => u.badge_id === badge.id).map((u) => u.resource?.name).filter(Boolean);
            return (
              <li key={badge.id}>
                <Card className={`h-full p-5 ${state === "verified" ? "border-ok/40" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-medium">{badge.name}</h2>
                    {state === "verified" && (
                      <Pill tone="ok">
                        <BadgeCheck className="size-3" aria-hidden /> Verified
                      </Pill>
                    )}
                    {state === "pending" && (
                      <Pill tone="warn">
                        <Clock className="size-3" aria-hidden /> Under review
                      </Pill>
                    )}
                    {(state === "rejected" || state === "expired") && (
                      <Pill tone="danger">
                        <XCircle className="size-3" aria-hidden /> {state === "expired" ? "Expired" : "Not accepted"}
                      </Pill>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-2">{badge.description}</p>
                  {opens.length > 0 && <p className="mt-2 text-xs text-muted">Unlocks: {opens.join(", ")}</p>}
                  {state === "verified" && held?.expires_at && <p className="mt-2 text-xs text-ok">Valid until {formatCampus(held.expires_at, { hour: undefined, minute: undefined, year: "numeric" })}</p>}
                  {state === "rejected" && held?.note && <p className="mt-2 text-sm text-danger">Reviewer: {held.note}</p>}
                  {["none", "rejected", "expired"].includes(state) && <BadgeRequestForm badgeId={badge.id} />}
                </Card>
              </li>
            );
          })}
        </ul>

        <aside className="space-y-4">
          <Card className="p-5 text-center">
            <h2 className="font-medium">Show at the lab</h2>
            <p className="mb-4 text-sm text-muted">An attendant scans this to see your current badges. Nothing else about you is shown.</p>
            <div className="mx-auto w-44" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="mt-3 font-medium">{user.full_name}</p>
            <p className="text-xs text-muted">{user.roll_no}</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-medium">Standing</h2>
            <p className="mt-1 text-sm text-ink-2">
              {user.strikes} of {MAX_STRIKES} strikes. Strikes are only ever added by a manager after reviewing an incident, with a written reason.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
