import "server-only";
import type { CalendarEvent } from "@/lib/domain/calendar";

// Statuses worth having in a calendar: a held slot is confirmed; a waitlisted one is tentative.
export const CALENDAR_STATUSES = ["approved", "checked_in", "waitlisted"] as const;

type Row = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  purpose: string;
  waitlist_position: number | null;
  resource: { name: string; location: string; org: { name: string } | null } | null;
};

export const CALENDAR_SELECT = "id, starts_at, ends_at, status, purpose, waitlist_position, resource:resources(name, location, org:organizations(name))";

export function bookingEvent(b: Row, origin: string): CalendarEvent {
  const waiting = b.status === "waitlisted";
  const name = b.resource?.name ?? "Booking";
  const place = [b.resource?.location, b.resource?.org?.name].filter(Boolean).join(", ");
  return {
    uid: `${b.id}@saajha`,
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
    summary: waiting ? `Waitlisted #${b.waitlist_position ?? "?"}: ${name}` : name,
    location: place || undefined,
    description: [
      waiting ? "You're on the waitlist. Saajha moves you in automatically if a place opens up." : "Booked on Saajha. Scan the QR tag on the resource to check in.",
      `Purpose: ${b.purpose}`,
      `Booking SJ-${b.id.slice(0, 4).toUpperCase()}`,
    ].join("\n"),
    url: `${origin}/bookings/${b.id}`,
    tentative: waiting,
    alarmMinutes: waiting ? undefined : 30,
  };
}

export function icsResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
