import { describe, expect, it } from "vitest";
import { foldLine, icsDate, icsText, toIcs } from "./calendar";

const event = {
  uid: "b1@baanto",
  start: new Date("2026-10-30T04:30:00Z"),
  end: new Date("2026-10-30T06:30:00Z"),
  summary: "3D Printer, Makerspace",
  location: "Block C; room 12",
};

describe("calendar file", () => {
  it("writes UTC timestamps without separators", () => {
    expect(icsDate(new Date("2026-10-30T04:30:00.000Z"))).toBe("20261030T043000Z");
  });

  it("escapes the characters iCalendar reserves", () => {
    expect(icsText("a, b; c\\d\nnext")).toBe("a\\, b\\; c\\\\d\\nnext");
  });

  it("folds long lines at 75 bytes without splitting a Devanagari character", () => {
    const line = "SUMMARY:" + "प्रिंटर ".repeat(20);
    const folded = foldLine(line).split("\r\n ");
    expect(folded.length).toBeGreaterThan(1);
    for (const part of folded) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.join("")).toBe(line);
  });

  it("leaves short lines alone", () => {
    expect(foldLine("UID:abc")).toBe("UID:abc");
  });

  it("builds a calendar with CRLF line endings, a reminder and a confirmed status", () => {
    const ics = toIcs([{ ...event, alarmMinutes: 30 }], { name: "Baanto", now: new Date("2026-10-29T00:00:00Z") });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261030T043000Z\r\nDTEND:20261030T063000Z");
    expect(ics).toContain("LOCATION:Block C\\; room 12");
    expect(ics).toContain("TRIGGER:-PT30M");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.split("\r\n").every((l) => !l.includes("\n"))).toBe(true);
  });

  it("marks a waitlisted slot tentative and free, so it doesn't block the person's calendar", () => {
    const ics = toIcs([{ ...event, tentative: true }], { name: "Baanto" });
    expect(ics).toContain("STATUS:TENTATIVE");
    expect(ics).toContain("TRANSP:TRANSPARENT");
    expect(ics).not.toContain("VALARM");
  });
});
