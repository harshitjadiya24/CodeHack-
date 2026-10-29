import { describe, expect, it } from "vitest";
import { checkEligibility, type EligibilityInput } from "./eligibility";

const ORG = "org-1";
const INDUCTION = { id: "b-3dp", name: "3D Printer Safety Induction" };
const now = new Date("2026-10-28T10:00:00Z");

function input(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    user: { verified: true, strikes: 0, orgId: ORG },
    resource: { orgId: ORG, status: "active", requiresSupervision: false, depositInr: 0 },
    requiredBadges: [INDUCTION],
    userBadges: [{ badgeId: INDUCTION.id, status: "verified", expiresAt: "2027-01-01T00:00:00Z" }],
    now,
    ...overrides,
  };
}

const check = (r: ReturnType<typeof checkEligibility>, id: string) => r.checks.find((c) => c.id === id)!;

describe("checkEligibility", () => {
  it("passes a verified member holding every required badge", () => {
    expect(checkEligibility(input()).eligible).toBe(true);
  });

  it("explains a missing badge and how to get it", () => {
    const r = checkEligibility(input({ userBadges: [] }));
    expect(r.eligible).toBe(false);
    const c = check(r, `badge:${INDUCTION.id}`);
    expect(c.passed).toBe(false);
    expect(c.howToFix).toMatch(/induction/i);
  });

  it("treats a badge past its expiry date as expired", () => {
    const r = checkEligibility(
      input({ userBadges: [{ badgeId: INDUCTION.id, status: "verified", expiresAt: "2026-10-01T00:00:00Z" }] }),
    );
    expect(r.eligible).toBe(false);
    expect(check(r, `badge:${INDUCTION.id}`).reason).toMatch(/expired/);
  });

  it("blocks pending badges until a manager verifies them", () => {
    const r = checkEligibility(input({ userBadges: [{ badgeId: INDUCTION.id, status: "pending", expiresAt: null }] }));
    expect(r.eligible).toBe(false);
    expect(check(r, `badge:${INDUCTION.id}`).reason).toMatch(/awaiting/);
  });

  it("blocks users at the strike limit", () => {
    expect(checkEligibility(input({ user: { verified: true, strikes: 3, orgId: ORG } })).eligible).toBe(false);
  });

  it("blocks resources under maintenance", () => {
    const r = checkEligibility(
      input({ resource: { orgId: ORG, status: "maintenance", requiresSupervision: false, depositInr: 0 } }),
    );
    expect(r.eligible).toBe(false);
  });

  it("lets an endorsed partner-campus user through until the endorsement's last day", () => {
    const guest = (endorsedUntil: string) => input({ user: { verified: true, strikes: 0, orgId: "org-2", endorsedUntil } });
    expect(checkEligibility(guest("2026-10-28")).eligible).toBe(true);
    const lapsed = checkEligibility(guest("2026-10-27"));
    expect(lapsed.eligible).toBe(false);
    expect(check(lapsed, "org").reason).toMatch(/ended/);
  });

  it("asks partner-campus users for an endorsement", () => {
    const r = checkEligibility(input({ user: { verified: true, strikes: 0, orgId: "org-2" } }));
    expect(r.eligible).toBe(false);
    expect(check(r, "org").howToFix).toMatch(/endorsement/);
  });

  it("adds supervision and deposit as information that never blocks", () => {
    const r = checkEligibility(
      input({ resource: { orgId: ORG, status: "active", requiresSupervision: true, depositInr: 2000 } }),
    );
    expect(r.eligible).toBe(true);
    expect(check(r, "supervision").blocking).toBe(false);
    expect(check(r, "deposit").reason).toContain("₹2,000");
  });

  it("blocks an endorsed guest when the owner keeps the resource to their own campus", () => {
    const r = checkEligibility(
      input({ user: { verified: true, strikes: 0, orgId: "org-2", endorsedUntil: "2027-01-01" }, resource: { orgId: ORG, status: "active", requiresSupervision: false, depositInr: 0, openToPartners: false } }),
    );
    expect(r.eligible).toBe(false);
    expect(check(r, "org")).toMatchObject({ passed: false, code: "org_closed", fixCode: "org_closed" });
  });
});
