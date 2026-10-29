import { describe, expect, it } from "vitest";
import { readInventory } from "./inventory";

const known = { departments: ["ECE", "MKS"], badges: ["ELEC", "3DP"], owners: ["priya@northfield.demo"], existingNames: ["Rigol DS1054Z Oscilloscope"] };
const base = { name: "Bench Multimeter", category: "Test & Measurement", location: "ECE Block, Lab 2", description: "Six-digit bench multimeter with leads." };

describe("inventory import", () => {
  it("fills sensible defaults for a minimal row", () => {
    const { rows, problems } = readInventory([base], known);
    expect(problems).toEqual([]);
    expect(rows[0]).toMatchObject({ line: 2, kind: "equipment", demand: "normal", creditRate: 1, maxHours: 2, autoApprove: false, checklist: ["Returned clean and complete"], photoSlots: ["Overview"] });
  });

  it("reads lists, yes/no columns, money with ₹ and commas, and codes in any case", () => {
    const { rows } = readInventory(
      [{ ...base, kind: "Space", department: "ece", badges: "elec; 3dp", supervised: "Yes", deposit_inr: "₹2,000", checklist: "Leads present | Fuse OK", owner_email: "Priya@Northfield.demo" }],
      known,
    );
    expect(rows[0]).toMatchObject({ kind: "space", department: "ECE", badges: ["ELEC", "3DP"], requiresSupervision: true, depositInr: 2000, checklist: ["Leads present", "Fuse OK"], ownerEmail: "priya@northfield.demo" });
  });

  it("reports every problem on a row with the line number Excel shows", () => {
    const { rows, problems } = readInventory([base, { name: "X", category: "", location: "Lab", description: "short", department: "CIVIL", badges: "WELD", max_hours: "12", supervised: "yes", instant_approval: "yes", owner_email: "nobody@x.in" }], known);
    expect(rows).toHaveLength(1);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    for (const bit of ["missing category", "CIVIL", "WELD", "max_hours", "instant approval", "nobody@x.in", "at least 3", "at least 10"]) expect(problems[0].message).toContain(bit);
  });

  it("skips names already listed or repeated in the file", () => {
    const { rows, skipped } = readInventory([{ ...base, name: "rigol ds1054z oscilloscope" }, base, base], known);
    expect(rows).toHaveLength(1);
    expect(skipped.map((s) => s.line)).toEqual([2, 4]);
  });
});
