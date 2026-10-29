import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BORROWER_ROLES, STAFF_ROLES, type CurrentUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { campusParts } from "@/lib/domain/time";
import { audit, notify } from "./records";
import type { ServiceResult } from "./bookings";

// Cross-campus endorsements. A student's home institute vouches for them at one partner campus,
// for a stated purpose and a limited time. The home campus knows the student; the host campus
// only has to trust the home campus. Every step is in both campuses' records.

type Db = ReturnType<typeof createAdminClient>;
const asJson = (v: unknown) => v as Json;

export const ENDORSEMENT_DAYS = [30, 90, 180] as const;

function campusDate(d: Date) {
  const p = campusParts(d);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The live endorsement for this person at this campus, if any. Lapsed ones don't count. */
export async function activeEndorsement(db: Db, userId: string, hostOrgId: string) {
  const { data } = await db
    .from("endorsements")
    .select("id, valid_until, home_org_id, decided_by")
    .eq("user_id", userId)
    .eq("host_org_id", hostOrgId)
    .eq("status", "approved")
    .gte("valid_until", campusDate(new Date()))
    .maybeSingle();
  return data;
}

async function staffOf(db: Db, orgId: string) {
  const { data } = await db.from("profiles").select("id").eq("org_id", orgId).in("role", STAFF_ROLES);
  return data ?? [];
}

export async function requestEndorsement(user: CurrentUser, input: { hostOrgId: string; purpose: string }): Promise<ServiceResult> {
  if (!BORROWER_ROLES.includes(user.role)) return { ok: false, error: "Only students and researchers ask for endorsements." };
  if (!user.verified) return { ok: false, error: "Your admin office has to verify your roll number first." };
  const purpose = input.purpose.trim();
  if (purpose.length < 10) return { ok: false, error: "Say what you need it for, in a sentence, so your admin office can decide." };
  if (input.hostOrgId === user.org_id) return { ok: false, error: "That’s your own campus. You don’t need an endorsement." };

  const db = createAdminClient();
  const { data: host } = await db.from("organizations").select("id, name, status, is_demo").eq("id", input.hostOrgId).maybeSingle();
  if (!host || host.is_demo !== user.isDemo || !["active", "domain_verified"].includes(host.status)) return { ok: false, error: "That campus isn’t open to other institutes yet." };

  const { data: open } = await db
    .from("endorsements")
    .select("status")
    .eq("user_id", user.id)
    .eq("host_org_id", host.id)
    .in("status", ["requested", "approved"])
    .maybeSingle();
  if (open) return { ok: false, error: open.status === "requested" ? "You’ve already asked. Your admin office will reply here." : "You’re already endorsed for this campus." };

  const { data: row, error } = await db
    .from("endorsements")
    .insert({ user_id: user.id, home_org_id: user.org_id, host_org_id: host.id, purpose })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: "We couldn’t send that just now. Try again in a minute." };

  await audit(db, {
    orgId: user.org_id,
    actorId: user.id,
    action: "endorsement.requested",
    entity: "endorsement",
    entityId: row.id,
    reason: purpose,
    payload: asJson({ host: host.name }),
  });
  await Promise.all(
    (await staffOf(db, user.org_id)).map((s) =>
      notify(db, {
        userId: s.id,
        kind: "endorsement.requested",
        title: `${user.full_name} asks to use ${host.name}`,
        body: purpose,
        link: "/manager#endorsements",
      }),
    ),
  );
  return { ok: true, message: `Sent to your admin office. You’ll hear back here once they decide.` };
}

