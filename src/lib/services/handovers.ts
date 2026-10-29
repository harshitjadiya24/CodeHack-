import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { OWNER_ROLES, STAFF_ROLES, type CurrentUser } from "@/lib/auth";
import { formatCampus } from "@/lib/domain/time";
import { compareCondition } from "@/lib/domain/condition";
import { aiEnabled, summariseIncident } from "@/lib/ai";
import type { Enums, Json, Tables } from "@/lib/database.types";
import { audit, notify } from "./records";
import type { ServiceResult } from "./bookings";

type Db = ReturnType<typeof createAdminClient>;
type Phase = Enums<"handover_phase">;

const CHECK_IN_EARLY_MIN = 30;
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const asJson = (v: unknown) => v as Json;

async function loadBooking(db: Db, bookingId: string) {
  const { data } = await db.from("bookings").select("*, resource:resources(*)").eq("id", bookingId).single();
  return data?.resource ? (data as Tables<"bookings"> & { resource: Tables<"resources"> }) : null;
}

async function apply(db: Db, bookingId: string, to: Enums<"booking_status">, actorId: string | null, reason: string, notifyTitle?: string) {
  return db.rpc("apply_booking_transition", {
    p_booking: bookingId,
    p_to: to,
    p_actor: actorId as string,
    p_reason: reason,
    p_notify_title: notifyTitle,
  });
}

/**
 * Opens the check-in window 30 minutes before the slot. `relaxed` (the demo campus, or DEMO_MODE) opens it at any
 * time, so a judge can walk the whole journey whenever they test; real institutes always get the real window.
 */
export function checkInWindow(startsAt: string, endsAt: string, relaxed = false, now = new Date()) {
  const opens = new Date(new Date(startsAt).getTime() - CHECK_IN_EARLY_MIN * 60_000);
  const closes = new Date(endsAt);
  return { open: relaxed || (now >= opens && now < closes), opens };
}

export const relaxedCheckIn = (user: Pick<CurrentUser, "isDemo">) => DEMO_MODE || user.isDemo;

