// Campus time. Rules like opening hours and "this week" are about the campus clock,
// not the server's (Vercel runs in UTC). India has no DST, so a fixed offset is exact.

export const CAMPUS_TZ = "Asia/Kolkata";
export const CAMPUS_OFFSET_MIN = 330;

const MIN = 60_000;

/** Wall-clock parts of `d` on the campus clock. */
export function campusParts(d: Date) {
  const shifted = new Date(d.getTime() + CAMPUS_OFFSET_MIN * MIN);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** The instant for a campus wall-clock date and time ("2026-10-30", "14:00"). */
export function campusInstant(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - CAMPUS_OFFSET_MIN * MIN);
}

/** Monday 00:00 on the campus clock for the week containing `d`. */
export function campusWeekStart(d: Date): Date {
  const p = campusParts(d);
  const daysSinceMonday = (p.weekday + 6) % 7;
  return new Date(Date.UTC(p.year, p.month, p.day - daysSinceMonday) - CAMPUS_OFFSET_MIN * MIN);
}

export function formatCampus(d: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CAMPUS_TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(typeof d === "string" ? new Date(d) : d);
}
