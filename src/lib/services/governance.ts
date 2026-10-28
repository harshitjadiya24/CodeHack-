import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BORROWER_ROLES, STAFF_ROLES, type CurrentUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { audit, notify } from "./records";
import type { ServiceResult } from "./bookings";

const asJson = (v: unknown) => v as Json;

// ── Trust Passport ────────────────────────────────────────────────────────────
export async function requestBadge(user: CurrentUser, input: { badgeId: string; note: string; evidence: File | null }): Promise<ServiceResult> {
  if (!BORROWER_ROLES.includes(user.role)) return { ok: false, error: "Only students and researchers hold passport badges." };
  if (!input.evidence || input.evidence.size === 0) return { ok: false, error: "Attach your certificate or attendance slip." };
  if (input.evidence.size > 8 * 1024 * 1024) return { ok: false, error: "Evidence must be under 8 MB." };

  const db = createAdminClient();
  const { data: badge } = await db.from("skill_badges").select("id, name, org_id").eq("id", input.badgeId).single();
  if (!badge || badge.org_id !== user.org_id) return { ok: false, error: "Badge not found." };
  const { data: existing } = await db.from("user_badges").select("status, expires_at").eq("user_id", user.id).eq("badge_id", badge.id).maybeSingle();
  if (existing?.status === "pending") return { ok: false, error: "This badge is already awaiting review." };
  if (existing?.status === "verified" && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
    return { ok: false, error: "You already hold this badge." };
  }

  const ext = input.evidence.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${user.id}/${badge.id}-${Date.now()}.${ext}`;
  const { error: upErr } = await db.storage.from("evidence").upload(path, input.evidence, { contentType: input.evidence.type });
  if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

  const { data: row, error } = await db
    .from("user_badges")
    .upsert(
      { user_id: user.id, badge_id: badge.id, status: "pending", evidence_path: path, note: input.note || null, issued_by: null, issued_at: null, expires_at: null },
      { onConflict: "user_id,badge_id" },
    )
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  await audit(db, { orgId: user.org_id, actorId: user.id, action: "badge.requested", entity: "user_badge", entityId: row.id, reason: badge.name });
  const { data: managers } = await db.from("profiles").select("id").eq("org_id", user.org_id).eq("role", "manager");
  for (const m of managers ?? []) {
    await notify(db, { userId: m.id, kind: "badge.pending", title: `Badge to verify: ${badge.name}`, body: user.full_name, link: "/manager" });
  }
  return { ok: true, message: "Sent for verification. You'll be notified." };
}

export async function decideBadge(manager: CurrentUser, input: { userBadgeId: string; approve: boolean; note: string }): Promise<ServiceResult> {
  if (!STAFF_ROLES.includes(manager.role)) return { ok: false, error: "Only managers verify badges." };
  if (!input.approve && !input.note.trim()) return { ok: false, error: "Tell the student why, so they can fix it." };
  const db = createAdminClient();
  const { data: ub } = await db.from("user_badges").select("*, badge:skill_badges(name, validity_days, org_id)").eq("id", input.userBadgeId).single();
  if (!ub?.badge || ub.badge.org_id !== manager.org_id) return { ok: false, error: "Not found." };
  if (ub.status !== "pending") return { ok: false, error: "Already decided." };

  const now = new Date();
  await db
    .from("user_badges")
    .update(
      input.approve
        ? { status: "verified", issued_by: manager.id, issued_at: now.toISOString(), expires_at: new Date(now.getTime() + ub.badge.validity_days * 86_400_000).toISOString(), note: input.note || ub.note }
        : { status: "rejected", issued_by: manager.id, note: input.note },
    )
    .eq("id", ub.id);
  await audit(db, {
    orgId: manager.org_id,
    actorId: manager.id,
    action: input.approve ? "badge.verified" : "badge.rejected",
    entity: "user_badge",
    entityId: ub.id,
    reason: input.note || ub.badge.name,
    payload: asJson({ user_id: ub.user_id, badge: ub.badge.name }),
  });
  await notify(db, {
    userId: ub.user_id,
    kind: input.approve ? "badge.verified" : "badge.rejected",
    title: input.approve ? `Badge verified: ${ub.badge.name}` : `Badge not verified: ${ub.badge.name}`,
    body: input.note,
    link: "/passport",
  });
  return { ok: true, message: input.approve ? "Badge issued." : "Badge rejected with reason." };
}

// ── Identity verification ─────────────────────────────────────────────────────
export async function setUserVerified(admin: CurrentUser, input: { userId: string; verified: boolean; reason: string }): Promise<ServiceResult> {
  if (admin.role !== "admin") return { ok: false, error: "Only the admin office verifies identities." };
  if (input.reason.trim().length < 5) return { ok: false, error: "Give a reason; it is recorded in the audit log." };
  if (input.userId === admin.id) return { ok: false, error: "You cannot change your own verification." };
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("id, org_id, full_name, verified").eq("id", input.userId).single();
  if (!p || p.org_id !== admin.org_id) return { ok: false, error: "Person not found." };
  if (p.verified === input.verified) return { ok: false, error: input.verified ? "Already verified." : "Already unverified." };
  await db.from("profiles").update({ verified: input.verified }).eq("id", p.id);
  await audit(db, {
    orgId: admin.org_id,
    actorId: admin.id,
    action: input.verified ? "user.verified" : "user.unverified",
    entity: "profile",
    entityId: p.id,
    reason: input.reason,
  });
  await notify(db, {
    userId: p.id,
    kind: input.verified ? "user.verified" : "user.unverified",
    title: input.verified ? "Your campus identity is verified" : "Your verification was paused",
    body: input.reason,
    link: "/profile",
  });
  return { ok: true, message: `${p.full_name} ${input.verified ? "verified" : "unverified"}.` };
}

// ── Disputes: the borrower's side before any decision ─────────────────────────
export async function disputeIncident(user: CurrentUser, input: { incidentId: string; response: string }): Promise<ServiceResult> {
  if (input.response.trim().length < 15) return { ok: false, error: "Explain your side in a sentence or two (at least 15 characters)." };
  const db = createAdminClient();
  const { data: inc } = await db.from("incidents").select("*, booking:bookings(user_id), resource:resources(name, org_id)").eq("id", input.incidentId).single();
  if (!inc?.booking || inc.booking.user_id !== user.id) return { ok: false, error: "Only the borrower on this booking can respond." };
  if (inc.status === "resolved") return { ok: false, error: "This incident is already decided. Ask a manager to reopen it." };
  if (inc.disputed_at) return { ok: false, error: "You have already responded." };

  await db
    .from("incidents")
    .update({ borrower_response: input.response.trim(), disputed_at: new Date().toISOString(), status: "under_review" })
    .eq("id", inc.id);
  await audit(db, {
    orgId: inc.resource?.org_id ?? null,
    actorId: user.id,
    action: "incident.disputed",
    entity: "booking",
    entityId: inc.booking_id,
    reason: input.response.trim(),
    payload: asJson({ incident_id: inc.id }),
  });
  const { data: managers } = await db.from("profiles").select("id").eq("org_id", user.org_id).eq("role", "manager");
  for (const m of managers ?? []) {
    await notify(db, { userId: m.id, kind: "incident.disputed", title: `Borrower contests an incident: ${inc.resource?.name}`, body: input.response.slice(0, 140), link: "/manager" });
  }
  return { ok: true, message: "Your response is with the manager. No decision is made without reading it." };
}

// ── Incidents: a person always decides ────────────────────────────────────────
export async function decideIncident(
  manager: CurrentUser,
  input: { incidentId: string; decision: string; applyStrike: boolean },
): Promise<ServiceResult> {
  if (!STAFF_ROLES.includes(manager.role)) return { ok: false, error: "Only managers decide incidents." };
  if (input.decision.trim().length < 10) return { ok: false, error: "Write the decision in a sentence the student can understand." };
  const db = createAdminClient();
  const { data: inc } = await db.from("incidents").select("*, resource:resources(name, org_id), booking:bookings(user_id)").eq("id", input.incidentId).single();
  if (!inc?.resource || inc.resource.org_id !== manager.org_id) return { ok: false, error: "Incident not found." };
  if (inc.status === "resolved") return { ok: false, error: "Already decided." };

  await db
    .from("incidents")
    .update({ status: "resolved", decision: input.decision, strike_applied: input.applyStrike, decided_by: manager.id, decided_at: new Date().toISOString() })
    .eq("id", inc.id);

  const borrower = inc.booking?.user_id;
  if (input.applyStrike && borrower) {
    const { data: p } = await db.from("profiles").select("strikes").eq("id", borrower).single();
    await db.from("profiles").update({ strikes: (p?.strikes ?? 0) + 1 }).eq("id", borrower);
  }
  await audit(db, {
    orgId: manager.org_id,
    actorId: manager.id,
    action: "incident.decided",
    entity: inc.booking_id ? "booking" : "incident",
    entityId: inc.booking_id ?? inc.id,
    reason: input.decision,
    payload: asJson({ incident_id: inc.id, strike_applied: input.applyStrike }),
  });
  if (borrower) {
    await notify(db, {
      userId: borrower,
      kind: "incident.decided",
      title: `Incident decided: ${inc.resource.name}`,
      body: `${input.decision}${input.applyStrike ? " A strike was recorded." : ""}`,
      link: inc.booking_id ? `/bookings/${inc.booking_id}` : undefined,
    });
  }
  return { ok: true, message: input.applyStrike ? "Decided. Strike recorded." : "Decided." };
}