async function uploadPhotos(db: Db, bookingId: string, phase: Phase, photos: File[]) {
  const paths: string[] = [];
  for (const [i, photo] of photos.entries()) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${bookingId}/${phase}/${i + 1}-${Date.now()}.${ext}`;
    const { error } = await db.storage.from("handovers").upload(path, photo, { contentType: photo.type, upsert: false });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    paths.push(path);
  }
  return paths;
}

export async function recordHandover(
  user: CurrentUser,
  input: { bookingId: string; phase: Phase; checklist: Record<string, boolean>; notes: string; photos: File[] },
): Promise<ServiceResult> {
  const db = createAdminClient();
  const b = await loadBooking(db, input.bookingId);
  if (!b) return { ok: false, error: "Booking not found." };
  if (b.user_id !== user.id) return { ok: false, error: "Only the person who booked can record this handover." };

  const slots = (b.resource.photo_slots as string[]) ?? [];
  if (input.photos.length < slots.length) return { ok: false, error: `Please add all ${slots.length} photos: ${slots.join(", ")}.` };
  if (input.photos.some((p) => p.size > 8 * 1024 * 1024)) return { ok: false, error: "Each photo must be under 8 MB." };

  if (input.phase === "check_in") {
    if (b.status !== "approved") return { ok: false, error: "Only approved bookings can be checked in." };
    const window = checkInWindow(b.starts_at, b.ends_at, relaxedCheckIn(user));
    if (!window.open) return { ok: false, error: `Check-in opens at ${formatCampus(window.opens)}.` };
  } else if (!["checked_in", "overdue"].includes(b.status)) {
    return { ok: false, error: "This booking is not checked in." };
  }

  const photoPaths = await uploadPhotos(db, b.id, input.phase, input.photos);

  let aiSummary: string | null = null;
  let aiFlag: boolean | null = null;
  if (input.phase === "return") {
    const { data: before } = await db.from("handovers").select("checklist, notes").eq("booking_id", b.id).eq("phase", "check_in").maybeSingle();
    const diff = compareCondition({
      items: (b.resource.checklist as string[]) ?? [],
      before: (before?.checklist ?? {}) as Record<string, boolean>,
      after: input.checklist,
      returnNotes: input.notes,
    });
    aiSummary = diff.summary;
    aiFlag = diff.flag;
  }

  const { data: handover, error } = await db
    .from("handovers")
    .insert({
      booking_id: b.id,
      phase: input.phase,
      checklist: asJson(input.checklist),
      notes: input.notes,
      photo_paths: photoPaths,
      recorded_by: user.id,
      ai_summary: aiSummary,
      ai_flag: aiFlag,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.code === "23505" ? "This handover was already recorded." : error.message };

  const failed = Object.entries(input.checklist).filter(([, ok]) => !ok).map(([item]) => item);
  await audit(db, {
    orgId: b.resource.org_id,
    actorId: user.id,
    action: `handover.${input.phase}`,
    entity: "booking",
    entityId: b.id,
    reason: input.notes || (failed.length ? `Issues: ${failed.join(", ")}` : "All checklist items OK"),
    payload: asJson({ handover_id: handover.id, photos: photoPaths.length, failed_items: failed, demo_mode: relaxedCheckIn(user) }),
  });

  if (input.phase === "check_in") {
    if (b.resource.requires_supervision) {
      await notifyAttendants(db, b, `Supervised check-in waiting: ${b.resource.name}`);
      return { ok: true, message: "Condition recorded. A lab attendant must confirm before you start." };
    }
    await apply(db, b.id, "checked_in", user.id, "Checked in with condition record");
    await notify(db, { userId: b.resource.owner_id, kind: "handover.check_in", title: `Checked in: ${b.resource.name}`, body: user.full_name, link: `/bookings/${b.id}` });
    return { ok: true, message: "Checked in. Enjoy, and return on time." };
  }

  const late = Date.now() > new Date(b.ends_at).getTime() + 10 * 60_000;
  await apply(db, b.id, "returned", user.id, late ? "Returned late" : "Returned on time");
  if (late) {
    const minutes = Math.round((Date.now() - new Date(b.ends_at).getTime()) / 60_000);
    await createIncident(db, b, {
      type: "delay",
      severity: minutes > 120 ? "medium" : "low",
      description: `Returned ${minutes} minutes after the booked end time.`,
      reportedBy: null,
      proposedAction: minutes > 120 ? "Consider a strike if this repeats." : "Reminder only.",
    });
  }
  await notify(db, {
    userId: b.resource.owner_id,
    kind: "handover.return",
    title: `Returned, please verify: ${b.resource.name}`,
    body: aiFlag ? "Condition check flagged possible issues." : "Condition matches check-in.",
    link: `/bookings/${b.id}`,
  });
  return { ok: true, message: "Returned. The owner will verify the condition." };
}

async function notifyAttendants(db: Db, b: Tables<"bookings"> & { resource: Tables<"resources"> }, title: string) {
  const { data: attendants } = await db.from("profiles").select("id").eq("org_id", b.resource.org_id).eq("role", "attendant");
  for (const a of attendants ?? []) await notify(db, { userId: a.id, kind: "handover.supervise", title, link: "/attendant" });
}

export async function confirmSupervisedCheckIn(attendant: CurrentUser, bookingId: string): Promise<ServiceResult> {
  if (!["attendant", ...STAFF_ROLES].includes(attendant.role)) return { ok: false, error: "Only lab attendants can confirm supervised check-ins." };
  const db = createAdminClient();
  const b = await loadBooking(db, bookingId);
  if (!b || b.resource.org_id !== attendant.org_id) return { ok: false, error: "Booking not found." };
  const { data: h } = await db.from("handovers").select("id, attendant_confirmed_at").eq("booking_id", bookingId).eq("phase", "check_in").maybeSingle();
  if (!h) return { ok: false, error: "The borrower has not recorded the check-in condition yet." };
  if (h.attendant_confirmed_at) return { ok: false, error: "Already confirmed." };

  await db.from("handovers").update({ attendant_id: attendant.id, attendant_confirmed_at: new Date().toISOString() }).eq("id", h.id);
  await audit(db, { orgId: b.resource.org_id, actorId: attendant.id, action: "handover.attendant_confirmed", entity: "booking", entityId: b.id, reason: "Attendant present and satisfied with condition" });
  const { error } = await apply(db, b.id, "checked_in", attendant.id, "Supervised check-in confirmed", `You're checked in: ${b.resource.name}`);
  return error ? { ok: false, error: error.message } : { ok: true, message: "Confirmed. The session has started." };
}

