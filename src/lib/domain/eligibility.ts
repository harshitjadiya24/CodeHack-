// Eligibility engine: decides whether a person may request a resource and, when not,
// explains exactly what is missing and how to fix it. Pure — no I/O — so it is unit tested.

export const MAX_STRIKES = 3;

export type EligibilityCheck = {
  id: string;
  label: string;
  passed: boolean;
  reason: string;
  howToFix?: string;
  /** Informational checks never block a request (e.g. "an attendant will supervise"). */
  blocking: boolean;
  /** Message keys, so the UI can say the same thing in any language (messages/*.json, Eligibility). `label`/`reason`/`howToFix` stay as the English text. */
  labelKey?: string;
  code: string;
  fixCode?: string;
  values?: Record<string, string | number>;
};

export type EligibilityResult = {
  eligible: boolean;
  checks: EligibilityCheck[];
};

export type EligibilityInput = {
  /** `endorsedUntil`: the last day (YYYY-MM-DD) the home institute vouches for them at this resource's campus. */
  user: { verified: boolean; strikes: number; orgId: string; endorsedUntil?: string | null };
  resource: {
    orgId: string;
    status: "active" | "maintenance" | "retired";
    requiresSupervision: boolean;
    depositInr: number;
  };
  requiredBadges: { id: string; name: string }[];
  userBadges: { badgeId: string; status: "pending" | "verified" | "rejected" | "expired"; expiresAt: string | null }[];
  now?: Date;
};

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const now = input.now ?? new Date();
  const checks: EligibilityCheck[] = [];

  checks.push({
    id: "verified",
    label: "Verified campus identity",
    passed: input.user.verified,
    blocking: true,
    reason: input.user.verified ? "Your identity is verified by the institution." : "Your account is not verified yet.",
    howToFix: input.user.verified ? undefined : "Ask the admin office to verify your roll number.",
    labelKey: "verified",
    code: input.user.verified ? "verified_yes" : "verified_no",
    fixCode: input.user.verified ? undefined : "verified",
  });

  const sameOrg = input.user.orgId === input.resource.orgId;
  const until = input.user.endorsedUntil;
  // An endorsement covers its whole last day on the campus clock (UTC+5:30).
  const endorsed = !sameOrg && !!until && new Date(`${until}T23:59:59+05:30`) >= now;
  checks.push({
    id: "org",
    label: sameOrg ? "Member of the owning institution" : "Endorsed by your institution",
    passed: sameOrg || endorsed,
    blocking: true,
    reason: sameOrg
      ? "This resource belongs to your institution."
      : endorsed
        ? `Your institution has endorsed you at this campus until ${until}.`
        : until
          ? `Your endorsement for this campus ended on ${until}.`
          : "This resource belongs to a partner institution.",
    howToFix: sameOrg || endorsed ? undefined : "Request a cross-campus endorsement from your home institution.",
    labelKey: sameOrg ? "orgSame" : "orgGuest",
    code: sameOrg ? "org_same" : endorsed ? "org_endorsed" : until ? "org_ended" : "org_partner",
    fixCode: sameOrg || endorsed ? undefined : "org",
    values: until ? { until } : undefined,
  });

  const active = input.resource.status === "active";
  checks.push({
    id: "status",
    label: "Resource is in service",
    passed: active,
    blocking: true,
    reason: active ? "The resource is available for booking." : `The resource is currently ${input.resource.status}.`,
    howToFix: active ? undefined : "Try a similar resource or check back after maintenance.",
    labelKey: "status",
    code: `status_${input.resource.status}`,
    fixCode: active ? undefined : "status",
  });

  for (const badge of input.requiredBadges) {
    const held = input.userBadges.find((b) => b.badgeId === badge.id);
    const expired = held?.expiresAt ? new Date(held.expiresAt) <= now : false;
    let passed = false;
    let reason: string;
    let howToFix: string | undefined;
    let code: string;

    if (!held) {
      code = "badge_missing";
      reason = `You do not hold "${badge.name}".`;
      howToFix = "Upload your certificate or attend the next induction; a manager verifies it.";
    } else if (held.status === "pending") {
      code = "badge_pending";
      reason = `"${badge.name}" is awaiting manager verification.`;
      howToFix = "No action needed. You will be notified once it is reviewed.";
    } else if (held.status === "rejected") {
      code = "badge_rejected";
      reason = `Your "${badge.name}" evidence was rejected.`;
      howToFix = "Re-attend the induction and upload fresh evidence.";
    } else if (held.status === "expired" || expired) {
      code = "badge_expired";
      reason = `Your "${badge.name}" has expired.`;
      howToFix = "Book a refresher induction to renew it.";
    } else {
      code = "badge_valid";
      passed = true;
      reason = `You hold a valid "${badge.name}".`;
    }

    checks.push({ id: `badge:${badge.id}`, label: badge.name, passed, blocking: true, reason, howToFix, code, fixCode: howToFix ? code : undefined, values: { badge: badge.name } });
  }

  const strikesOk = input.user.strikes < MAX_STRIKES;
  checks.push({
    id: "strikes",
    label: "Good standing",
    passed: strikesOk,
    blocking: true,
    reason: strikesOk
      ? `${input.user.strikes} of ${MAX_STRIKES} strikes used.`
      : `Booking is paused after ${MAX_STRIKES} strikes.`,
    howToFix: strikesOk ? undefined : "Speak to the lab manager to review your strikes.",
    labelKey: "strikes",
    code: strikesOk ? "strikes_ok" : "strikes_over",
    fixCode: strikesOk ? undefined : "strikes",
    values: { count: input.user.strikes, max: MAX_STRIKES },
  });

  if (input.resource.requiresSupervision) {
    checks.push({
      id: "supervision",
      label: "Supervised use",
      passed: true,
      blocking: false,
      reason: "A lab attendant must confirm your check-in in person.",
      labelKey: "supervision",
      code: "supervision",
    });
  }

  if (input.resource.depositInr > 0) {
    checks.push({
      id: "deposit",
      label: "Refundable deposit",
      passed: true,
      blocking: false,
      reason: `₹${input.resource.depositInr.toLocaleString("en-IN")} deposit is collected at check-in and refunded after a clean return.`,
      labelKey: "deposit",
      code: "deposit",
      values: { amount: `₹${input.resource.depositInr.toLocaleString("en-IN")}` },
    });
  }

  return { eligible: checks.every((c) => c.passed || !c.blocking), checks };
}
