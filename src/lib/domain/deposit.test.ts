import { describe, expect, it } from "vitest";
import { settlementProblem, settlementStatus } from "./deposit";

const ok = { amount: 500, withheld: 0, reason: "", bookingStatus: "returned" };

describe("settling a deposit", () => {
  it("refunds in full after return without a reason", () => {
    expect(settlementProblem(ok)).toBeNull();
    expect(settlementStatus(0)).toBe("refunded");
  });

  it("refunds when the booking was cancelled before use", () => {
    expect(settlementProblem({ ...ok, bookingStatus: "cancelled" })).toBeNull();
  });

  it("waits until the item is back", () => {
    expect(settlementProblem({ ...ok, bookingStatus: "checked_in" })).toMatch(/after the item is returned/);
  });

  it("needs a written reason to keep any of it", () => {
    expect(settlementProblem({ ...ok, withheld: 200, reason: "damage" })).toMatch(/Say why/);
    expect(settlementProblem({ ...ok, withheld: 200, reason: "Cracked probe tip, replacement ₹200" })).toBeNull();
    expect(settlementStatus(200)).toBe("withheld");
  });

  it("can't keep more than was collected, or a fraction of a rupee", () => {
    expect(settlementProblem({ ...ok, withheld: 600, reason: "Lost the whole kit" })).toMatch(/at most ₹500/);
    expect(settlementProblem({ ...ok, withheld: 12.5, reason: "Scratched lens cap" })).toMatch(/whole rupees/);
  });
});
