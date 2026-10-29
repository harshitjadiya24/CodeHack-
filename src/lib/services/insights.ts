import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gini, hoursOf, topShare } from "@/lib/domain/metrics";
import { academicYearStarting, campusParts } from "@/lib/domain/time";

const USED = ["checked_in", "overdue", "returned", "closed"];
const WEEKS = 6;
const OPEN_HOURS_PER_WEEK = 45;

export type Range = { from: Date; to: Date };

const WEEK_MS = 7 * 24 * 3_600_000;
const lastWeeks = (n: number): Range => ({ from: new Date(Date.now() - n * WEEK_MS), to: new Date() });

/** Utilisation, fairness and safety for one campus over `range` (default: the last six weeks). */
export async function campusInsights(orgId: string, range: Range = lastWeeks(WEEKS)) {
  const db = createAdminClient();
  const since = range.from.toISOString();
  const until = range.to.toISOString();
  // Utilisation is measured against the weeks that have actually happened, so a year in progress isn't diluted.
  const weeks = Math.max(1, (Math.min(range.to.getTime(), Date.now()) - range.from.getTime()) / WEEK_MS);

  const { data: resources } = await db
    .from("resources")
    .select("id, name, category, demand, rental_value_inr_per_hour, requires_supervision, dept:departments(name)")
    .eq("org_id", orgId)
    .neq("status", "retired");
  const ids = (resources ?? []).map((r) => r.id);
  const [{ data: bookings }, { data: incidents }, { data: draws }, { data: people }] = await Promise.all([
    db.from("bookings").select("id, resource_id, user_id, starts_at, ends_at, status, decision_receipt").in("resource_id", ids).gte("starts_at", since).lt("starts_at", until),
    db.from("incidents").select("id, type, status, strike_applied, created_at").in("resource_id", ids).gte("created_at", since).lt("created_at", until),
    db.from("draw_windows").select("id, status").in("resource_id", ids).gte("created_at", since).lt("created_at", until),
    db.from("profiles").select("id, role").eq("org_id", orgId),
  ]);

  const mine = bookings ?? [];
  const used = mine.filter((b) => USED.includes(b.status));

  const perResource = (resources ?? [])
    .map((r) => {
      const hours = used.filter((b) => b.resource_id === r.id).reduce((s, b) => s + hoursOf(b), 0);
      return {
        ...r,
        hours,
        bookings: used.filter((b) => b.resource_id === r.id).length,
        utilisation: Math.min(1, hours / (OPEN_HOURS_PER_WEEK * weeks)),
        value: hours * r.rental_value_inr_per_hour,
        idleHours: Math.max(0, OPEN_HOURS_PER_WEEK * weeks - hours),
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
    weeks: Math.round(weeks),
    used,
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

/**
 * The accreditation report for one academic year: campusInsights plus what NAAC Criterion IV (Infrastructure and
 * Learning Resources) asks institutions to evidence — what facilities exist, and the procedures for maintaining and
 * using them — and how far they are shared with other institutes.
 */
export async function accreditationReport(orgId: string, startYear: number) {
  const ay = academicYearStarting(startYear);
  const db = createAdminClient();
  const ins = await campusInsights(orgId, ay);
  const ids = ins.perResource.map((r) => r.id);
  const since = ay.from.toISOString();
  const until = ay.to.toISOString();

  const userIds = [...new Set(ins.used.map((b) => b.user_id))];
  const [{ data: users }, { data: handovers }, { data: maintenance }, { data: badges }, { data: endorsedOut }, { data: requirements }] = await Promise.all([
    userIds.length ? db.from("profiles").select("id, org_id, dept:departments(name)").in("id", userIds) : Promise.resolve({ data: [] as { id: string; org_id: string; dept: { name: string } | null }[] }),
    db.from("handovers").select("id, booking:bookings!inner(resource_id)").in("booking.resource_id", ids).gte("created_at", since).lt("created_at", until),
    db.from("audit_log").select("id").eq("org_id", orgId).eq("action", "resource.maintenance").gte("created_at", since).lt("created_at", until),
    db.from("user_badges").select("id, badge:skill_badges!inner(org_id)").eq("badge.org_id", orgId).eq("status", "verified").gte("issued_at", since).lt("issued_at", until),
    db.from("endorsements").select("id, host_org_id").eq("home_org_id", orgId).eq("status", "approved").gte("decided_at", since).lt("decided_at", until),
    db.from("resource_requirements").select("resource_id").in("resource_id", ids),
  ]);

  const byUser = new Map((users ?? []).map((u) => [u.id, u]));
  // Who used the facilities, by department, and how much came from partner institutes.
  const deptHours = new Map<string, number>();
  let guestHours = 0;
  const guests = new Set<string>();
  for (const b of ins.used) {
    const u = byUser.get(b.user_id);
    if (u && u.org_id !== orgId) {
      guestHours += hoursOf(b);
      guests.add(b.user_id);
      continue;
    }
    const dept = u?.dept?.name ?? "Not recorded";
    deptHours.set(dept, (deptHours.get(dept) ?? 0) + hoursOf(b));
  }

  // Month by month, July first.
  const months = Array.from({ length: 12 }, (_, i) => {
    const year = startYear + (i + 6 >= 12 ? 1 : 0);
    const month = (i + 6) % 12;
    const inMonth = ins.used.filter((b) => {
      const p = campusParts(new Date(b.starts_at));
      return p.year === year && p.month === month;
    });
    return { year, month, bookings: inMonth.length, hours: inMonth.reduce((s, b) => s + hoursOf(b), 0) };
  });

  const gated = new Set((requirements ?? []).map((r) => r.resource_id));
  return {
    ay,
    ...ins,
    perResource: ins.perResource.map((r) => ({ ...r, badgeGated: gated.has(r.id) })),
    departments: [...deptHours].map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours),
    months,
    sharing: { guestUsers: guests.size, guestHours, endorsementsGiven: (endorsedOut ?? []).length, partnerCampuses: new Set((endorsedOut ?? []).map((e) => e.host_org_id)).size },
    procedures: {
      handoverRecords: (handovers ?? []).length,
      maintenanceEvents: (maintenance ?? []).length,
      badgesVerified: (badges ?? []).length,
      badgeGated: gated.size,
      supervised: ins.perResource.filter((r) => r.requires_supervision).length,
    },
  };
}
