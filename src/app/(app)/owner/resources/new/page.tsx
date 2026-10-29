import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { OWNER_ROLES, requirePageRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled } from "@/lib/ai";
import { NewListing } from "./new-listing";

export const metadata: Metadata = { title: "List a resource" };

export default async function NewListingPage() {
  const user = await requirePageRole(OWNER_ROLES);
  const supabase = await createClient();
  const [{ data: badges }, { data: org }] = await Promise.all([
    supabase.from("skill_badges").select("id, name").eq("org_id", user.org_id).order("name"),
    supabase.from("organizations").select("lat, lng").eq("id", user.org_id).single(),
  ]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Owner" title="List a resource" />
      <NewListing badges={badges ?? []} aiOn={aiEnabled()} campus={org?.lat != null && org.lng != null ? { lat: org.lat, lng: org.lng } : null} />
    </div>
  );
}
