import { describe, expect, it } from "vitest";
import { usagePatterns, type UsageRow } from "./patterns";

const used = (userId: string, hours: number, resourceId = "printer"): UsageRow => ({ userId, resourceId, hours, outcome: "used" });
const away = (userId: string, resourceId = "printer"): UsageRow => ({ userId, resourceId, hours: 2, outcome: "turned_away" });

describe("usage patterns for managers", () => {
  it("flags someone holding most of a resource while others were turned away", () => {
    const flags = usagePatterns([used("kabir", 8), used("meera", 2), away("aarav")]);
    expect(flags).toEqual([{ kind: "hogging", userId: "kabir", resourceId: "printer", share: 0.8, hours: 8, turnedAway: 1 }]);
  });

  it("leaves heavy use alone when nobody else wanted it", () => {
    expect(usagePatterns([used("kabir", 8), used("meera", 2)])).toEqual([]);
  });

  it("ignores resources with too little use to judge", () => {
    expect(usagePatterns([used("kabir", 3), away("aarav")])).toEqual([]);
  });

  it("does not count someone turned away from their own heavy use", () => {
    expect(usagePatterns([used("kabir", 8), away("kabir")])).toEqual([]);
  });

  it("flags repeated no-shows", () => {
    const flags = usagePatterns([{ userId: "zoya", resourceId: "x", hours: 1, outcome: "no_show" }, { userId: "zoya", resourceId: "y", hours: 1, outcome: "no_show" }]);
    expect(flags).toEqual([{ kind: "no_shows", userId: "zoya", count: 2 }]);
  });
});
