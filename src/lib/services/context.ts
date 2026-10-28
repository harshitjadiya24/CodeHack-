import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkEligibility, type EligibilityResult } from "@/lib/domain/eligibility";
import type { FairnessConfig, PastBooking, ResourceRules } from "@/lib/domain/fairness";
import type { Tables } from "@/lib/database.types";

type Db = ReturnType<typeof createAdminClient>;

export type ResourceContext = {
  resource: Tables<"resources">;
  requiredBadges: { id: string; name: string; code: string }[];
  rules: ResourceRules;
  config: FairnessConfig;
};

export async function loadResourceContext(db: Db, resourceId: string): Promise<ResourceContext | null> {
  const { data: resource } = await db.from("resources").select("*").eq("id", resourceId).maybeSingle();
  if (!resource) return null;

  const [{ data: reqs }, { data: windows }, { data: cfg }] = await Promise.all([
    db.from("resource_requirements").select("badge:skill_badges(id, name, code)").eq("resource_id", resourceId),
    db.from("availability_windows").select("weekday, start_time, end_time").eq("resource_id", resourceId),
    db.from("fairness_config").select("*").eq("org_id", resource.org_id).single(),
  ]);

  return {
    resource,
    requiredBadges: (reqs ?? []).flatMap((r) => (r.badge ? [r.badge] : [])),
    rules: {
      id: resource.id,
      demand: resource.demand,
      creditRate: resource.credit_rate,
      maxHours: resource.max_hours,
      availability: (windows ?? []).map((w) => ({ weekday: w.weekday, startTime: w.start_time, endTime: w.end_time })),
    },
    config: {
      weeklyCredits: cfg?.weekly_credits ?? 20,
      maxActiveHighDemand: cfg?.max_active_high_demand ?? 2,
      cooldownHours: cfg?.cooldown_hours ?? 48,
      firstTimeBonus: Number(cfg?.first_time_bonus ?? 20),
      deadlineBonus: Number(cfg?.deadline_bonus ?? 10),
      usagePenaltyPerHour: Number(cfg?.usage_penalty_per_hour ?? 2),
      strikePenalty: Number(cfg?.strike_penalty ?? 15),
    },
  };
}

export async function eligibilityFor(
  db: Db,
  user: Pick<Tables<"profiles">, "id" | "verified" | "strikes" | "org_id">,
  ctx: ResourceContext,
): Promise<EligibilityResult> {
  const { data: badges } = await db.from("user_badges").select("badge_id, status, expires_at").eq("user_id", user.id);
  return checkEligibility({
    user: { verified: user.verified, strikes: user.strikes, orgId: user.org_id },
    resource: {
      orgId: ctx.resource.org_id,
      status: ctx.resource.status,
      requiresSupervision: ctx.resource.requires_supervision,
      depositInr: ctx.resource.deposit_inr,
    },
    requiredBadges: ctx.requiredBadges,
    userBadges: (badges ?? []).map((b) => ({ badgeId: b.badge_id, status: b.status, expiresAt: b.expires_at })),
  });
}

/** Last 60 days plus everything upcoming: enough for credits, cooldown and priority. */
export async function bookingHistory(db: Db, userId: string): Promise<PastBooking[]> {
  const since = new Date(Date.now() - 60 * 24 * 3_600_000).toISOString();
  const { data } = await db
    .from("bookings")
    .select("resource_id, starts_at, ends_at, status, credits")
    .eq("user_id", userId)
    .gte("ends_at", since);
  return (data ?? []).map((b) => ({ resourceId: b.resource_id, startsAt: b.starts_at, endsAt: b.ends_at, status: b.status, credits: b.credits }));
}
