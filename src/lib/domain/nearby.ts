// "What's free soonest, and how far is it?" for the Discover map.

import { campusInstant, campusParts } from "./time";

export type Window = { weekday: number; startTime: string; endTime: string };
export type Busy = { startsAt: string; endsAt: string };
export type OpenSlot = { startsAt: Date; endsAt: Date };

const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const LOOKAHEAD_DAYS = 8; // today plus the same weekday next week

function isoDate(d: Date) {
  const p = campusParts(d);
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/**
 * The first gap of at least `minMinutes` inside an opening window that nothing holds, within a week.
 * Starts are rounded up to the next quarter hour so the answer is a time people would actually book.
 */
export function nextOpenSlot(windows: Window[], busy: Busy[], now: Date, minMinutes = 60): OpenSlot | null {
  const held = busy
    .map((b) => ({ s: new Date(b.startsAt).getTime(), e: new Date(b.endsAt).getTime() }))
    .sort((a, b) => a.s - b.s);
  const earliest = Math.ceil(now.getTime() / (15 * MIN)) * 15 * MIN;

  for (let i = 0; i < LOOKAHEAD_DAYS; i++) {
    const day = new Date(now.getTime() + i * DAY);
    const date = isoDate(day);
    const todays = windows
      .filter((w) => w.weekday === campusParts(day).weekday)
      .map((w) => ({ s: campusInstant(date, w.startTime).getTime(), e: campusInstant(date, w.endTime).getTime() }))
      .sort((a, b) => a.s - b.s);
    for (const w of todays) {
      let cursor = Math.max(w.s, earliest);
      for (const h of held) {
        if (h.e <= cursor || h.s >= w.e) continue;
        if (h.s - cursor >= minMinutes * MIN) break;
        cursor = Math.max(cursor, h.e);
      }
      const next = held.find((h) => h.s >= cursor && h.s < w.e);
      const end = Math.min(w.e, next?.s ?? w.e);
      if (end - cursor >= minMinutes * MIN) return { startsAt: new Date(cursor), endsAt: new Date(end) };
    }
  }
  return null;
}

export type Point = { lat: number; lng: number };

/** Great-circle distance in kilometres. */
export function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export type SlotWords = { openNow: (time: string) => string; today: (time: string) => string; tomorrow: (time: string) => string; locale: string };

const ENGLISH: SlotWords = {
  openNow: (t) => `Open now until ${t}`,
  today: (t) => `Today ${t}`,
  tomorrow: (t) => `Tomorrow ${t}`,
  locale: "en-IN",
};

/** "Open now until 17:00", "Today 14:00", "Tomorrow 09:00", "Thu 5 Nov, 09:00" (or the same in `words`). */
export function slotLabel(slot: OpenSlot, now: Date, words: SlotWords = ENGLISH): string {
  const time = (d: Date) => {
    const m = campusParts(d).minutes;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };
  if (slot.startsAt.getTime() - now.getTime() <= 15 * MIN) return words.openNow(time(slot.endsAt));
  const days = Math.round((campusInstant(isoDate(slot.startsAt), "00:00").getTime() - campusInstant(isoDate(now), "00:00").getTime()) / DAY);
  if (days === 0) return words.today(time(slot.startsAt));
  if (days === 1) return words.tomorrow(time(slot.startsAt));
  const date = new Intl.DateTimeFormat(words.locale, { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" }).format(slot.startsAt);
  return `${date}, ${time(slot.startsAt)}`;
}
