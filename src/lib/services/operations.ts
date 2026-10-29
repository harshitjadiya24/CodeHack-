import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { OWNER_ROLES, type CurrentUser } from "@/lib/auth";
import type { Enums, Json, TablesUpdate } from "@/lib/database.types";
import { csvRecords } from "@/lib/domain/csv";
import { readInventory, type InventoryProblem, type InventoryRow } from "@/lib/domain/inventory";
import { matchRegister, readRegister, type RegisterMatch } from "@/lib/domain/register";
import { forecastNextWeek, idleResources, weeklyHours, type NudgeAction } from "@/lib/domain/forecast";
import { nextOpenSlot } from "@/lib/domain/nearby";
import { formatCampus } from "@/lib/domain/time";
import { audit, notify } from "./records";
import type { ServiceResult } from "./bookings";

// Running Baanto at a real college: bulk imports for the admin office, planned maintenance, nudges about idle
// equipment, a look at next week, feedback after a return, and a private calendar feed.

type Db = ReturnType<typeof createAdminClient>;
const USED: Enums<"booking_status">[] = ["checked_in", "overdue", "returned", "closed"];
const HOLDS: Enums<"booking_status">[] = ["approved", "checked_in", "overdue"];
const MAX_ROWS = 1000;

async function emailsOf(db: Db, ids: string[]): Promise<Map<string, string>> {
  // Profiles don't hold email; auth does. One page of 1000 covers any single institute's staff.
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  const wanted = new Set(ids);
  return new Map((data?.users ?? []).filter((u) => wanted.has(u.id) && u.email).map((u) => [u.id, u.email!.toLowerCase()]));
}

// ── Inventory import ─────────────────────────────────────────────────────────
export type InventoryPreview = { rows: InventoryRow[]; problems: InventoryProblem[]; skipped: InventoryProblem[] };

export async function importInventory(admin: CurrentUser, csv: string, commit: boolean): Promise<ServiceResult & { preview?: InventoryPreview }> {
  if (admin.role !== "admin" && admin.role !== "manager") return { ok: false, error: "Only the admin office or a manager can import inventory." };
  const { headers, records } = csvRecords(csv);
  if (!headers.includes("name")) return { ok: false, error: "The first row must be the column names, including “name”. Download the template to start from." };
  if (records.length > MAX_ROWS) return { ok: false, error: `That’s ${records.length} rows. Import up to ${MAX_ROWS} at a time.` };

  const db = createAdminClient();
  const [{ data: depts }, { data: badges }, { data: staff }, { data: existing }] = await Promise.all([
    db.from("departments").select("id, code").eq("org_id", admin.org_id),
    db.from("skill_badges").select("id, code").eq("org_id", admin.org_id),
    db.from("profiles").select("id").eq("org_id", admin.org_id).in("role", OWNER_ROLES),
    db.from("resources").select("name").eq("org_id", admin.org_id).neq("status", "retired"),
  ]);
  const emails = await emailsOf(db, (staff ?? []).map((s) => s.id));
  const preview = readInventory(records, {
    departments: (depts ?? []).map((d) => d.code),
    badges: (badges ?? []).map((b) => b.code),
    owners: [...emails.values()],
    existingNames: (existing ?? []).map((r) => r.name),
  });
  if (!commit) return { ok: true, message: "Checked", preview };
  if (!preview.rows.length) return { ok: false, error: "Nothing to import. Fix the rows listed and upload again.", preview };

  const deptId = new Map((depts ?? []).map((d) => [d.code.toUpperCase(), d.id]));
  const badgeId = new Map((badges ?? []).map((b) => [b.code.toUpperCase(), b.id]));
  const ownerId = new Map([...emails].map(([id, email]) => [email, id]));
  const { data: created, error } = await db
    .from("resources")
    .insert(
      preview.rows.map((r) => ({
        org_id: admin.org_id,
        dept_id: r.department ? deptId.get(r.department)! : null,
        owner_id: (r.ownerEmail && ownerId.get(r.ownerEmail)) || admin.id,
        name: r.name,
        kind: r.kind,
        category: r.category,
        location: r.location,
        description: r.description,
        demand: r.demand,
        credit_rate: r.creditRate,
        deposit_inr: r.depositInr,
        rental_value_inr_per_hour: r.rentalValue,
        max_hours: r.maxHours,
        requires_supervision: r.requiresSupervision,
        auto_approve: r.autoApprove,
        checklist: r.checklist as unknown as Json,
        photo_slots: r.photoSlots as unknown as Json,
        lat: r.lat,
        lng: r.lng,
      })),
    )
    .select("id, name");
  if (error || !created) return { ok: false, error: error?.message ?? "Import failed. Nothing was added." };

  const byName = new Map(created.map((c) => [c.name, c.id]));
  const requirements = preview.rows.flatMap((r) => r.badges.map((code) => ({ resource_id: byName.get(r.name)!, badge_id: badgeId.get(code)! })));
  await Promise.all([
    db.from("availability_windows").insert(created.flatMap((c) => [1, 2, 3, 4, 5].map((weekday) => ({ resource_id: c.id, weekday, start_time: "09:00", end_time: "18:00" })))),
    requirements.length ? db.from("resource_requirements").insert(requirements) : Promise.resolve(),
  ]);
  await audit(db, {
    orgId: admin.org_id,
    actorId: admin.id,
    action: "resource.imported",
    entity: "organization",
    entityId: admin.org_id,
    reason: `${created.length} resources imported from a spreadsheet`,
    payload: { names: created.map((c) => c.name), skipped: preview.skipped.length, problems: preview.problems.length } as Json,
  });
  return { ok: true, message: `${created.length} resources listed, open Monday to Friday 9:00–18:00. Owners can change hours and photos from their listings.`, preview };
}

