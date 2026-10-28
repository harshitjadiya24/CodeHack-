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
};

export type EligibilityResult = {
  eligible: boolean;
  checks: EligibilityCheck[];
};

export type EligibilityInput = {
  user: { verified: boolean; strikes: number; orgId: string };
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
  });

  const sameOrg = input.user.orgId === input.resource.orgId;
  checks.push({
    id: "org",
    label: "Member of the owning institution",
    passed: sameOrg,
    blocking: true,
    reason: sameOrg
      ? "This resource belongs to your institution."
      : "This resource belongs to a partner institution.",
    howToFix: sameOrg ? undefined : "Request a cross-campus endorsement from your home institution.",
  });

  const active = input.resource.status === "active";
  checks.push({
    id: "status",
    label: "Resource is in service",
    passed: active,
    blocking: true,
    reason: active ? "The resource is available for booking." : `The resource is currently ${input.resource.status}.`,
    howToFix: active ? undefined : "Try a similar resource or check back after maintenance.",
  });

  for (const badge of input.requiredBadges) {
    const held = input.userBadges.find((b) => b.badgeId === badge.id);
    const expired = held?.expiresAt ? new Date(held.expiresAt) <= now : false;
    let passed = false;
    let reason: string;
    let howToFix: string | undefined;

    if (!held) {
      reason = `You do not hold "${badge.name}".`;
      howToFix = "Upload your certificate or attend the next induction; a manager verifies it.";
    } else if (held.status === "pending") {
      reason = `"${badge.name}" is awaiting manager verification.`;
      howToFix = "No action needed. You will be notified once it is reviewed.";
    } else if (held.status === "rejected") {
      reason = `Your "${badge.name}" evidence was rejected.`;
      howToFix = "Re-attend the induction and upload fresh evidence.";
    } else if (held.status === "expired" || expired) {
      reason = `Your "${badge.name}" has expired.`;
      howToFix = "Book a refresher induction to renew it.";
    } else {
      passed = true;
      reason = `You hold a valid "${badge.name}".`;
    }

    checks.push({ id: `badge:${badge.id}`, label: badge.name, passed, blocking: true, reason, howToFix });
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
  });

  if (input.resource.requiresSupervision) {
    checks.push({
      id: "supervision",
      label: "Supervised use",
      passed: true,
      blocking: false,
      reason: "A lab attendant must confirm your check-in in person.",
    });
  }

  if (input.resource.depositInr > 0) {
    checks.push({
      id: "deposit",
      label: "Refundable deposit",
      passed: true,
      blocking: false,
      reason: `₹${input.resource.depositInr.toLocaleString("en-IN")} deposit is collected at check-in and refunded after a clean return.`,
    });
  }

  return { eligible: checks.every((c) => c.passed || !c.blocking), checks };
}
