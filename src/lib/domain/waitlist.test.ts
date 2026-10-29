import { describe, expect, it } from "vitest";
import { promotionOrder, renumber, type Queued } from "./waitlist";

const now = new Date("2026-10-30T05:00:00Z");
const q = (id: string, waitlistPosition: number | null, endsAt = "2026-10-30T09:00:00Z", priorityScore = 100): Queued => ({
  id,
  waitlistPosition,
  priorityScore,
  startsAt: "2026-10-30T07:00:00Z",
  endsAt,
});

describe("waitlist", () => {
  it("offers the freed slot in queue order", () => {
    expect(promotionOrder([q("c", 3), q("a", 1), q("b", 2)], now).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks a tie in position by priority, and puts unnumbered entries last", () => {
    expect(promotionOrder([q("x", null, undefined, 200), q("low", 1, undefined, 90), q("high", 1, undefined, 120)], now).map((x) => x.id)).toEqual([
      "high",
      "low",
      "x",
    ]);
  });

  it("skips slots that are over or end within 30 minutes", () => {
    const order = promotionOrder([q("over", 1, "2026-10-30T04:00:00Z"), q("nearly", 2, "2026-10-30T05:20:00Z"), q("fine", 3)], now);
    expect(order.map((x) => x.id)).toEqual(["fine"]);
  });

  it("closes gaps and reports only who moved", () => {
    expect(renumber([q("a", 2), q("b", 3), q("c", 5)])).toEqual([
      { id: "a", from: 2, to: 1 },
      { id: "b", from: 3, to: 2 },
      { id: "c", from: 5, to: 3 },
    ]);
    expect(renumber([q("a", 1), q("b", 2)])).toEqual([]);
  });
});
