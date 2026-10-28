import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { campusInstant, campusParts } from "@/lib/domain/time";
import type { Enums } from "@/lib/database.types";

// The landing page's booking chart: one campus day, a handful of resources, four slot columns.
// Public, so it shows initials only, never names or purposes.

export const CHART_SLOTS = [
  { label: "09:00", from: "09:00", to: "11:00" },
  { label: "11:00", from: "11:00", to: "13:00" },
  { label: "14:00", from: "14:00", to: "16:00" },
  { label: "16:00", from: "16:00", to: "18:00" },
] as const;

export type ChartCell =
  | { kind: "cnf"; initials: string }
  | { kind: "draw"; count: number }
  | { kind: "asked"; count: number }
  | { kind: "open" }
  | { kind: "closed" };

export type ChartRow = { id: string; name: string; location: string; needs: string | null; cells: ChartCell[] };

const HELD: Enums<"booking_status">[] = ["approved", "checked_in", "overdue"];
const WAITING: Enums<"booking_status">[] = ["requested", "in_draw", "waitlisted"];
const DEMAND_ORDER = { high: 0, medium: 1, low: 2 } as Record<string, number>;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => !/^(dr|prof)\.?$/i.test(w))
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function isoDate(p: ReturnType<typeof campusParts>) {
  return `${p.year}-${String(p.month + 1).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export async function bookingChart(orgId: string, limit = 5) {
  const db = createAdminClient();
  const now = new Date();

  const { data: resources } = await db
    .from("resources")
    .select("id, name, location, demand, org:organizations(name), windows:availability_windows(weekday, start_time, end_time), requirements:resource_requirements(badge:skill_badges(name))")
    .eq("org_id", orgId)
    .eq("status", "active");
  const all = resources ?? [];

  // Of the next few campus days that have anything open, show the busiest: that is where the chart has something to say.
  const ids = all.map((r) => r.id);
  const { data: upcoming } = await db
    .from("bookings")
    .select("resource_id, starts_at, ends_at, status, user:profiles!bookings_user_id_fkey(full_name)")
    .in("resource_id", ids)
    .in("status", [...HELD, ...WAITING])
    .gt("ends_at", now.toISOString())
    .lt("starts_at", new Date(now.getTime() + 6 * 24 * 3_600_000).toISOString());
  const startOffset = campusParts(now).minutes >= 17 * 60 ? 1 : 0;
  const candidates = Array.from({ length: 5 }, (_, i) => new Date(now.getTime() + (i + startOffset) * 24 * 3_600_000)).filter((d) =>
    all.some((r) => r.windows.some((w) => w.weekday === campusParts(d).weekday)),
  );
  const onDay = (d: Date) => (upcoming ?? []).filter((b) => isoDate(campusParts(new Date(b.starts_at))) === isoDate(campusParts(d)));
  const day = candidates.reduce((best, d) => (onDay(d).length > onDay(best).length ? d : best), candidates[0] ?? now);
  const p = campusParts(day);
  const date = isoDate(p);
  const dayStart = campusInstant(date, "00:00").getTime();
  const dayEnd = campusInstant(date, "23:59").getTime();
  const list = (upcoming ?? []).filter((b) => new Date(b.starts_at).getTime() < dayEnd && new Date(b.ends_at).getTime() > dayStart);

  const busy = (id: string) => list.filter((b) => b.resource_id === id).length;
  const picked = [...all]
    .sort((a, b) => busy(b.id) - busy(a.id) || (DEMAND_ORDER[a.demand] ?? 3) - (DEMAND_ORDER[b.demand] ?? 3) || a.name.localeCompare(b.name))
    .slice(0, limit);

  const rows: ChartRow[] = picked.map((r) => {
    const windows = r.windows.filter((w) => w.weekday === p.weekday);
    const cells = CHART_SLOTS.map((slot): ChartCell => {
      const from = campusInstant(date, slot.from).getTime();
      const to = campusInstant(date, slot.to).getTime();
      const open = windows.some((w) => w.start_time.slice(0, 5) <= slot.from && w.end_time.slice(0, 5) >= slot.to);
      const overlapping = list.filter((b) => b.resource_id === r.id && new Date(b.starts_at).getTime() < to && new Date(b.ends_at).getTime() > from);
      const held = overlapping.find((b) => HELD.includes(b.status));
      if (held) return { kind: "cnf", initials: initials(held.user?.full_name ?? "") };
      const inDraw = overlapping.filter((b) => b.status === "in_draw").length;
      if (inDraw) return { kind: "draw", count: inDraw };
      const asked = overlapping.filter((b) => WAITING.includes(b.status)).length;
      if (asked) return { kind: "asked", count: asked };
      return open ? { kind: "open" } : { kind: "closed" };
    });
    const needs = r.requirements.flatMap((x) => (x.badge ? [x.badge.name] : []))[0] ?? null;
    return { id: r.id, name: r.name, location: r.location, needs, cells };
  });

  const openToday = all.filter((r) => r.windows.some((w) => w.weekday === p.weekday)).length;
  const ahead = Math.round((campusInstant(date, "00:00").getTime() - campusInstant(isoDate(campusParts(now)), "00:00").getTime()) / (24 * 3_600_000));
  const when = ahead === 0 ? "today" : ahead === 1 ? "tomorrow" : `on ${new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long" }).format(day)}`;
  const campus = all[0]?.org?.name ?? "";
  return { date, when, campus, dayLabel: new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long" }).format(day), rows, openToday, total: all.length };
}
