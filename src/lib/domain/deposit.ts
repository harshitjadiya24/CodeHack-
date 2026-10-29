// When a deposit can be taken and settled, and what keeping part of it requires. Pure, so it is unit tested.

export const DEPOSIT_METHODS = ["cash", "upi", "card", "other"] as const;
export type DepositMethod = (typeof DEPOSIT_METHODS)[number];

/** Taken at the counter once the slot is confirmed, before or during use. */
export const COLLECTABLE = ["approved", "checked_in"];
/** Settled once the item is back, or if the booking ended without use. */
export const SETTLEABLE = ["returned", "closed", "cancelled"];

export type Settlement = { amount: number; withheld: number; reason: string; bookingStatus: string };

/** Null when the settlement may go ahead; otherwise what is wrong with it. */
export function settlementProblem(s: Settlement): string | null {
  if (!SETTLEABLE.includes(s.bookingStatus)) return "Settle the deposit after the item is returned.";
  if (!Number.isInteger(s.withheld) || s.withheld < 0) return "Enter the amount to keep in whole rupees.";
  if (s.withheld > s.amount) return `You can keep at most ₹${s.amount.toLocaleString("en-IN")}, the amount collected.`;
  if (s.withheld > 0 && s.reason.trim().length < 10) return "Say why part of the deposit is kept. The borrower sees this, and it is recorded.";
  return null;
}

export const settlementStatus = (withheld: number) => (withheld > 0 ? "withheld" : "refunded");
