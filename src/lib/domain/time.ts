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

/** `locale` is an Intl locale such as "hi-IN" (see intlLocale in src/i18n/config.ts). */
export function formatCampus(d: Date | string, opts: Intl.DateTimeFormatOptions = {}, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: CAMPUS_TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(typeof d === "string" ? new Date(d) : d);
}

/**
 * The Indian academic year containing `d`: 1 July to 30 June on the campus clock, the period NAAC and AISHE report on.
 * `start` is the calendar year it begins in, so 2026 is "2026–27".
 */
export function academicYear(d: Date): { start: number; label: string; from: Date; to: Date } {
  const p = campusParts(d);
  return academicYearStarting(p.month >= 6 ? p.year : p.year - 1);
}

export function academicYearStarting(start: number): { start: number; label: string; from: Date; to: Date } {
  return {
    start,
    label: `${start}–${String((start + 1) % 100).padStart(2, "0")}`,
    from: campusInstant(`${start}-07-01`, "00:00"),
    to: campusInstant(`${start + 1}-07-01`, "00:00"),
  };
}
