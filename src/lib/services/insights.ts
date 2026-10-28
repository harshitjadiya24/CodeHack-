import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gini, hoursOf, topShare } from "@/lib/domain/metrics";
import { campusParts } from "@/lib/domain/time";

const USED = ["checked_in", "overdue", "returned", "closed"];
const WEEKS = 6;
const OPEN_HOURS_PER_WEEK = 45;

export async function campusInsights(orgId: string) {
  const db = createAdminClient();
  const since = new Date(Date.now() - WEEKS * 7 * 24 * 3_600_000).toISOString();

  const [{ data: resources }, { data: bookings }, { data: incidents }, { data: draws }, { data: people }] = await Promise.all([
    db.from("resources").select("id, name, category, demand, rental_value_inr_per_hour, dept:departments(name)").eq("org_id", orgId).eq("status", "active"),
    db.from("bookings").select("id, resource_id, user_id, starts_at, ends_at, status, decision_receipt").gte("starts_at", since),
    db.from("incidents").select("id, type, status, strike_applied, created_at").gte("created_at", since),
    db.from("draw_windows").select("id, status").gte("created_at", since),
    db.from("profiles").select("id, role").eq("org_id", orgId),
  ]);

  const resIds = new Set((resources ?? []).map((r) => r.id));
  const mine = (bookings ?? []).filter((b) => resIds.has(b.resource_id));
  const used = mine.filter((b) => USED.includes(b.status));

  const perResource = (resources ?? [])
    .map((r) => {
      const hours = used.filter((b) => b.resource_id === r.id).reduce((s, b) => s + hoursOf(b), 0);
      return {
        ...r,
        hours,
        utilisation: Math.min(1, hours / (OPEN_HOURS_PER_WEEK * WEEKS)),
        value: hours * r.rental_value_inr_per_hour,
        idleHours: Math.max(0, OPEN_HOURS_PER_WEEK * WEEKS - hours),
      };
    })
    .sort((a, b) => b.utilisation - a.utilisation);

  const borrowers = (people ?? []).filter((p) => p.role === "student" || p.role === "researcher");
  const hoursByUser = borrowers.map((p) => used.filter((b) => b.user_id === p.id).reduce((s, b) => s + hoursOf(b), 0));

  // Weekday × hour heatmap of booked hours (campus clock), Mon–Sat 9:00–18:00.
  const heat = Array.from({ length: 6 }, () => Array.from({ length: 9 }, () => 0));
  for (const b of used) {
    for (let t = new Date(b.starts_at).getTime(); t < new Date(b.ends_at).getTime(); t += 3_600_000) {
      const p = campusParts(new Date(t));
      const row = (p.weekday + 6) % 7;
      const col = Math.floor(p.minutes / 60) - 9;
      if (row < 6 && col >= 0 && col < 9) heat[row][col] += 1;
    }
  }

  const decided = mine.filter((b) => b.decision_receipt);
  const firstTime = decided.filter((b) =>
    ((b.decision_receipt as { priority?: { breakdown?: { label: string }[] } })?.priority?.breakdown ?? []).some((x) => x.label.startsWith("First time")),
  ).length;

  return {
    weeks: WEEKS,
    totals: {
      bookings: used.length,
      hours: used.reduce((s, b) => s + hoursOf(b), 0),
      value: perResource.reduce((s, r) => s + r.value, 0),
      uniqueUsers: new Set(used.map((b) => b.user_id)).size,
      borrowers: borrowers.length,
      idleResources: perResource.filter((r) => r.utilisation < 0.1).length,
      avgUtilisation: perResource.length ? perResource.reduce((s, r) => s + r.utilisation, 0) / perResource.length : 0,
    },
    fairness: {
      gini: gini(hoursByUser),
      top20Share: topShare(hoursByUser, 0.2),
      firstTimeShare: decided.length ? firstTime / decided.length : 0,
      waitlisted: mine.filter((b) => b.decision_receipt && (b.decision_receipt as { outcome?: string }).outcome === "waitlisted").length,
      promoted: mine.filter((b) => (b.decision_receipt as { outcome?: string } | null)?.outcome === "promoted").length,
      drawsRun: (draws ?? []).filter((d) => d.status === "drawn").length,
    },
    safety: {
      incidents: (incidents ?? []).length,
      per100: used.length ? ((incidents ?? []).length / used.length) * 100 : 0,
      strikes: (incidents ?? []).filter((i) => i.strike_applied).length,
      open: (incidents ?? []).filter((i) => i.status !== "resolved").length,
    },
    perResource,
    heat,
  };
}
