import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { OWNER_ROLES, type CurrentUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { audit } from "./records";
import type { ServiceResult } from "./bookings";

const lines = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const listingSchema = z.object({
  name: z.string().trim().min(3).max(120),
  kind: z.enum(["equipment", "space"]),
  category: z.string().trim().min(2).max(60),
  location: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(1000),
  rules: z.string().trim().max(1000).default(""),
  demand: z.enum(["normal", "high"]),
  creditRate: z.coerce.number().int().min(0).max(10),
  depositInr: z.coerce.number().int().min(0).max(100000),
  rentalValue: z.coerce.number().int().min(0).max(100000),
  maxHours: z.coerce.number().int().min(1).max(8),
  requiresSupervision: z.boolean(),
  autoApprove: z.boolean(),
  checklist: z.string().default(""),
  photoSlots: z.string().default(""),
  badgeIds: z.array(z.guid()).default([]),
});

export type ListingInput = z.infer<typeof listingSchema>;

export async function createResource(owner: CurrentUser, input: ListingInput): Promise<ServiceResult> {
  if (!OWNER_ROLES.includes(owner.role)) return { ok: false, error: "Only resource owners can list resources." };
  const checklist = lines(input.checklist);
  const photoSlots = lines(input.photoSlots);
  if (!checklist.length) return { ok: false, error: "Add at least one condition checklist item." };
  if (!photoSlots.length) return { ok: false, error: "Add at least one photo angle for handovers." };
  if (input.autoApprove && input.requiresSupervision) return { ok: false, error: "Supervised resources always need a person to approve." };

  const db = createAdminClient();
  const { data: r, error } = await db
    .from("resources")
    .insert({
      org_id: owner.org_id,
      dept_id: owner.dept_id,
      owner_id: owner.id,
      name: input.name,
      kind: input.kind,
      category: input.category,
      location: input.location,
      description: input.description,
      rules: input.rules,
      demand: input.demand,
      credit_rate: input.creditRate,
      deposit_inr: input.depositInr,
      rental_value_inr_per_hour: input.rentalValue,
      max_hours: input.maxHours,
      requires_supervision: input.requiresSupervision,
      auto_approve: input.autoApprove,
      checklist: checklist as unknown as Json,
      photo_slots: photoSlots as unknown as Json,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  if (input.badgeIds.length) {
    await db.from("resource_requirements").insert(input.badgeIds.map((badge_id) => ({ resource_id: r.id, badge_id })));
  }
  await db.from("availability_windows").insert([1, 2, 3, 4, 5].map((weekday) => ({ resource_id: r.id, weekday, start_time: "09:00", end_time: "18:00" })));
  await audit(db, {
    orgId: owner.org_id,
    actorId: owner.id,
    action: "resource.listed",
    entity: "resource",
    entityId: r.id,
    reason: input.name,
    payload: { demand: input.demand, supervised: input.requiresSupervision, badges: input.badgeIds.length } as Json,
  });
  return { ok: true, bookingId: r.id, message: "Listed. Print its QR tag next." };
}