// ── Verifying students from the college register ──────────────────────────────
export async function verifyFromRegister(
  admin: CurrentUser,
  csv: string,
  commit: boolean,
): Promise<ServiceResult & { match?: RegisterMatch; problems?: { line: number; message: string }[] }> {
  if (admin.role !== "admin") return { ok: false, error: "Only the admin office verifies identities." };
  const { records } = csvRecords(csv);
  if (records.length > 20_000) return { ok: false, error: "Upload up to 20,000 rows at a time." };
  const { entries, problems } = readRegister(records);
  if (!entries.length) return { ok: false, error: "No roll numbers found. The file needs a “roll_no” column.", problems };

  const db = createAdminClient();
  const { data: people } = await db.from("profiles").select("id, roll_no, full_name, verified").eq("org_id", admin.org_id).in("role", ["student", "researcher"]);
  const match = matchRegister(
    entries,
    (people ?? []).map((p) => ({ id: p.id, rollNo: p.roll_no, fullName: p.full_name, verified: p.verified })),
  );
  if (!commit) return { ok: true, message: "Checked", match, problems };
  if (!match.verify.length) return { ok: false, error: "Nobody new to verify.", match, problems };

  const ids = match.verify.map((v) => v.id);
  await db.from("profiles").update({ verified: true }).in("id", ids).eq("org_id", admin.org_id);
  for (const v of match.verify) {
    await audit(db, { orgId: admin.org_id, actorId: admin.id, action: "user.verified", entity: "profile", entityId: v.id, reason: `Roll number ${v.rollNo} found in the college register` });
  }
  await db.from("notifications").insert(
    ids.map((id) => ({ user_id: id, kind: "user.verified", title: "Your campus identity is verified", body: "Your roll number matched the college register.", link: "/passport" })),
  );
  return { ok: true, message: `${ids.length} people verified.`, match, problems };
}

// ── Planned maintenance ──────────────────────────────────────────────────────
async function managedResource(user: CurrentUser, resourceId: string) {
  const db = createAdminClient();
  const { data: r } = await db.from("resources").select("*").eq("id", resourceId).single();
  if (!r || r.org_id !== user.org_id) return { db, r: null };
  const allowed = user.role === "manager" || user.role === "admin" || (user.role === "owner" && r.owner_id === user.id);
  return { db, r: allowed ? r : null };
}

/**
 * Block a window for maintenance. People already booked inside it are told, with the next free slot of the same
 * length offered as a suggestion; their bookings stay until they or the owner decide, so nobody loses a slot silently.
 */