export async function decideEndorsement(
  staff: CurrentUser,
  input: { endorsementId: string; approve: boolean; reason: string; days: number },
): Promise<ServiceResult> {
  if (!STAFF_ROLES.includes(staff.role)) return { ok: false, error: "Only the admin office or a manager endorses students." };
  const reason = input.reason.trim();
  if (reason.length < 5) return { ok: false, error: "Give a short reason. The student and the other campus both see it." };
  if (input.approve && !ENDORSEMENT_DAYS.includes(input.days as (typeof ENDORSEMENT_DAYS)[number])) return { ok: false, error: "Choose how long it lasts." };

  const db = createAdminClient();
  const { data: e } = await db
    .from("endorsements")
    .select("*, person:profiles!endorsements_user_id_fkey(full_name, verified, strikes), host:organizations!endorsements_host_org_id_fkey(name)")
    .eq("id", input.endorsementId)
    .maybeSingle();
  if (!e || e.home_org_id !== staff.org_id) return { ok: false, error: "Not found." };
  if (e.status !== "requested") return { ok: false, error: "Already decided." };
  if (input.approve && !e.person?.verified) return { ok: false, error: "Verify this student’s roll number before endorsing them." };

  const now = new Date();
  const validUntil = input.approve ? campusDate(new Date(now.getTime() + input.days * 86_400_000)) : null;
  await db
    .from("endorsements")
    .update({ status: input.approve ? "approved" : "declined", decision_reason: reason, decided_by: staff.id, decided_at: now.toISOString(), valid_until: validUntil })
    .eq("id", e.id);

  const hostName = e.host?.name ?? "the partner campus";
  const entry = {
    actorId: staff.id,
    action: input.approve ? "endorsement.approved" : "endorsement.declined",
    entity: "endorsement",
    entityId: e.id,
    reason,
    payload: asJson({ person: e.person?.full_name, host: hostName, valid_until: validUntil }),
  };
  // Both campuses keep the record: the home campus vouched, and the host campus was told.
  await audit(db, { ...entry, orgId: staff.org_id });
  if (input.approve) await audit(db, { ...entry, orgId: e.host_org_id });

  await notify(db, {
    userId: e.user_id,
    kind: entry.action,
    title: input.approve ? `Endorsed for ${hostName} until ${validUntil}` : `Endorsement for ${hostName} declined`,
    body: reason,
    link: input.approve ? "/resources?where=state" : "/resources",
  });
  if (input.approve) {
    await Promise.all(
      (await staffOf(db, e.host_org_id)).map((s) =>
        notify(db, {
          userId: s.id,
          kind: "endorsement.received",
          title: `${e.person?.full_name} is endorsed to use your equipment`,
          body: `Until ${validUntil}. Reason from their institute: ${reason}`,
          link: "/owner",
        }),
      ),
    );
  }
  return { ok: true, message: input.approve ? `Endorsed until ${validUntil}.` : "Declined with your reason." };
}

export async function revokeEndorsement(staff: CurrentUser, input: { endorsementId: string; reason: string }): Promise<ServiceResult> {
  if (!STAFF_ROLES.includes(staff.role)) return { ok: false, error: "Only the admin office or a manager can withdraw an endorsement." };
  const reason = input.reason.trim();
  if (reason.length < 5) return { ok: false, error: "Give a short reason. It is recorded." };
  const db = createAdminClient();
  const { data: e } = await db.from("endorsements").select("id, user_id, home_org_id, host_org_id, status").eq("id", input.endorsementId).maybeSingle();
  if (!e || e.home_org_id !== staff.org_id) return { ok: false, error: "Not found." };
  if (e.status !== "approved") return { ok: false, error: "Only a live endorsement can be withdrawn." };

  await db.from("endorsements").update({ status: "revoked", decision_reason: reason, decided_by: staff.id, decided_at: new Date().toISOString() }).eq("id", e.id);
  const entry = { actorId: staff.id, action: "endorsement.revoked", entity: "endorsement", entityId: e.id, reason };
  await audit(db, { ...entry, orgId: e.home_org_id });
  await audit(db, { ...entry, orgId: e.host_org_id });
  await notify(db, { userId: e.user_id, kind: "endorsement.revoked", title: "An endorsement was withdrawn", body: reason, link: "/resources" });
  return { ok: true, message: "Endorsement withdrawn. New requests at that campus are blocked; existing bookings stay with the host to decide." };
}
