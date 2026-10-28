"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { decideBadge, decideIncident, requestBadge } from "@/lib/services/governance";

export type GovState = { ok?: boolean; error?: string; message?: string };

export async function decideBadgeAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await decideBadge(user, {
    userBadgeId: z.guid().parse(formData.get("userBadgeId")),
    approve: formData.get("decision") === "approve",
    note: String(formData.get("note") ?? "").trim(),
  });
  revalidatePath("/manager");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function decideIncidentAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await decideIncident(user, {
    incidentId: z.guid().parse(formData.get("incidentId")),
    decision: String(formData.get("decision") ?? "").trim(),
    applyStrike: formData.get("strike") === "on",
  });
  revalidatePath("/manager");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function requestBadgeAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const evidence = formData.get("evidence");
  const result = await requestBadge(user, {
    badgeId: z.guid().parse(formData.get("badgeId")),
    note: String(formData.get("note") ?? "").slice(0, 300),
    evidence: evidence instanceof File ? evidence : null,
  });
  revalidatePath("/passport");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}
