import { describe, expect, it } from "vitest";
import { academicYear, academicYearStarting } from "./time";

describe("academic year", () => {
  it("runs July to June on the campus clock", () => {
    expect(academicYear(new Date("2026-10-29T10:00:00Z")).label).toBe("2026–27");
    expect(academicYear(new Date("2027-06-30T12:00:00Z")).label).toBe("2026–27");
  });

  it("turns over at midnight IST on 1 July, not midnight UTC", () => {
    // 30 June 19:00 UTC is already 1 July 00:30 in India.
    expect(academicYear(new Date("2027-06-30T19:00:00Z")).label).toBe("2027–28");
    expect(academicYear(new Date("2027-06-30T18:00:00Z")).label).toBe("2026–27");
  });

  it("spans exactly one year and labels the century turn", () => {
    const ay = academicYearStarting(2099);
    expect(ay.label).toBe("2099–00");
    expect(ay.from.toISOString()).toBe("2099-06-30T18:30:00.000Z");
    expect(ay.to.toISOString()).toBe("2100-06-30T18:30:00.000Z");
  });
});
