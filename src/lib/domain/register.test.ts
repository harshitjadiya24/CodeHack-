import { describe, expect, it } from "vitest";
import { matchRegister, namesAgree, readRegister } from "./register";

describe("college register", () => {
  it("accepts the usual roll-number headers and flags bad rows", () => {
    const { entries, problems } = readRegister([{ roll_no: " nit22cs041 ", name: "Aarav Mehta" }, { enrollment_no: "NIT23EC044" }, { roll_no: "" }, { roll_no: "A!" }]);
    expect(entries.map((e) => e.rollNo)).toEqual(["NIT22CS041", "NIT23EC044"]);
    expect(problems.map((p) => p.line)).toEqual([4, 5]);
  });

  it("treats added or dropped middle names and titles as the same person", () => {
    expect(namesAgree("MEHTA AARAV R.", "Aarav Mehta")).toBe(true);
    expect(namesAgree("Dr. Priya Nair", "Priya")).toBe(true);
    expect(namesAgree("Rohan Das", "Aarav Mehta")).toBe(false);
  });

  it("verifies matches, leaves name clashes for a person, and counts the rest", () => {
    const { entries } = readRegister([
      { roll_no: "NIT22CS041", name: "Aarav Mehta" },
      { roll_no: "NIT23EC044", name: "Ananya Kulkarni" },
      { roll_no: "NIT24CS008" },
      { roll_no: "NIT22EC017", name: "Meera Iyer" },
      { roll_no: "NIT99XX999", name: "Not Signed Up" },
      { roll_no: "NIT24CS008" },
    ]);
    const m = matchRegister(entries, [
      { id: "a", rollNo: "nit22cs041", fullName: "Aarav Mehta", verified: false },
      { id: "b", rollNo: "NIT23EC044", fullName: "Rohan Das", verified: false },
      { id: "c", rollNo: "NIT24CS008", fullName: "Sneha Pillai", verified: false },
      { id: "d", rollNo: "NIT22EC017", fullName: "Meera Iyer", verified: true },
      { id: "e", rollNo: null, fullName: "Staff", verified: false },
    ]);
    expect(m.verify.map((v) => v.id)).toEqual(["a", "c"]);
    expect(m.nameMismatch.map((v) => v.id)).toEqual(["b"]);
    expect(m.alreadyVerified).toBe(1);
    expect(m.notOnBaanto).toBe(1);
    expect(m.duplicates).toEqual(["NIT24CS008"]);
  });
});
