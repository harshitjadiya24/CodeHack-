import { describe, expect, it } from "vitest";
import { commitFor, newSeed, runDraw, verifyCommit } from "./draw";

const entrants = [
  { bookingId: "b-aarav", weight: 130 },
  { bookingId: "b-meera", weight: 84 },
  { bookingId: "b-kabir", weight: 69 },
];

describe("Fair Draw", () => {
  it("verifies a revealed seed against its published commit", async () => {
    const seed = newSeed();
    const commit = await commitFor(seed);
    expect(await verifyCommit(seed, commit)).toBe(true);
    expect(await verifyCommit(newSeed(), commit)).toBe(false);
  });

  it("is reproducible: same seed and entrants give the same ranking", async () => {
    const seed = "a".repeat(64);
    const first = await runDraw(seed, entrants);
    const again = await runDraw(seed, entrants);
    expect(again.map((r) => r.bookingId)).toEqual(first.map((r) => r.bookingId));
  });

  it("does not depend on the order requests arrived in", async () => {
    const seed = "b".repeat(64);
    const forward = await runDraw(seed, entrants);
    const reversed = await runDraw(seed, [...entrants].reverse());
    expect(reversed.map((r) => r.bookingId)).toEqual(forward.map((r) => r.bookingId));
  });

  it("ranks every entrant exactly once", async () => {
    const result = await runDraw(newSeed(), entrants);
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(new Set(result.map((r) => r.bookingId)).size).toBe(3);
  });

  it("gives higher weights proportionally more wins over many draws", async () => {
    const pair = [
      { bookingId: "heavy", weight: 3 },
      { bookingId: "light", weight: 1 },
    ];
    let heavyWins = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const [winner] = await runDraw(`seed-${i}`, pair);
      if (winner.bookingId === "heavy") heavyWins++;
    }
    // Expected share is 3 / (3 + 1) = 0.75.
    expect(heavyWins / trials).toBeGreaterThan(0.71);
    expect(heavyWins / trials).toBeLessThan(0.79);
  });
});