export async function scheduleMaintenance(user: CurrentUser, input: { resourceId: string; startsAt: Date; endsAt: Date; reason: string }): Promise<ServiceResult> {
  const { db, r } = await managedResource(user, input.resourceId);
  if (!r) return { ok: false, error: "Only this resource's owner or a manager can plan its maintenance." };
  if (input.endsAt <= input.startsAt) return { ok: false, error: "The end must be after the start." };
  if (input.endsAt.getTime() < Date.now()) return { ok: false, error: "That window is already over." };
  if (input.endsAt.getTime() - input.startsAt.getTime() > 60 * 24 * 3_600_000) return { ok: false, error: "Plan at most 60 days at once. For longer, mark it out of service." };
  if (input.reason.trim().length < 5) return { ok: false, error: "Say what the maintenance is; borrowers see it." };

  const start = input.startsAt.toISOString();
  const end = input.endsAt.toISOString();
  const { error } = await db.from("maintenance_windows").insert({ resource_id: r.id, starts_at: start, ends_at: end, reason: input.reason.trim(), created_by: user.id });
  if (error) return { ok: false, error: error.message };
  const when = `${formatCampus(start)} – ${formatCampus(end)}`;
  await audit(db, { orgId: r.org_id, actorId: user.id, action: "resource.maintenance_planned", entity: "resource", entityId: r.id, reason: input.reason.trim(), payload: { starts_at: start, ends_at: end } });

  const [{ data: affected }, { data: windows }, { data: busy }] = await Promise.all([
    db.from("bookings").select("id, user_id, starts_at, ends_at").eq("resource_id", r.id).in("status", ["approved", "requested", "in_draw", "waitlisted"]).lt("starts_at", end).gt("ends_at", start),
    db.from("availability_windows").select("weekday, start_time, end_time").eq("resource_id", r.id),
    db.from("bookings").select("starts_at, ends_at").eq("resource_id", r.id).in("status", HOLDS).gt("ends_at", end),
  ]);
  const open = (windows ?? []).map((w) => ({ weekday: w.weekday, startTime: w.start_time, endTime: w.end_time }));
  const taken = [...(busy ?? []).map((b) => ({ startsAt: b.starts_at, endsAt: b.ends_at })), { startsAt: start, endsAt: end }];
  for (const b of affected ?? []) {
    const minutes = (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60_000;
    const next = nextOpenSlot(open, taken, input.endsAt, minutes);
    await notify(db, {
      userId: b.user_id,
      kind: "resource.maintenance_planned",
      title: `Maintenance during your slot: ${r.name}`,
      body: `${input.reason.trim()} (${when}).${next ? ` The next free slot of the same length starts ${formatCampus(next.startsAt)}.` : ""} Cancel and request again, or wait to hear from the owner.`,
      link: `/bookings/${b.id}`,
    });
  }
  return { ok: true, message: affected?.length ? `Planned. ${affected.length} people booked in that window were told, with a suggested new slot.` : "Planned. New requests in that window are refused with your reason." };
}

export async function cancelMaintenance(user: CurrentUser, windowId: string): Promise<ServiceResult> {
  const db = createAdminClient();
  const { data: w } = await db.from("maintenance_windows").select("id, resource_id, reason").eq("id", windowId).single();
  if (!w) return { ok: false, error: "Not found." };
  const { r } = await managedResource(user, w.resource_id);
  if (!r) return { ok: false, error: "Only this resource's owner or a manager can change its maintenance." };
  await db.from("maintenance_windows").delete().eq("id", w.id);
  await audit(db, { orgId: r.org_id, actorId: user.id, action: "resource.maintenance_cancelled", entity: "resource", entityId: r.id, reason: w.reason });
  return { ok: true, message: "Maintenance window removed. The slot can be booked again." };
}

// ── Idle equipment and next week ───────────────────────────────────────────────
export async function operationsInsights(orgId: string) {
  const db = createAdminClient();
  const now = new Date();
  const { data: resources } = await db
    .from("resources")
    .select("id, name, created_at, auto_approve, requires_supervision, open_to_partners, demand, credit_rate")
    .eq("org_id", orgId)
    .eq("status", "active");
  const ids = (resources ?? []).map((r) => r.id);
  const [{ data: past }, { data: ahead }] = await Promise.all([
    db.from("bookings").select("resource_id, starts_at, ends_at").in("resource_id", ids).in("status", USED).gte("starts_at", new Date(now.getTime() - 28 * 86_400_000).toISOString()),
    db.from("bookings").select("resource_id, starts_at, ends_at").in("resource_id", ids).in("status", [...HOLDS, "requested", "in_draw"]).gte("starts_at", now.toISOString()).lt("starts_at", new Date(now.getTime() + 7 * 86_400_000).toISOString()),
  ]);
  const hoursOf = (b: { starts_at: string; ends_at: string }) => (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 3_600_000;

  const idle = idleResources(
    (resources ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      // Seeded or imported listings can be newer than their booking history: whichever is older counts.
      createdAt: [r.created_at, ...(past ?? []).filter((b) => b.resource_id === r.id).map((b) => b.starts_at)].sort()[0],
      autoApprove: r.auto_approve,
      requiresSupervision: r.requires_supervision,
      openToPartners: r.open_to_partners,
      demand: r.demand,
      creditRate: r.credit_rate,
      hours4w: (past ?? []).filter((b) => b.resource_id === r.id).reduce((s, b) => s + hoursOf(b), 0),
    })),
    now,
  );
  const forecast = (resources ?? [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      ...forecastNextWeek(
        weeklyHours((past ?? []).filter((b) => b.resource_id === r.id), now),
        (ahead ?? []).filter((b) => b.resource_id === r.id).reduce((s, b) => s + hoursOf(b), 0),
      ),
    }))
    .filter((f) => f.level !== "quiet")
    .sort((a, b) => b.utilisation - a.utilisation);
  return { idle, forecast };
}

