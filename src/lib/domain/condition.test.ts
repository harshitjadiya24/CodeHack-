import { describe, expect, it } from "vitest";
import { compareCondition } from "./condition";

const items = ["Nozzle clean", "Build plate undamaged", "Touchscreen responsive"];
const allOk = Object.fromEntries(items.map((i) => [i, true]));

describe("compareCondition", () => {
  it("passes a return that matches check-in", () => {
    const d = compareCondition({ items, before: allOk, after: allOk, returnNotes: "All good" });
    expect(d.flag).toBe(false);
    expect(d.summary).toMatch(/matches/);
  });

  it("flags items that got worse during the booking", () => {
    const d = compareCondition({ items, before: allOk, after: { ...allOk, "Build plate undamaged": false }, returnNotes: "" });
    expect(d.flag).toBe(true);
    expect(d.regressions).toEqual(["Build plate undamaged"]);
  });

  it("does not blame the borrower for problems recorded at check-in", () => {
    const before = { ...allOk, "Touchscreen responsive": false };
    const d = compareCondition({ items, before, after: before, returnNotes: "" });
    expect(d.flag).toBe(false);
    expect(d.summary).toMatch(/Already noted at check-in/);
  });

  it("flags damage words in the return notes", () => {
    expect(compareCondition({ items, before: allOk, after: allOk, returnNotes: "small scratch on the bed" }).flag).toBe(true);
  });
});
