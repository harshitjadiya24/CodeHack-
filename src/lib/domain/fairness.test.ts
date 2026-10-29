import { describe, expect, it } from "vitest";
import {
  checkUsageRules,
  creditsUsedThisWeek,
  priorityScore,
  withinAvailability,
  type FairnessConfig,
  type PastBooking,
  type ResourceRules,
} from "./fairness";
import { campusInstant } from "./time";

const config: FairnessConfig = {
  weeklyCredits: 20,
  maxActiveHighDemand: 2,
  cooldownHours: 48,
  firstTimeBonus: 20,
  deadlineBonus: 10,
  usagePenaltyPerHour: 2,
  strikePenalty: 15,
};

const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, startTime: "09:00", endTime: "18:00" }));
const printer: ResourceRules = { id: "r-printer", demand: "high", creditRate: 2, maxHours: 4, availability: weekdays };

// Wednesday 28 Oct 2026, 10:00 IST.
const now = campusInstant("2026-10-28", "10:00");
const slot = (date: string, from: string, to: string) => ({
  resourceId: printer.id,
  startsAt: campusInstant(date, from),
  endsAt: campusInstant(date, to),
});
const booking = (date: string, from: string, to: string, status = "closed", credits = 4): PastBooking => ({
  resourceId: printer.id,
  startsAt: campusInstant(date, from).toISOString(),
  endsAt: campusInstant(date, to).toISOString(),
  status,
  credits,
});

const rules = (v: ReturnType<typeof checkUsageRules>) => v.map((x) => x.rule);

describe("availability uses the campus clock", () => {
  it("accepts 14:00–16:00 IST on a weekday", () => {
    expect(withinAvailability(slot("2026-10-29", "14:00", "16:00"), printer)).toBe(true);
  });
  it("rejects a Sunday slot", () => {
    expect(withinAvailability(slot("2026-11-01", "10:00", "12:00"), printer)).toBe(false);
  });
  it("rejects a slot running past closing time", () => {
    expect(withinAvailability(slot("2026-10-29", "17:00", "19:00"), printer)).toBe(false);
  });
});

describe("checkUsageRules", () => {
  it("refuses a slot that overlaps planned maintenance, and names the reason", () => {
    const down = { ...printer, downtime: [{ startsAt: "2026-10-29T05:30:00Z", endsAt: "2026-10-29T06:30:00Z", reason: "Nozzle replacement" }] };
    const v = checkUsageRules({ config, resource: down, slot: slot("2026-10-29", "10:00", "12:00"), history: [], now });
    expect(rules(v)).toEqual(["maintenance"]);
    expect(v[0].values).toEqual({ reason: "Nozzle replacement" });
    expect(checkUsageRules({ config, resource: down, slot: slot("2026-10-29", "13:00", "15:00"), history: [], now })).toEqual([]);
  });

  it("allows a valid first request", () => {
    expect(checkUsageRules({ config, resource: printer, slot: slot("2026-10-29", "10:00", "12:00"), history: [], now })).toEqual([]);
  });

  it("rejects past slots and over-long bookings", () => {
    const v = checkUsageRules({ config, resource: printer, slot: slot("2026-10-27", "09:00", "15:00"), history: [], now });
    expect(rules(v)).toEqual(expect.arrayContaining(["future", "max_hours"]));
  });

  it("enforces weekly credits with the remaining balance in the reason", () => {
    const history = [booking("2026-10-26", "09:00", "13:00", "closed", 18)];
    const v = checkUsageRules({ config, resource: printer, slot: slot("2026-10-30", "10:00", "12:00"), history, now });
    const credit = v.find((x) => x.rule === "credits")!;
    expect(credit.reason).toContain("only 2 of your 20");
  });

  it("ignores cancelled and rejected bookings when counting credits", () => {
    const history = [booking("2026-10-26", "09:00", "13:00", "cancelled", 18)];
    expect(creditsUsedThisWeek(history, now)).toBe(0);
  });

  it("limits active high-demand bookings", () => {
    const history = [
      booking("2026-11-02", "10:00", "11:00", "approved", 2),
      booking("2026-11-05", "10:00", "11:00", "requested", 2),
    ];
    const v = checkUsageRules({ config, resource: printer, slot: slot("2026-11-09", "10:00", "11:00"), history, now });
    expect(rules(v)).toContain("max_active");
  });

  it("applies the cooldown between a person's high-demand bookings", () => {
    const history = [booking("2026-10-29", "10:00", "11:00", "approved", 2)];
    const v = checkUsageRules({ config, resource: printer, slot: slot("2026-10-30", "10:00", "11:00"), history, now });
    expect(rules(v)).toContain("cooldown");
  });
});

describe("priorityScore", () => {
  it("rewards first-time users and stated deadlines", () => {
    const p = priorityScore({ config, resourceId: printer.id, history: [], strikes: 0, hasDeadline: true, now });
    expect(p.score).toBe(130);
    expect(p.breakdown.map((b) => b.label)).toContain("First time using this resource");
  });

  it("discounts recent heavy use and strikes, with every point explained", () => {
    const history = [booking("2026-10-20", "09:00", "13:00"), booking("2026-10-22", "09:00", "13:00")];
    const p = priorityScore({ config, resourceId: printer.id, history, strikes: 1, hasDeadline: false, now });
    expect(p.score).toBe(100 - 16 - 15);
    expect(p.breakdown.reduce((s, b) => s + b.points, 0)).toBe(p.score);
  });

  it("never drops below 1 so everyone keeps a chance in the draw", () => {
    const history = Array.from({ length: 20 }, (_, i) => booking(`2026-10-${String(5 + i).padStart(2, "0")}`, "09:00", "13:00"));
    const p = priorityScore({ config, resourceId: printer.id, history, strikes: 3, hasDeadline: false, now });
    expect(p.score).toBe(1);
  });
});