const NUDGES: Record<NudgeAction, { patch: TablesUpdate<"resources">; done: string }> = {
  instant_approval: { patch: { auto_approve: true }, done: "Instant approval is on. Eligible students get it straight away." },
  open_to_partners: { patch: { open_to_partners: true }, done: "Open to partner campuses. Endorsed students nearby can now book it." },
  normal_demand: { patch: { demand: "normal" }, done: "Marked normal demand. Clashes no longer wait for a Fair Draw." },
  fewer_credits: { patch: { credit_rate: 1 }, done: "Now costs 1 credit an hour." },
};

export async function applyNudge(user: CurrentUser, resourceId: string, action: NudgeAction): Promise<ServiceResult> {
  const nudge = NUDGES[action];
  if (!nudge) return { ok: false, error: "Unknown change." };
  const { db, r } = await managedResource(user, resourceId);
  if (!r) return { ok: false, error: "Only this resource's owner or the admin office can change it." };
  if (action === "instant_approval" && r.requires_supervision) return { ok: false, error: "Supervised resources always need a person to approve." };
  await db.from("resources").update(nudge.patch).eq("id", r.id);
  await audit(db, { orgId: r.org_id, actorId: user.id, action: "resource.updated", entity: "resource", entityId: r.id, reason: `Idle for a month: ${action.replace(/_/g, " ")}`, payload: nudge.patch as Json });
  if (r.owner_id !== user.id) {
    await notify(db, { userId: r.owner_id, kind: "resource.updated", title: `${r.name} was changed to get more use`, body: nudge.done, link: `/owner/resources/${r.id}/edit` });
  }
  return { ok: true, message: nudge.done };
}

// ── Feedback after a return ───────────────────────────────────────────────────
export async function saveFeedback(user: CurrentUser, input: { bookingId: string; rating: number; comment: string }): Promise<ServiceResult> {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { ok: false, error: "Pick 1 to 5 stars." };
  const db = createAdminClient();
  const { data: b } = await db.from("bookings").select("id, user_id, status, resource_id, resource:resources(name, owner_id)").eq("id", input.bookingId).single();
  if (!b || b.user_id !== user.id) return { ok: false, error: "Only the person who borrowed can rate this." };
  if (!["returned", "closed"].includes(b.status)) return { ok: false, error: "You can rate it after you return it." };
  const comment = input.comment.trim().slice(0, 500) || null;
  const { error } = await db.from("booking_feedback").insert({ booking_id: b.id, resource_id: b.resource_id, user_id: user.id, rating: input.rating, comment });
  if (error) return { ok: false, error: error.code === "23505" ? "You’ve already rated this booking." : error.message };
  // A low score is usually a fault nobody reported. The owner hears about it the same day.
  if (input.rating <= 2 && b.resource) {
    await notify(db, {
      userId: b.resource.owner_id,
      kind: "feedback.low",
      title: `Low rating for ${b.resource.name}: ${input.rating}/5`,
      body: comment ?? "No comment given. Check its condition before the next booking.",
      link: `/owner/resources/${b.resource_id}/edit`,
    });
  }
  return { ok: true, message: "Thanks. Your rating helps the next person." };
}

export async function ratingFor(resourceId: string) {
  const { data } = await createAdminClient().from("booking_feedback").select("rating, comment, created_at").eq("resource_id", resourceId).order("created_at", { ascending: false }).limit(50);
  const rows = data ?? [];
  return {
    count: rows.length,
    average: rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : null,
    // Comments are shown without names.
    recent: rows.filter((r) => r.comment).slice(0, 3),
  };
}

// ── Calendar feed ─────────────────────────────────────────────────────────────
export async function calendarToken(userId: string, reset = false): Promise<string> {
  const db = createAdminClient();
  if (reset) await db.from("calendar_feeds").delete().eq("user_id", userId);
  const { data: existing } = await db.from("calendar_feeds").select("token").eq("user_id", userId).maybeSingle();
  if (existing) return existing.token;
  const { data } = await db.from("calendar_feeds").insert({ user_id: userId }).select("token").single();
  return data!.token;
}

export async function userForCalendarToken(token: string): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/.test(token)) return null;
  const { data } = await createAdminClient().from("calendar_feeds").select("user_id").eq("token", token).maybeSingle();
  return data?.user_id ?? null;
}
