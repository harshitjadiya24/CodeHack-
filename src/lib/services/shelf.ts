import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { nextOpenSlot, slotLabel } from "@/lib/domain/nearby";

// The landing hero's shelf: four real things from one campus, each with one true line about it right now.
// Public, so it says how many people are asking, never who.

export type ShelfItem = { id: string; name: string; category: string; place: string; tag: string };

const WAITING = ["requested", "in_draw", "waitlisted"] as const;
const HELD = ["approved", "checked_in", "overdue"] as const;

export async function shelfItems(orgId: string, count = 4): Promise<ShelfItem[]> {
  const db = createAdminClient();
  const now = new Date();
  const { data: resources } = await db
    .from("resources")
    .select("id, name, category, location, demand, windows:availability_windows(weekday, start_time, end_time)")
    .eq("org_id", orgId)
    .eq("status", "active");
  const all = resources ?? [];

  const { data: upcoming } = await db
    .from("bookings")
    .select("resource_id, starts_at, ends_at, status")
    .in("resource_id", all.map((r) => r.id))
    .in("status", [...HELD, ...WAITING])
    .gt("ends_at", now.toISOString())
    .lt("starts_at", new Date(now.getTime() + 9 * 24 * 3_600_000).toISOString());

  // One per category, busiest first, so the shelf shows range rather than four printers.
  const picked: typeof all = [];
  const seen = new Set<string>();
  for (const r of [...all].sort((a, b) => Number(b.demand === "high") - Number(a.demand === "high") || a.name.localeCompare(b.name))) {
    if (seen.has(r.category)) continue;
    seen.add(r.category);
    picked.push(r);
    if (picked.length === count) break;
  }

  return picked.map((r) => {
    const mine = (upcoming ?? []).filter((b) => b.resource_id === r.id);
    const asking = mine.filter((b) => (WAITING as readonly string[]).includes(b.status)).length;
    const open = nextOpenSlot(
      r.windows.map((w) => ({ weekday: w.weekday, startTime: w.start_time, endTime: w.end_time })),
      mine.filter((b) => (HELD as readonly string[]).includes(b.status)).map((b) => ({ startsAt: b.starts_at, endsAt: b.ends_at })),
      now,
    );
    const label = open ? slotLabel(open, now) : null;
    const tag =
      asking >= 2
        ? `${asking} people asking this week`
        : label
          ? label.startsWith("Open now")
            ? label
            : `Free ${label.replace(/^Today/, "today").replace(/^Tomorrow/, "tomorrow")}`
          : "Booked up this week";
    return { id: r.id, name: r.name, category: r.category, place: r.location.split(",").slice(0, 2).join(","), tag };
  });
}
