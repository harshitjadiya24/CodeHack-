"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/services/records";
import type { Json } from "@/lib/database.types";

export type ConfigState = { ok?: boolean; error?: string };

const schema = z.object({
  weekly_credits: z.coerce.number().int().min(1).max(200),
  max_active_high_demand: z.coerce.number().int().min(1).max(10),
  cooldown_hours: z.coerce.number().int().min(0).max(336),
  first_time_bonus: z.coerce.number().min(0).max(100),
  deadline_bonus: z.coerce.number().min(0).max(100),
  usage_penalty_per_hour: z.coerce.number().min(0).max(20),
  strike_penalty: z.coerce.number().min(0).max(100),
  reason: z.string().trim().min(5, "Explain the policy change; it is published in the audit log."),
});

export async function updateFairnessAction(_prev: ConfigState, formData: FormData): Promise<ConfigState> {
  const user = await requireUser();
  if (user.role !== "admin") return { error: "Only the admin office can change fairness policy." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { reason, ...config } = parsed.data;
  const db = createAdminClient();
  const { data: before } = await db.from("fairness_config").select("*").eq("org_id", user.org_id).single();
  const { error } = await db.from("fairness_config").update({ ...config, updated_at: new Date().toISOString() }).eq("org_id", user.org_id);
  if (error) return { error: error.message };
  await audit(db, { orgId: user.org_id, actorId: user.id, action: "policy.fairness_updated", entity: "organization", entityId: user.org_id, reason, payload: { before, after: config } as Json });
  revalidatePath("/admin");
  return { ok: true };
}
