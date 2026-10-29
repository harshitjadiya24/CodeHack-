// iCalendar (RFC 5545) files, so a booking can sit in Google Calendar, Outlook or the phone's own calendar.
// Pure: the route handlers only fetch bookings and hand them over.

export type CalendarEvent = {
  /** Stable across downloads, so re-importing updates the event instead of duplicating it. */
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  location?: string;
  description?: string;
  url?: string;
  /** A waitlisted slot isn't yours yet. */
  tentative?: boolean;
  /** Minutes before the start to remind. */
  alarmMinutes?: number;
};

/** 20261030T043000Z: always UTC, so no VTIMEZONE block is needed. */
export function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Text values escape backslash, semicolon, comma and newlines (RFC 5545 §3.3.11). */
export function icsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space. Counted in UTF-8 bytes, split between characters. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    // The first line holds 75 octets; continuation lines start with a space, leaving 74.
    if (bytes + size > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function toIcs(events: CalendarEvent[], opts: { name: string; now?: Date }): string {
  const stamp = icsDate(opts.now ?? new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Saajha//Bookings//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsText(opts.name)}`];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stamp}`, `DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(e.end)}`, `SUMMARY:${icsText(e.summary)}`);
    if (e.location) lines.push(`LOCATION:${icsText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${icsText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push(`STATUS:${e.tentative ? "TENTATIVE" : "CONFIRMED"}`, `TRANSP:${e.tentative ? "TRANSPARENT" : "OPAQUE"}`);
    if (e.alarmMinutes) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(e.summary)}`, `TRIGGER:-PT${e.alarmMinutes}M`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
