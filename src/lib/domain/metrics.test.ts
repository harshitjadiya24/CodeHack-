import { describe, expect, it } from "vitest";
import { gini, topShare } from "./metrics";

describe("gini", () => {
  it("is 0 when everyone uses the same amount", () => {
    expect(gini([5, 5, 5, 5])).toBeCloseTo(0);
  });
  it("approaches 1 when one person uses everything", () => {
    expect(gini([0, 0, 0, 0, 100])).toBeCloseTo(0.8);
  });
  it("handles empty and single-user cases", () => {
    expect(gini([])).toBe(0);
    expect(gini([7])).toBe(0);
  });
});

describe("topShare", () => {
  it("measures how much the heaviest users take", () => {
    expect(topShare([50, 20, 10, 10, 10], 0.2)).toBeCloseTo(0.5);
  });
  it("is 0 with no usage", () => {
    expect(topShare([0, 0])).toBe(0);
  });
});