export async function verifyReturn(
  owner: CurrentUser,
  input: { bookingId: string; outcome: "ok" | "issue"; notes: string; severity?: Enums<"severity"> },
): Promise<ServiceResult> {
  const db = createAdminClient();
  const b = await loadBooking(db, input.bookingId);
  if (!b) return { ok: false, error: "Booking not found." };
  if (!STAFF_ROLES.includes(owner.role) && !(OWNER_ROLES.includes(owner.role) && b.resource.owner_id === owner.id)) {
    return { ok: false, error: "Only the owner or a manager can verify returns." };
  }
  if (b.status !== "returned") return { ok: false, error: "This booking is not waiting for verification." };
  if (input.outcome === "issue" && !input.notes.trim()) return { ok: false, error: "Describe the issue so the manager can review it." };

  if (input.outcome === "issue") {
    await createIncident(db, b, {
      type: "damage",
      severity: input.severity ?? "medium",
      description: input.notes,
      reportedBy: owner.id,
      proposedAction: null,
    });
  }
  const { error } = await apply(
    db,
    b.id,
    "closed",
    owner.id,
    input.outcome === "ok" ? `Condition verified: ${input.notes || "matches check-in"}` : `Closed with incident: ${input.notes}`,
    input.outcome === "ok" ? `Return verified: ${b.resource.name}` : `Issue reported on return: ${b.resource.name}`,
  );
  return error ? { ok: false, error: error.message } : { ok: true, message: input.outcome === "ok" ? "Verified and closed." : "Closed and sent to the manager for review." };
}

export async function createIncident(
  db: Db,
  b: Tables<"bookings"> & { resource: Tables<"resources"> },
  i: { type: Enums<"incident_type">; severity: Enums<"severity">; description: string; reportedBy: string | null; proposedAction: string | null },
) {
  const { data } = await db
    .from("incidents")
    .insert({
      booking_id: b.id,
      resource_id: b.resource_id,
      reported_by: i.reportedBy,
      type: i.type,
      severity: i.severity,
      description: i.description,
      proposed_action: i.proposedAction,
    })
    .select("id")
    .single();
  if (data && aiEnabled()) {
    const ai = await summariseIncident(`${i.type} on ${b.resource.name}: ${i.description}`);
    if (ai) await db.from("incidents").update({ ai_summary: `${ai.summary} (Suggested severity: ${ai.suggestedSeverity})` }).eq("id", data.id);
  }
  await audit(db, {
    orgId: b.resource.org_id,
    actorId: i.reportedBy,
    action: "incident.reported",
    entity: "booking",
    entityId: b.id,
    reason: `${i.type} (${i.severity}): ${i.description}`,
    payload: asJson({ incident_id: data?.id }),
  });
  const { data: managers } = await db.from("profiles").select("id").eq("org_id", b.resource.org_id).eq("role", "manager");
  for (const m of managers ?? []) {
    await notify(db, { userId: m.id, kind: "incident.new", title: `New ${i.type} incident: ${b.resource.name}`, body: i.description, link: "/manager" });
  }
  await notify(db, { userId: b.user_id, kind: "incident.new", title: `An incident was recorded on your booking`, body: `${i.type}: ${i.description}. A manager will review it; you can respond there.`, link: `/bookings/${b.id}` });
}

export async function reportIncident(
  user: CurrentUser,
  input: { bookingId: string; type: Enums<"incident_type">; severity: Enums<"severity">; description: string },
): Promise<ServiceResult> {
  const db = createAdminClient();
  const b = await loadBooking(db, input.bookingId);
  if (!b) return { ok: false, error: "Booking not found." };
  const involved = b.user_id === user.id || b.resource.owner_id === user.id || ["attendant", ...STAFF_ROLES].includes(user.role);
  if (!involved) return { ok: false, error: "You are not part of this booking." };
  await createIncident(db, b, { ...input, reportedBy: user.id, proposedAction: null });
  return { ok: true, message: "Incident recorded and sent to the manager." };
}

/** Short-lived links for photos; callers must already have authorised access to the booking. */
export async function signedHandoverPhotos(bookingId: string) {
  const db = createAdminClient();
  const { data: rows } = await db.from("handovers").select("*").eq("booking_id", bookingId).order("created_at");
  const out: (Tables<"handovers"> & { urls: string[] })[] = [];
  for (const h of rows ?? []) {
    const { data } = h.photo_paths.length ? await db.storage.from("handovers").createSignedUrls(h.photo_paths, 600) : { data: [] };
    out.push({ ...h, urls: (data ?? []).map((d) => d.signedUrl ?? "") });
  }
  return out;
}
