import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { OWNER_ROLES, STAFF_ROLES, type CurrentUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/demo";
import { checkUsageRules, creditCost, priorityScore, type Priority, type RuleViolation } from "@/lib/domain/fairness";
import type { EligibilityCheck } from "@/lib/domain/eligibility";
import { commitFor, newSeed, runDraw } from "@/lib/domain/draw";
import { receipt, type DecisionReceipt } from "@/lib/domain/receipt";
import { promotionOrder, renumber, type Queued } from "@/lib/domain/waitlist";
import { formatCampus } from "@/lib/domain/time";
import type { Enums, Json, Tables } from "@/lib/database.types";
import { bookingHistory, eligibilityFor, loadResourceContext } from "./context";
import { audit, notify } from "./records";

type Db = ReturnType<typeof createAdminClient>;
type Status = Enums<"booking_status">;

// `checks`/`violations` carry the same reasons as message codes, so the page can show them in the reader's language.
export type ServiceResult =
  | { ok: true; bookingId?: string; message: string }
  | { ok: false; error: string; reasons?: string[]; checks?: EligibilityCheck[]; violations?: RuleViolation[] };

const HOLDS_SLOT: Status[] = ["approved", "checked_in", "overdue"];
const PENDING: Status[] = ["requested", "in_draw"];

const asJson = (v: unknown) => v as Json;
const person = (u: CurrentUser): DecisionReceipt["decidedBy"] => ({ kind: "person", name: u.full_name, role: ROLE_LABEL[u.role] });

async function overlapping(db: Db, resourceId: string, start: string, end: string, statuses: Status[]) {
  const { data } = await db
    .from("bookings")
    .select("*")
    .eq("resource_id", resourceId)
    .in("status", statuses)
    .lt("starts_at", end)
    .gt("ends_at", start)
    .order("priority_score", { ascending: false });
  return data ?? [];
}

async function transition(
  db: Db,
  args: { bookingId: string; to: Status; actorId: string | null; reason?: string; receipt?: DecisionReceipt; extra?: Record<string, unknown>; notify?: { title: string; body?: string } },
) {
  const patch: Record<string, unknown> = { ...(args.extra ?? {}) };
  if (args.receipt) patch.decision_receipt = args.receipt;
  const { data, error } = await db.rpc("apply_booking_transition", {
    p_booking: args.bookingId,
    p_to: args.to,
    // The function accepts null for system actions; the generated type is stricter than the SQL.
    p_actor: args.actorId as string,
    p_reason: args.reason,
    p_patch: asJson(patch),
    p_notify_title: args.notify?.title,
    p_notify_body: args.notify?.body ?? "",
  });
  return { data, error };
}

function canManage(actor: CurrentUser, resource: Tables<"resources">) {
  return STAFF_ROLES.includes(actor.role) || (OWNER_ROLES.includes(actor.role) && resource.owner_id === actor.id);
}

// ── Request ───────────────────────────────────────────────────────────────────
export async function requestBooking(
  user: CurrentUser,
  input: { resourceId: string; startsAt: Date; endsAt: Date; purpose: string; deadlineNote?: string },
): Promise<ServiceResult> {
  const db = createAdminClient();
  const ctx = await loadResourceContext(db, input.resourceId);
  if (!ctx) return { ok: false, error: "Resource not found." };
  const { resource } = ctx;

  const eligibility = await eligibilityFor(db, user, ctx);
  if (!eligibility.eligible) {
    const blocked = eligibility.checks.filter((c) => c.blocking && !c.passed);
    return {
      ok: false,
      error: "You are not eligible for this resource yet.",
      reasons: blocked.map((c) => `${c.reason} ${c.howToFix ?? ""}`.trim()),
      checks: blocked,
    };
  }

  const history = await bookingHistory(db, user.id);
  const slot = { resourceId: resource.id, startsAt: input.startsAt, endsAt: input.endsAt };
  const violations = checkUsageRules({ config: ctx.config, resource: ctx.rules, slot, history });
  if (violations.length) {
    return { ok: false, error: "This request breaks a fair-use rule.", reasons: violations.map((v) => v.reason), violations };
  }

  const start = input.startsAt.toISOString();
  const end = input.endsAt.toISOString();
  const mine = (await overlapping(db, resource.id, start, end, [...PENDING, "waitlisted", ...HOLDS_SLOT])).filter((b) => b.user_id === user.id);
  if (mine.length) return { ok: false, error: "You already have a booking or request that overlaps this time." };

  const priority = priorityScore({
    config: ctx.config,
    resourceId: resource.id,
    history,
    strikes: user.strikes,
    hasDeadline: !!input.deadlineNote?.trim(),
  });
  const base = {
    resource_id: resource.id,
    user_id: user.id,
    starts_at: start,
    ends_at: end,
    purpose: input.purpose,
    deadline_note: input.deadlineNote?.trim() || null,
    credits: creditCost(slot, ctx.rules),
    priority_score: priority.score,
    priority_breakdown: asJson(priority.breakdown),
  };
  const when = `${formatCampus(start)} – ${formatCampus(end, { day: undefined, month: undefined })}`;

  // 1. Slot already held → waitlist with a position.
  const holders = await overlapping(db, resource.id, start, end, HOLDS_SLOT);
  if (holders.length) {
    const queue = await overlapping(db, resource.id, start, end, ["waitlisted"]);
    const position = queue.length + 1;
    const r = receipt({
      outcome: "waitlisted",
      headline: `Waitlisted at position #${position}`,
      reasons: [
        "Another person already holds this slot.",
        "If it frees up, Baanto promotes the next eligible person on the waitlist automatically and notifies them.",
      ],
      decidedBy: { kind: "system" },
      priority,
    });
    const { data, error } = await db
      .from("bookings")
      .insert({ ...base, status: "waitlisted", waitlist_position: position, decision_receipt: asJson(r) })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    await audit(db, { orgId: resource.org_id, actorId: user.id, action: "booking.waitlisted", entity: "booking", entityId: data.id, reason: r.headline, payload: asJson({ resource: resource.name, when, position }) });
    return { ok: true, bookingId: data.id, message: r.headline };
  }

  // 2. Competing pending requests on a high-demand resource → Fair Draw.
  const competing = (await overlapping(db, resource.id, start, end, PENDING)).filter((b) => b.user_id !== user.id);
  if (competing.length && resource.demand === "high") {
    const drawId = await ensureDraw(db, resource, competing, start, end);
    const { data: draw } = await db.from("draw_windows").select("commit_hash").eq("id", drawId).single();
    const drawInfo = { drawId, commit: draw!.commit_hash };
    const drawReceipt = (p?: Priority) =>
      receipt({
        outcome: "in_draw",
        headline: "Entered into a Fair Draw",
        reasons: [
          "Several people asked for overlapping time on a high-demand resource.",
          "A weighted lottery decides. Your weight is your priority score, shown below.",
          "The draw seed was locked in before the draw (commit hash below), so anyone can verify the result afterwards.",
        ],
        decidedBy: { kind: "system" },
        priority: p,
        draw: drawInfo,
      });

    for (const other of competing.filter((b) => b.status === "requested")) {
      await db.from("bookings").update({ draw_id: drawId }).eq("id", other.id);
      await transition(db, {
        bookingId: other.id,
        to: "in_draw",
        actorId: null,
        reason: "Competing request arrived",
        receipt: drawReceipt({ score: Number(other.priority_score ?? 100), breakdown: (other.priority_breakdown ?? []) as Priority["breakdown"] }),
        notify: { title: `Your ${resource.name} request is now in a Fair Draw`, body: "Someone else asked for the same time. The result is verifiable." },
      });
    }

    const r = drawReceipt(priority);
    const { data, error } = await db
      .from("bookings")
      .insert({ ...base, status: "in_draw", draw_id: drawId, decision_receipt: asJson(r) })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    await audit(db, { orgId: resource.org_id, actorId: user.id, action: "booking.in_draw", entity: "booking", entityId: data.id, reason: r.headline, payload: asJson({ resource: resource.name, when, draw_id: drawId }) });
    await notify(db, { userId: resource.owner_id, kind: "draw.pending", title: `Fair Draw ready: ${resource.name}`, body: `${competing.length + 1} requests for ${when}.`, link: "/owner" });
    return { ok: true, bookingId: data.id, message: r.headline };
  }

  // 3. Low-risk, uncontested → auto-approve. 4. Otherwise the owner reviews.
  const autoApprove = resource.auto_approve && !resource.requires_supervision && competing.length === 0;
  const pendingReceipt = receipt({
    outcome: "pending_review",
    headline: "Sent to the resource owner for review",
    reasons: [
      "You meet every eligibility rule and fair-use limit.",
      resource.requires_supervision
        ? "This resource needs supervision, so a person approves every booking."
        : competing.length
          ? `${competing.length} other request(s) overlap this time; the owner decides using the priority scores.`
          : "The owner reviews requests for this resource personally.",
    ],
    decidedBy: { kind: "system" },
    priority,
  });
  const { data, error } = await db
    .from("bookings")
    .insert({ ...base, status: "requested", decision_receipt: asJson(pendingReceipt) })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  await audit(db, { orgId: resource.org_id, actorId: user.id, action: "booking.requested", entity: "booking", entityId: data.id, reason: input.purpose, payload: asJson({ resource: resource.name, when, credits: base.credits }) });

  if (autoApprove) {
    const r = receipt({
      outcome: "auto_approved",
      headline: "Approved instantly",
      reasons: [
        "You meet every eligibility rule and fair-use limit.",
        "The slot is free and nobody else asked for it.",
        "The owner marked this low-risk resource for instant approval.",
      ],
      decidedBy: { kind: "system" },
      priority,
    });
    const { error: tErr } = await transition(db, {
      bookingId: data.id,
      to: "approved",
      actorId: null,
      reason: "Auto-approved: eligible, slot free, low-risk resource",
      receipt: r,
      notify: { title: `Approved: ${resource.name}`, body: when },
    });
    if (tErr) return { ok: true, bookingId: data.id, message: pendingReceipt.headline };
    return { ok: true, bookingId: data.id, message: r.headline };
  }

  await notify(db, { userId: resource.owner_id, kind: "request.new", title: `New request: ${resource.name}`, body: `${user.full_name} · ${when}`, link: "/owner" });
  return { ok: true, bookingId: data.id, message: pendingReceipt.headline };
}

async function ensureDraw(db: Db, resource: Tables<"resources">, competing: Tables<"bookings">[], start: string, end: string): Promise<string> {
  const existing = competing.find((b) => b.draw_id)?.draw_id;
  if (existing) return existing;
  const seed = newSeed();
  const slotStart = [start, ...competing.map((b) => b.starts_at)].sort()[0];
  const slotEnd = [end, ...competing.map((b) => b.ends_at)].sort().at(-1)!;
  const { data, error } = await db
    .from("draw_windows")
    .insert({
      resource_id: resource.id,
      slot_start: slotStart,
      slot_end: slotEnd,
      closes_at: new Date(new Date(slotStart).getTime() - 2 * 3_600_000).toISOString(),
      commit_hash: await commitFor(seed),
    })
    .select("id, commit_hash")
    .single();
  if (error) throw new Error(error.message);
  await db.from("draw_secrets").insert({ draw_id: data.id, seed });
  await audit(db, { orgId: resource.org_id, actorId: null, action: "draw.committed", entity: "draw", entityId: data.id, reason: "Seed committed before the draw", payload: asJson({ resource: resource.name, commit: data.commit_hash }) });
  return data.id;
}

// ── Owner decisions ───────────────────────────────────────────────────────────
export async function decideBooking(
  actor: CurrentUser,
  bookingId: string,
  decision: "approve" | "reject" | "waitlist",
  reason: string,
): Promise<ServiceResult> {
  const db = createAdminClient();
  const { data: booking } = await db.from("bookings").select("*, resource:resources(*)").eq("id", bookingId).single();
  if (!booking?.resource) return { ok: false, error: "Booking not found." };
  const resource = booking.resource;
  if (!canManage(actor, resource)) return { ok: false, error: "Only this resource's owner or a manager can decide." };
  if (decision !== "approve" && !reason.trim()) return { ok: false, error: "Please give a reason. The requester will see it." };
  const priority: Priority = { score: Number(booking.priority_score ?? 100), breakdown: (booking.priority_breakdown ?? []) as Priority["breakdown"] };
  const when = formatCampus(booking.starts_at);

  if (decision === "approve") {
    const r = receipt({
      outcome: "approved",
      headline: `Approved by ${actor.full_name}`,
      reasons: [reason.trim() || "Eligibility, fair-use limits and slot availability were checked.", "Bring your Baanto booking to check in."],
      decidedBy: person(actor),
      priority,
    });
    const { error } = await transition(db, { bookingId, to: "approved", actorId: actor.id, reason: reason || "Approved", receipt: r, notify: { title: `Approved: ${resource.name}`, body: when } });
    if (error) {
      return {
        ok: false,
        error: error.code === "23P01" ? "Another approved booking already holds this time." : error.message,
      };
    }
    // Everyone else asking for that time moves to the waitlist, best priority first.
    const rivals = (await overlapping(db, resource.id, booking.starts_at, booking.ends_at, PENDING)).filter((b) => b.id !== bookingId);
    const queued = (await overlapping(db, resource.id, booking.starts_at, booking.ends_at, ["waitlisted"])).length;
    for (const [i, rival] of rivals.entries()) {
      await transition(db, {
        bookingId: rival.id,
        to: "waitlisted",
        actorId: actor.id,
        reason: "Slot approved for another request",
        extra: { waitlist_position: queued + i + 1 },
        receipt: receipt({
          outcome: "waitlisted",
          headline: `Waitlisted at position #${queued + i + 1}`,
          reasons: ["The owner approved a competing request for this time.", "You are promoted automatically if the slot frees up."],
          decidedBy: person(actor),
          priority: { score: Number(rival.priority_score ?? 100), breakdown: (rival.priority_breakdown ?? []) as Priority["breakdown"] },
        }),
        notify: { title: `Waitlisted: ${resource.name}`, body: `Position #${queued + i + 1} for ${when}` },
      });
    }
    return { ok: true, message: "Approved" };
  }

  if (decision === "reject") {
    const r = receipt({ outcome: "rejected", headline: `Declined by ${actor.full_name}`, reasons: [reason.trim()], decidedBy: person(actor), priority });
    const { error } = await transition(db, { bookingId, to: "rejected", actorId: actor.id, reason, receipt: r, notify: { title: `Declined: ${resource.name}`, body: reason } });
    return error ? { ok: false, error: error.message } : { ok: true, message: "Declined with reason" };
  }

  const queued = (await overlapping(db, resource.id, booking.starts_at, booking.ends_at, ["waitlisted"])).length;
  const r = receipt({ outcome: "waitlisted", headline: `Waitlisted at position #${queued + 1}`, reasons: [reason.trim()], decidedBy: person(actor), priority });
  const { error } = await transition(db, {
    bookingId,
    to: "waitlisted",
    actorId: actor.id,
    reason,
    receipt: r,
    extra: { waitlist_position: queued + 1 },
    notify: { title: `Waitlisted: ${resource.name}`, body: reason },
  });
  return error ? { ok: false, error: error.message } : { ok: true, message: "Moved to waitlist" };
}

// ── Fair Draw ─────────────────────────────────────────────────────────────────
export async function runFairDraw(actor: CurrentUser, drawId: string): Promise<ServiceResult> {
  const db = createAdminClient();
  const { data: draw } = await db.from("draw_windows").select("*, resource:resources(*)").eq("id", drawId).single();
  if (!draw?.resource) return { ok: false, error: "Draw not found." };
  if (!canManage(actor, draw.resource)) return { ok: false, error: "Only this resource's owner or a manager can run the draw." };
  if (draw.status !== "open") return { ok: false, error: "This draw has already been run." };

  const { data: secret } = await db.from("draw_secrets").select("seed").eq("draw_id", drawId).single();
  const { data: entrants } = await db.from("bookings").select("*").eq("draw_id", drawId).eq("status", "in_draw");
  if (!secret || !entrants?.length) return { ok: false, error: "Nobody is left in this draw." };

  const results = await runDraw(
    secret.seed,
    entrants.map((b) => ({ bookingId: b.id, weight: Number(b.priority_score ?? 1) })),
  );
  await db
    .from("draw_windows")
    .update({ status: "drawn", seed: secret.seed, drawn_at: new Date().toISOString(), results: asJson(results) })
    .eq("id", drawId);
  await audit(db, {
    orgId: draw.resource.org_id,
    actorId: actor.id,
    action: "draw.revealed",
    entity: "draw",
    entityId: drawId,
    reason: "Seed revealed and draw run",
    payload: asJson({ seed: secret.seed, commit: draw.commit_hash, ranking: results.map((r) => ({ booking: r.bookingId, weight: r.weight, rank: r.rank })) }),
  });

  const resourceName = draw.resource.name;
  const byId = new Map(entrants.map((b) => [b.id, b]));
  let winnerApproved = false;
  let position = 0;
  for (const row of results) {
    const b = byId.get(row.bookingId)!;
    const priority: Priority = { score: Number(b.priority_score ?? 1), breakdown: (b.priority_breakdown ?? []) as Priority["breakdown"] };
    const drawInfo = { drawId, commit: draw.commit_hash, rank: row.rank, entrants: results.length };
    if (!winnerApproved) {
      const { error } = await transition(db, {
        bookingId: b.id,
        to: "approved",
        actorId: actor.id,
        reason: `Won Fair Draw (rank 1 of ${results.length})`,
        receipt: receipt({
          outcome: "approved",
          headline: `Won the Fair Draw (1 of ${results.length})`,
          reasons: ["Selected by a verifiable weighted lottery. Higher priority gave better odds, never a guarantee.", "Verify the draw yourself with the revealed seed."],
          decidedBy: person(actor),
          priority,
          draw: drawInfo,
        }),
        notify: { title: `You won the Fair Draw: ${resourceName}`, body: formatCampus(b.starts_at) },
      });
      if (!error) {
        winnerApproved = true;
        continue;
      }
    }
    position += 1;
    await transition(db, {
      bookingId: b.id,
      to: "waitlisted",
      actorId: actor.id,
      reason: `Fair Draw rank ${row.rank} of ${results.length}`,
      extra: { waitlist_position: position },
      receipt: receipt({
        outcome: "waitlisted",
        headline: `Fair Draw rank ${row.rank} of ${results.length} · waitlist #${position}`,
        reasons: ["Another entrant was drawn first.", "You are promoted automatically if the winner cancels."],
        decidedBy: person(actor),
        priority,
        draw: drawInfo,
      }),
      notify: { title: `Fair Draw result: ${resourceName}`, body: `Waitlist position #${position}` },
    });
  }
  return { ok: true, message: `Draw complete: ${results.length} entrants ranked.` };
}

// ── Extensions ────────────────────────────────────────────────────────────────
export async function requestExtension(user: CurrentUser, bookingId: string, newEnd: Date): Promise<ServiceResult> {
  const db = createAdminClient();
  const { data: b } = await db.from("bookings").select("*").eq("id", bookingId).single();
  if (!b) return { ok: false, error: "Booking not found." };
  if (b.user_id !== user.id) return { ok: false, error: "Only the person who booked can ask for more time." };
  if (!["approved", "checked_in"].includes(b.status)) return { ok: false, error: "Only approved or in-use bookings can be extended." };
  if (newEnd.getTime() <= new Date(b.ends_at).getTime()) return { ok: false, error: "Pick an end time later than the current one." };

  const ctx = await loadResourceContext(db, b.resource_id);
  if (!ctx) return { ok: false, error: "Resource not found." };
  // Same fair-use rules as a new request, applied to the whole extended slot (this booking excluded from history).
  const history = (await bookingHistory(db, user.id)).filter((h) => !(h.startsAt === b.starts_at && h.resourceId === b.resource_id));
  const slot = { resourceId: b.resource_id, startsAt: new Date(b.starts_at), endsAt: newEnd };
  const violations = checkUsageRules({ config: ctx.config, resource: ctx.rules, slot, history }).filter((v) => v.rule !== "future");
  if (violations.length) return { ok: false, error: "The extra time breaks a fair-use rule.", reasons: violations.map((v) => v.reason) };

  // Extra time must not take anything someone else has asked for, even a pending request.
  const extraFrom = b.ends_at;
  const extraTo = newEnd.toISOString();
  const others = (await overlapping(db, b.resource_id, extraFrom, extraTo, [...HOLDS_SLOT, ...PENDING, "waitlisted"])).filter((o) => o.id !== b.id);
  if (others.length) {
    return {
      ok: false,
      error: "Someone else has booked or requested that time.",
      reasons: [`The next booking starts at ${formatCampus(others.map((o) => o.starts_at).sort()[0])}. Return on time so they get their turn.`],
    };
  }

  const { error } = await db.rpc("extend_booking", {
    p_booking: b.id,
    p_new_end: extraTo,
    p_actor: user.id,
    p_reason: `Extended to ${formatCampus(extraTo, { day: undefined, month: undefined })}: slot free and within fair-use limits`,
  });
  if (error) return { ok: false, error: error.code === "23P01" ? "That time was just taken by another booking." : error.message };
  return { ok: true, message: `Extended until ${formatCampus(extraTo, { day: undefined, month: undefined })}.` };
}

// ── Cancellation & waitlist promotion ─────────────────────────────────────────
export async function cancelBooking(actor: CurrentUser, bookingId: string, reason: string): Promise<ServiceResult> {
  const db = createAdminClient();
  const { data: booking } = await db.from("bookings").select("*, resource:resources(*)").eq("id", bookingId).single();
  if (!booking?.resource) return { ok: false, error: "Booking not found." };
  const isRequester = booking.user_id === actor.id;
  if (!isRequester && !canManage(actor, booking.resource)) return { ok: false, error: "You cannot cancel this booking." };
  if (!isRequester && !reason.trim()) return { ok: false, error: "Owners must give a reason when cancelling someone's booking." };

  const heldSlot = booking.status === "approved";
  const { error } = await transition(db, {
    bookingId,
    to: "cancelled",
    actorId: actor.id,
    reason: reason || "Cancelled by requester",
    receipt: receipt({
      outcome: "cancelled",
      headline: isRequester ? "You cancelled this booking" : `Cancelled by ${actor.full_name}`,
      reasons: [reason.trim() || "Cancelled by the requester."],
      decidedBy: person(actor),
    }),
    notify: isRequester ? undefined : { title: `Cancelled: ${booking.resource.name}`, body: reason },
  });
  if (error) return { ok: false, error: error.message.includes("illegal transition") ? "This booking can no longer be cancelled." : error.message };

  if (heldSlot) await promoteWaitlist(db, booking.resource, booking.starts_at, booking.ends_at);
  // Leaving the queue moves everyone behind you up.
  else if (booking.status === "waitlisted") await closeQueueGaps(db, booking.resource, booking.starts_at, booking.ends_at);
  return { ok: true, message: heldSlot ? "Cancelled. The slot was offered to the waitlist." : "Cancelled." };
}

const queued = (b: Tables<"bookings">): Queued & { row: Tables<"bookings"> } => ({
  id: b.id,
  waitlistPosition: b.waitlist_position,
  priorityScore: b.priority_score === null ? null : Number(b.priority_score),
  startsAt: b.starts_at,
  endsAt: b.ends_at,
  row: b,
});

/**
 * A held slot was freed: offer it down the queue. Each person is checked again against the same rules as a new request
 * (eligibility and fair-use limits as of now), because a lot can change while you wait. Passed-over people are told why.
 */
export async function promoteWaitlist(db: Db, resource: Tables<"resources">, start: string, end: string) {
  const ctx = await loadResourceContext(db, resource.id);
  if (!ctx) return;
  const queue = promotionOrder((await overlapping(db, resource.id, start, end, ["waitlisted"])).map(queued), new Date());
  for (const { row: candidate } of queue) {
    const { data: profile } = await db.from("profiles").select("*").eq("id", candidate.user_id).single();
    if (!profile) continue;
    const eligibility = await eligibilityFor(db, profile, ctx);
    const slot = { resourceId: resource.id, startsAt: new Date(candidate.starts_at), endsAt: new Date(candidate.ends_at) };
    // "Must start in the future" is about new requests; a promotion into a slot that has begun is still useful.
    const violations = checkUsageRules({ config: ctx.config, resource: ctx.rules, slot, history: await bookingHistory(db, candidate.user_id) }).filter(
      (v) => v.rule !== "future",
    );
    const blocker = eligibility.checks.find((c) => c.blocking && !c.passed)?.reason ?? violations[0]?.reason;
    if (blocker) {
      await notify(db, {
        userId: candidate.user_id,
        kind: "waitlist.skipped",
        title: `A slot opened up, but you were passed over: ${resource.name}`,
        body: `${blocker} You stay on the waitlist.`,
        link: `/bookings/${candidate.id}`,
      });
      continue;
    }
    const { error } = await transition(db, {
      bookingId: candidate.id,
      to: "approved",
      actorId: null,
      reason: "Promoted from waitlist after a cancellation",
      receipt: receipt({
        outcome: "promoted",
        headline: "Promoted from the waitlist",
        reasons: ["The person ahead of you cancelled.", "You were next in line and still meet every rule."],
        decidedBy: { kind: "system" },
        priority: { score: Number(candidate.priority_score ?? 100), breakdown: (candidate.priority_breakdown ?? []) as Priority["breakdown"] },
      }),
      notify: { title: `A slot opened up: ${resource.name}`, body: `You're in for ${formatCampus(candidate.starts_at)}.` },
    });
    // A clash with another approved booking (the exclusion constraint) means this slot isn't free for them: try the next.
    if (!error) break;
  }
  await closeQueueGaps(db, resource, start, end);
}

/** Renumber whoever is still waiting for this time, and tell the people who moved up. */
async function closeQueueGaps(db: Db, resource: Tables<"resources">, start: string, end: string) {
  const waiting = (await overlapping(db, resource.id, start, end, ["waitlisted"])).map(queued);
  for (const move of renumber(waiting)) {
    await db.from("bookings").update({ waitlist_position: move.to }).eq("id", move.id).eq("status", "waitlisted");
    const b = waiting.find((w) => w.id === move.id)!.row;
    await notify(db, {
      userId: b.user_id,
      kind: "waitlist.moved",
      title: `You moved up to #${move.to}: ${resource.name}`,
      body: formatCampus(b.starts_at),
      link: `/bookings/${b.id}`,
    });
  }
}
