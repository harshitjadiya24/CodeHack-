"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { decideBadge, decideIncident, disputeIncident, requestBadge, setUserRole, setUserVerified } from "@/lib/services/governance";
import { decideEndorsement, requestEndorsement, revokeEndorsement } from "@/lib/services/endorsements";

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

export async function disputeAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await disputeIncident(user, {
    incidentId: z.guid().parse(formData.get("incidentId")),
    response: String(formData.get("response") ?? ""),
  });
  revalidatePath("/manager");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function verifyUserAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await setUserVerified(user, {
    userId: z.guid().parse(formData.get("userId")),
    verified: formData.get("verified") === "true",
    reason: String(formData.get("reason") ?? ""),
  });
  revalidatePath("/admin/people");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function setRoleAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await setUserRole(user, {
    userId: z.guid().parse(formData.get("userId")),
    role: String(formData.get("role") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  });
  revalidatePath("/admin/people");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function requestEndorsementAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await requestEndorsement(user, {
    hostOrgId: z.guid().parse(formData.get("hostOrgId")),
    purpose: String(formData.get("purpose") ?? "").slice(0, 500),
  });
  revalidatePath("/resources", "layout");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function decideEndorsementAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await decideEndorsement(user, {
    endorsementId: z.guid().parse(formData.get("endorsementId")),
    approve: formData.get("decision") === "approve",
    reason: String(formData.get("reason") ?? ""),
    days: Number(formData.get("days") ?? 0),
  });
  revalidatePath("/manager");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function revokeEndorsementAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await revokeEndorsement(user, {
    endorsementId: z.guid().parse(formData.get("endorsementId")),
    reason: String(formData.get("reason") ?? ""),
  });
  revalidatePath("/manager");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}
