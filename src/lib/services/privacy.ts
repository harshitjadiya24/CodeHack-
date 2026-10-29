import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth";
import { audit } from "./records";
import type { ServiceResult } from "./bookings";

// Deleting your account (DPDP Act 2023, right to erasure).
// What identifies you goes: name, roll number, department, certificate files, notifications, pending requests,
// and the ability to sign in. What the institution must keep stays, without your name: past bookings, handover
// photos and condition records (the owner's evidence, kept for one academic year) and the audit chain, which
// records that a deletion happened but never held the content.

const ACTIVE = ["requested", "in_draw", "waitlisted", "approved", "checked_in", "overdue"] as const;

export const FORMER_MEMBER = "Former member";

/** Why this account can't be deleted yet, or null if it can. Shown before the form so nobody types for nothing. */
export async function deletionBlocker(user: CurrentUser): Promise<string | null> {
  const db = createAdminClient();
  const [{ count: active }, { count: owned }, { count: admins }, { count: openIncidents }] = await Promise.all([
    db.from("bookings").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("status", [...ACTIVE]),
    db.from("resources").select("id", { count: "exact", head: true }).eq("owner_id", user.id).neq("status", "retired"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", user.org_id).eq("role", "admin").neq("id", user.id),
    db.from("incidents").select("id, booking:bookings!inner(user_id)", { count: "exact", head: true }).eq("booking.user_id", user.id).neq("status", "resolved"),
  ]);
  if (active) return `You have ${active} booking${active === 1 ? "" : "s"} or request${active === 1 ? "" : "s"} still open. Cancel or return ${active === 1 ? "it" : "them"} first.`;
  if (openIncidents) return "An incident on one of your bookings is still being decided. Wait for the decision first.";
  if (owned) return `You own ${owned} listed resource${owned === 1 ? "" : "s"}. Ask the admin office to hand ${owned === 1 ? "it" : "them"} to someone else first.`;
  if (user.role === "admin" && !admins) return "You are the only admin office account. Make someone else an admin first, so the institute isn’t left without one.";
  return null;
}

export async function deleteMyAccount(user: CurrentUser, input: { confirmEmail: string }): Promise<ServiceResult> {
  if (input.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) return { ok: false, error: "Type your email exactly as shown to confirm." };
  const blocker = await deletionBlocker(user);
  if (blocker) return { ok: false, error: blocker };

  const db = createAdminClient();

  // Certificate files first: once the rows are cleared we can't find them again.
  const { data: evidence } = await db.from("user_badges").select("evidence_path").eq("user_id", user.id).not("evidence_path", "is", null);
  const paths = (evidence ?? []).flatMap((e) => (e.evidence_path ? [e.evidence_path] : []));
  if (paths.length) {
    const { error } = await db.storage.from("evidence").remove(paths);
    if (error) return { ok: false, error: "We couldn’t remove your uploaded certificates just now. Nothing was deleted; try again in a minute." };
  }

  await Promise.all([
    db.from("user_badges").update({ evidence_path: null, note: null }).eq("user_id", user.id),
    db.from("notifications").delete().eq("user_id", user.id),
    db.from("endorsements").delete().eq("user_id", user.id).eq("status", "requested"),
    db.from("endorsements").update({ status: "revoked", decision_reason: "The person deleted their account." }).eq("user_id", user.id).eq("status", "approved"),
  ]);
  const { error: profileError } = await db
    .from("profiles")
    .update({ full_name: FORMER_MEMBER, roll_no: null, dept_id: null, verified: false })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: "We couldn’t finish deleting your account. Try again in a minute." };

  // Soft delete: sign-in stops for good, while the row the institution's records point at stays.
  const { error: authError } = await db.auth.admin.deleteUser(user.id, true);
  if (authError) return { ok: false, error: "We couldn’t finish deleting your account. Try again in a minute." };

  await audit(db, {
    orgId: user.org_id,
    actorId: user.id,
    action: "user.deleted",
    entity: "profile",
    entityId: user.id,
    reason: "Deleted by the person themselves",
    payload: { removed_files: paths.length },
  });
  return { ok: true, message: "Your account is deleted." };
}
