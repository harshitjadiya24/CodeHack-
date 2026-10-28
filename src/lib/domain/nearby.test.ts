import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance, nextOpenSlot, slotLabel, type Window } from "./nearby";
import { campusInstant, campusParts } from "./time";

// Thursday 29 Oct 2026 on the campus clock.
const day = "2026-10-29";
const weekday = campusParts(campusInstant(day, "12:00")).weekday;
const windows: Window[] = [{ weekday, startTime: "09:00", endTime: "17:00" }];
const at = (t: string) => campusInstant(day, t);
const busy = (from: string, to: string) => ({ startsAt: at(from).toISOString(), endsAt: at(to).toISOString() });

describe("nextOpenSlot", () => {
  it("opens at the window start when nothing is booked", () => {
    const slot = nextOpenSlot(windows, [], at("07:30"));
    expect(slot?.startsAt).toEqual(at("09:00"));
    expect(slot?.endsAt).toEqual(at("17:00"));
  });

  it("rounds the start up to the next quarter hour", () => {
    expect(nextOpenSlot(windows, [], at("10:07"))?.startsAt).toEqual(at("10:15"));
  });

  it("skips booked time and gaps that are too short", () => {
    const slot = nextOpenSlot(windows, [busy("09:00", "11:00"), busy("11:30", "14:00")], at("08:00"));
    expect(slot?.startsAt).toEqual(at("14:00"));
    expect(slot?.endsAt).toEqual(at("17:00"));
  });

  it("ends the slot where the next booking starts", () => {
    const slot = nextOpenSlot(windows, [busy("12:00", "13:00")], at("09:00"));
    expect(slot?.endsAt).toEqual(at("12:00"));
  });

  it("moves to the next open day when today is full", () => {
    const slot = nextOpenSlot(windows, [busy("09:00", "17:00")], at("08:00"));
    expect(slot?.startsAt).toEqual(campusInstant("2026-11-05", "09:00"));
  });

  it("returns null when there are no opening hours", () => {
    expect(nextOpenSlot([], [], at("09:00"))).toBeNull();
  });
});

describe("distance", () => {
  it("measures Pune to Mumbai at about 120 km", () => {
    const km = distanceKm({ lat: 18.5204, lng: 73.8567 }, { lat: 19.076, lng: 72.8777 });
    expect(km).toBeGreaterThan(115);
    expect(km).toBeLessThan(125);
  });

  it("formats short and long distances", () => {
    expect(formatDistance(0.234)).toBe("230 m");
    expect(formatDistance(3.46)).toBe("3.5 km");
    expect(formatDistance(118.4)).toBe("118 km");
  });
});

describe("slotLabel", () => {
  it("says open now when the slot has started", () => {
    expect(slotLabel({ startsAt: at("10:00"), endsAt: at("17:00") }, at("10:05"))).toBe("Open now until 17:00");
  });
  it("names today and tomorrow", () => {
    expect(slotLabel({ startsAt: at("14:00"), endsAt: at("17:00") }, at("10:00"))).toBe("Today 14:00");
    expect(slotLabel({ startsAt: campusInstant("2026-10-30", "09:00"), endsAt: campusInstant("2026-10-30", "12:00") }, at("18:00"))).toBe("Tomorrow 09:00");
  });
});
