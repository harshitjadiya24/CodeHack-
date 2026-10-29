import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader, Pill } from "@/components/ui";
import { OWNER_ROLES, requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ListingForm } from "../../new/listing-form";
import { StatusForm } from "./status-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(OWNER_ROLES);
  const db = createAdminClient();
  const { data: r } = await db.from("resources").select("*").eq("id", id).maybeSingle();
  if (!r || r.org_id !== user.org_id || (user.role === "owner" && r.owner_id !== user.id)) notFound();
  const [{ data: badges }, { data: reqs }, { data: org }] = await Promise.all([
    db.from("skill_badges").select("id, name").eq("org_id", user.org_id).order("name"),
    db.from("resource_requirements").select("badge_id").eq("resource_id", id),
    db.from("organizations").select("lat, lng").eq("id", user.org_id).single(),
  ]);

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <PageHeader eyebrow="Owner · you stay in control" title={`Edit ${r.name}`} />
        <ListingForm
          resourceId={r.id}
          badges={badges ?? []}
          campus={org?.lat != null && org.lng != null ? { lat: org.lat, lng: org.lng } : null}
          draft={{
            name: r.name,
            category: r.category,
            kind: r.kind,
            location: r.location,
            description: r.description,
            rules: r.rules,
            demand: r.demand,
            maxHours: r.max_hours,
            creditRate: r.credit_rate,
            depositInr: r.deposit_inr,
            rentalValue: r.rental_value_inr_per_hour,
            requiresSupervision: r.requires_supervision,
            autoApprove: r.auto_approve,
            checklist: ((r.checklist as string[]) ?? []).join("\n"),
            photoSlots: ((r.photo_slots as string[]) ?? []).join("\n"),
            badgeIds: (reqs ?? []).map((x) => x.badge_id),
            point: r.lat != null && r.lng != null ? { lat: r.lat, lng: r.lng } : null,
          }}
        />
      </div>
      <aside className="space-y-4 lg:pt-24">
        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Service status</h2>
            <Pill tone={r.status === "active" ? "ok" : "warn"}>{r.status === "active" ? "In service" : "Maintenance"}</Pill>
          </div>
          <p className="text-sm text-ink-2">Under maintenance, students see your reason and cannot request it. Everyone with an upcoming slot is notified.</p>
          <StatusForm resourceId={r.id} status={r.status} />
        </Card>
      </aside>
    </div>
  );
}
