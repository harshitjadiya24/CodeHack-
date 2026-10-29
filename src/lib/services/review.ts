import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CurrentUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { audit, notify } from "./records";
import type { ServiceResult } from "./bookings";

// The Baanto team's side: checking that a newly registered institute is real before other campuses see it,
// and pausing one that isn't. Platform staff are listed in their own table, apart from any institute's roles.

const asJson = (v: unknown) => v as Json;

export async function isPlatformStaff(userId: string) {
  const { data } = await createAdminClient().from("platform_staff").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export type InstituteDecision = "approve" | "suspend" | "reactivate";

const NEXT_STATUS: Record<InstituteDecision, { from: string[]; to: "active" | "suspended"; action: string; verb: string }> = {
  approve: { from: ["pending", "domain_verified"], to: "active", action: "org.approved", verb: "approved" },
  suspend: { from: ["pending", "domain_verified", "active"], to: "suspended", action: "org.suspended", verb: "suspended" },
  reactivate: { from: ["suspended"], to: "active", action: "org.reactivated", verb: "reactivated" },
};

/** Everything a reviewer needs to judge an institute, pending ones first. The demo's reviewer sees only the demo's institutes. */
export async function institutesForReview(staff: Pick<CurrentUser, "isDemo">) {
  const db = createAdminClient();
  const { data: orgs } = await db
    .from("organizations")
    .select("id, name, kind, city, state, website, aishe_code, status, created_at, created_by, departments(count), profiles(count), resources(count)")
    .eq("is_demo", staff.isDemo)
    .order("created_at", { ascending: false });
  const ids = (orgs ?? []).map((o) => o.id);
  const { data: registered } = ids.length
    ? await db.from("audit_log").select("org_id, reason, payload").eq("action", "org.registered").in("org_id", ids)
    : { data: [] };
  const byOrg = new Map((registered ?? []).map((r) => [r.org_id, r]));

  const emails = new Map<string, string>();
  await Promise.all(
    (orgs ?? [])
      .filter((o) => o.created_by)
      .map(async (o) => {
        const { data } = await db.auth.admin.getUserById(o.created_by!);
        if (data.user?.email) emails.set(o.id, data.user.email);
      }),
  );

  const rank: Record<string, number> = { pending: 0, domain_verified: 1, active: 2, suspended: 3 };
  return (orgs ?? [])
    .map((o) => {
      const reg = byOrg.get(o.id);
      const payload = (reg?.payload ?? {}) as { domainMatch?: boolean; domainVerified?: boolean };
      const email = emails.get(o.id) ?? null;
      return {
        ...o,
        registeredBy: reg?.reason ?? null,
        email,
        // Recorded at registration; a hint for the reviewer, not proof.
        emailOnDomain: payload.domainMatch ?? payload.domainVerified ?? false,
        counts: { departments: o.departments[0]?.count ?? 0, people: o.profiles[0]?.count ?? 0, resources: o.resources[0]?.count ?? 0 },
      };
    })
    .sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9));
}

export async function reviewInstitute(staff: CurrentUser, input: { orgId: string; decision: InstituteDecision; reason: string }): Promise<ServiceResult> {
  if (!(await isPlatformStaff(staff.id))) return { ok: false, error: "Only the Baanto team reviews institutes." };
  const rule = NEXT_STATUS[input.decision];
  if (!rule) return { ok: false, error: "Choose what to do." };
  const reason = input.reason.trim();
  if (reason.length < 5) return { ok: false, error: "Give a reason. The institute’s admin office sees it, and it is recorded." };
  if (input.decision === "suspend" && input.orgId === staff.org_id) return { ok: false, error: "You can’t suspend your own institute from here." };

  const db = createAdminClient();
  const { data: org } = await db.from("organizations").select("id, name, status, is_demo").eq("id", input.orgId).maybeSingle();
  if (!org || org.is_demo !== staff.isDemo) return { ok: false, error: "Institute not found." };
  if (!rule.from.includes(org.status)) return { ok: false, error: `It is already ${org.status.replace("_", " ")}.` };

  await db.from("organizations").update({ status: rule.to }).eq("id", org.id);
  await audit(db, {
    orgId: org.id,
    actorId: staff.id,
    action: rule.action,
    entity: "organization",
    entityId: org.id,
    reason,
    payload: asJson({ from: org.status, to: rule.to }),
  });
  const { data: admins } = await db.from("profiles").select("id").eq("org_id", org.id).eq("role", "admin");
  await Promise.all(
    (admins ?? []).map((a) =>
      notify(db, {
        userId: a.id,
        kind: rule.action,
        title:
          input.decision === "approve"
            ? "Your institute is approved. Other campuses can now find it."
            : input.decision === "suspend"
              ? "Your institute has been paused by the Baanto team"
              : "Your institute is active again",
        body: reason,
        link: "/admin",
      }),
    ),
  );
  return { ok: true, message: `${org.name} ${rule.verb}.` };
}
