import { describe, expect, it } from "vitest";
import { forecastNextWeek, idleResources, weeklyHours } from "./forecast";

const now = new Date("2026-10-29T12:00:00Z");
const at = (daysAgo: number, h: number) => {
  const s = new Date(now.getTime() - daysAgo * 86_400_000);
  return { starts_at: s.toISOString(), ends_at: new Date(s.getTime() + h * 3_600_000).toISOString() };
};

describe("forecast", () => {
  it("buckets hours by week, oldest first", () => {
    expect(weeklyHours([at(1, 2), at(3, 1), at(10, 4), at(27, 5), at(40, 9)], now)).toEqual([5, 0, 4, 3]);
  });

  it("weights recent weeks more and never forecasts below what is already booked", () => {
    expect(forecastNextWeek([0, 0, 0, 40], 0).level).toBe("quiet");
    expect(forecastNextWeek([0, 0, 0, 40], 0).hours).toBe(16);
    expect(forecastNextWeek([10, 10, 10, 10], 38)).toMatchObject({ hours: 38, level: "full" });
    expect(forecastNextWeek([], 0)).toMatchObject({ hours: 0, level: "quiet" });
  });

  it("finds idle resources and suggests only changes that apply", () => {
    const base = { createdAt: "2026-08-01T00:00:00Z", autoApprove: false, requiresSupervision: false, openToPartners: true, demand: "normal" as const, creditRate: 1 };
    const idle = idleResources(
      [
        { ...base, id: "busy", name: "Busy", hours4w: 60 },
        { ...base, id: "new", name: "New", hours4w: 0, createdAt: "2026-10-25T00:00:00Z" },
        { ...base, id: "closed", name: "Closed", hours4w: 2, openToPartners: false, demand: "high", creditRate: 3 },
        { ...base, id: "supervised", name: "Supervised", hours4w: 10, requiresSupervision: true },
      ],
      now,
    );
    expect(idle.map((r) => r.id)).toEqual(["closed", "supervised"]);
    expect(idle[0].actions).toEqual(["open_to_partners", "instant_approval", "normal_demand", "fewer_credits"]);
    expect(idle[1].actions).toEqual([]);
  });
});
