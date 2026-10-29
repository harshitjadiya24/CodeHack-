import { describe, expect, it } from "vitest";
import { noShows, worthOffering } from "./noshow";

const now = new Date("2026-10-30T10:00:00+05:30");
const slot = (id: string, start: string, end: string, checkedIn = false) => ({ id, startsAt: `2026-10-30T${start}:00+05:30`, endsAt: `2026-10-30T${end}:00+05:30`, checkedIn });

describe("no-shows", () => {
  it("releases a slot 15 minutes after it started with no check-in", () => {
    expect(noShows([slot("late", "09:45", "11:00")], now).map((b) => b.id)).toEqual(["late"]);
  });

  it("waits out the grace period", () => {
    expect(noShows([slot("grace", "09:50", "11:00")], now)).toEqual([]);
  });

  it("never releases someone who started check-in (a supervised one may still await the attendant)", () => {
    expect(noShows([slot("came", "09:00", "11:00", true)], now)).toEqual([]);
  });

  it("leaves old history alone", () => {
    expect(noShows([{ id: "old", startsAt: "2026-10-28T09:00:00+05:30", endsAt: "2026-10-28T10:00:00+05:30", checkedIn: false }], now)).toEqual([]);
  });

  it("offers the rest of the slot only while some of it is left", () => {
    expect(worthOffering(slot("a", "09:00", "11:00"), now)).toBe(true);
    expect(worthOffering(slot("b", "08:00", "09:30"), now)).toBe(false);
  });
});
