import type { Priority } from "./fairness";

/** Stored on every booking: the plain-language answer to "why did this happen?". */
export type DecisionReceipt = {
  outcome: "auto_approved" | "pending_review" | "approved" | "rejected" | "waitlisted" | "in_draw" | "promoted" | "cancelled";
  headline: string;
  reasons: string[];
  decidedBy: { kind: "system" } | { kind: "person"; name: string; role: string };
  at: string;
  priority?: Priority;
  draw?: { drawId: string; commit: string; rank?: number; entrants?: number };
};

export function receipt(r: Omit<DecisionReceipt, "at">): DecisionReceipt {
  return { ...r, at: new Date().toISOString() };
}
