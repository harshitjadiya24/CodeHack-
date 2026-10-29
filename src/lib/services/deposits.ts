import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { OWNER_ROLES, STAFF_ROLES, type CurrentUser } from "@/lib/auth";
import { COLLECTABLE, settlementProblem, settlementStatus, type DepositMethod } from "@/lib/domain/deposit";
import { audit, notify } from "./records";
import type { ServiceResult } from "./bookings";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

async function load(bookingId: string) {
  const db = createAdminClient();
  const { data: b } = await db.from("bookings").select("id, user_id, status, resource:resources(name, org_id, owner_id, deposit_inr)").eq("id", bookingId).maybeSingle();
  return { db, b };
}

type Resource = { org_id: string; owner_id: string };

/** The counter: the resource's owner, or attendants and managers of its campus. */
const atCounter = (u: CurrentUser, r: Resource) =>
  u.org_id === r.org_id && (r.owner_id === u.id || ["attendant", ...STAFF_ROLES].includes(u.role));
/** Keeping money is a penalty: the owner or a manager decides, not the counter staff. */
const decides = (u: CurrentUser, r: Resource) => u.org_id === r.org_id && (STAFF_ROLES.includes(u.role) || (OWNER_ROLES.includes(u.role) && r.owner_id === u.id));

export async function collectDeposit(actor: CurrentUser, input: { bookingId: string; method: DepositMethod; reference: string }): Promise<ServiceResult> {
  const { db, b } = await load(input.bookingId);
  if (!b?.resource) return { ok: false, error: "Booking not found." };
  if (!atCounter(actor, b.resource)) return { ok: false, error: "Only the owner or this campus's lab staff record deposits." };
  if (b.resource.deposit_inr <= 0) return { ok: false, error: "This resource doesn't ask for a deposit." };
  if (!COLLECTABLE.includes(b.status)) return { ok: false, error: "Take the deposit once the booking is approved, at pick-up." };

  const amount = b.resource.deposit_inr;
  const { error } = await db.from("deposits").insert({
    booking_id: b.id,
    amount_inr: amount,
    method: input.method,
    reference: input.reference.trim().slice(0, 80),
    collected_by: actor.id,
  });
  if (error) return { ok: false, error: error.code === "23505" ? "The deposit for this booking is already recorded." : "We couldn't record that. Try again." };

  await audit(db, {
    orgId: b.resource.org_id,
    actorId: actor.id,
    action: "deposit.collected",
    entity: "booking",
    entityId: b.id,
    reason: `${rupees(amount)} by ${input.method.toUpperCase()}`,
    payload: { amount_inr: amount, method: input.method },
  });
  await notify(db, {
    userId: b.user_id,
    kind: "deposit.collected",
    title: `Deposit received: ${rupees(amount)} for ${b.resource.name}`,
    body: "It comes back after you return the item in the same condition.",
    link: `/bookings/${b.id}`,
  });
  return { ok: true, message: `${rupees(amount)} deposit recorded.` };
}

export async function settleDeposit(actor: CurrentUser, input: { bookingId: string; withheld: number; reason: string }): Promise<ServiceResult> {
  const { db, b } = await load(input.bookingId);
  if (!b?.resource) return { ok: false, error: "Booking not found." };
  const { data: dep } = await db.from("deposits").select("*").eq("booking_id", b.id).maybeSingle();
  if (!dep) return { ok: false, error: "No deposit was recorded for this booking." };
  if (dep.status !== "held") return { ok: false, error: "This deposit is already settled." };
  // Handing it back in full is routine counter work; keeping any of it needs the owner or a manager.
  const allowed = input.withheld > 0 ? decides(actor, b.resource) : atCounter(actor, b.resource);
  if (!allowed) return { ok: false, error: input.withheld > 0 ? "Only the owner or a manager can keep part of a deposit." : "Only the owner or this campus's lab staff settle deposits." };

  const problem = settlementProblem({ amount: dep.amount_inr, withheld: input.withheld, reason: input.reason, bookingStatus: b.status });
  if (problem) return { ok: false, error: problem };

  const status = settlementStatus(input.withheld);
  const reason = input.reason.trim().slice(0, 500);
  const { error } = await db
    .from("deposits")
    .update({ status, withheld_inr: input.withheld, settled_by: actor.id, settled_at: new Date().toISOString(), settle_reason: reason || null })
    .eq("booking_id", b.id)
    .eq("status", "held");
  if (error) return { ok: false, error: "We couldn't record that. Try again." };

  const back = dep.amount_inr - input.withheld;
  await audit(db, {
    orgId: b.resource.org_id,
    actorId: actor.id,
    action: `deposit.${status}`,
    entity: "booking",
    entityId: b.id,
    reason: status === "refunded" ? `${rupees(back)} returned in full` : `${rupees(input.withheld)} kept, ${rupees(back)} returned: ${reason}`,
    payload: { amount_inr: dep.amount_inr, withheld_inr: input.withheld },
  });
  await notify(db, {
    userId: b.user_id,
    kind: `deposit.${status}`,
    title: status === "refunded" ? `Deposit returned: ${rupees(back)}` : `${rupees(input.withheld)} of your deposit was kept`,
    body: status === "refunded" ? b.resource.name : `${reason} If you disagree, report a problem on the booking and a manager will review it.`,
    link: `/bookings/${b.id}`,
  });
  return { ok: true, message: status === "refunded" ? `Recorded: ${rupees(back)} returned.` : `Recorded: ${rupees(input.withheld)} kept, ${rupees(back)} returned.` };
}
