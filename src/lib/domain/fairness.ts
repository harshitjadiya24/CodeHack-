// Fairness engine: explainable usage limits and a transparent priority score.
// Every rule returns a human-readable reason so the person always knows "why".

import { campusParts, campusWeekStart } from "./time";

export type FairnessConfig = {
  weeklyCredits: number;
  maxActiveHighDemand: number;
  cooldownHours: number;
  firstTimeBonus: number;
  deadlineBonus: number;
  usagePenaltyPerHour: number;
  strikePenalty: number;
};

export type PastBooking = {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  credits: number;
};

export type RequestedSlot = {
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
};

export type ResourceRules = {
  id: string;
  demand: "normal" | "high";
  creditRate: number;
  maxHours: number;
  availability: { weekday: number; startTime: string; endTime: string }[];
};

/** `rule` doubles as the message key (messages/*.json, Rules); `values` fill its placeholders. */
export type RuleViolation = { rule: string; reason: string; values?: Record<string, number> };

const HOUR = 3_600_000;
const COUNTS_TOWARDS_USAGE = new Set(["requested", "in_draw", "approved", "checked_in", "overdue", "returned", "closed"]);
const ACTIVE = new Set(["requested", "in_draw", "approved", "checked_in", "overdue"]);

export function hoursBetween(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / HOUR;
}

export function creditCost(slot: RequestedSlot, resource: ResourceRules): number {
  return Math.ceil(hoursBetween(slot.startsAt, slot.endsAt)) * resource.creditRate;
}

export function creditsUsedThisWeek(history: PastBooking[], weekOf: Date): number {
  const from = campusWeekStart(weekOf).getTime();
  const to = from + 7 * 24 * HOUR;
  return history
    .filter((b) => COUNTS_TOWARDS_USAGE.has(b.status))
    .filter((b) => {
      const t = new Date(b.startsAt).getTime();
      return t >= from && t < to;
    })
    .reduce((sum, b) => sum + b.credits, 0);
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** True when the whole slot sits inside one opening window on a single campus day. */
export function withinAvailability(slot: RequestedSlot, resource: ResourceRules): boolean {
  const s = campusParts(slot.startsAt);
  const durationMin = (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000;
  const endMin = s.minutes + durationMin;
  return resource.availability.some(
    (w) => w.weekday === s.weekday && toMinutes(w.startTime) <= s.minutes && toMinutes(w.endTime) >= endMin,
  );
}

/** Hard rules. Any violation blocks the request, with the reason shown to the user. */
export function checkUsageRules(args: {
  config: FairnessConfig;
  resource: ResourceRules;
  slot: RequestedSlot;
  history: PastBooking[];
  now?: Date;
}): RuleViolation[] {
  const { config, resource, slot, history } = args;
  const now = args.now ?? new Date();
  const violations: RuleViolation[] = [];
  const hours = hoursBetween(slot.startsAt, slot.endsAt);

  if (slot.startsAt.getTime() <= now.getTime()) {
    violations.push({ rule: "future", reason: "The slot must start in the future." });
  }
  if (hours <= 0) {
    violations.push({ rule: "duration", reason: "The end time must be after the start time." });
  }
  if (hours > resource.maxHours) {
    violations.push({
      rule: "max_hours",
      reason: `This resource can be booked for at most ${resource.maxHours} h at a time (you asked for ${hours} h).`,
      values: { max: resource.maxHours, asked: hours },
    });
  }
  if (!withinAvailability(slot, resource)) {
    violations.push({ rule: "availability", reason: "The slot falls outside the resource's opening hours." });
  }

  const cost = creditCost(slot, resource);
  const used = creditsUsedThisWeek(history, slot.startsAt);
  if (used + cost > config.weeklyCredits) {
    violations.push({
      rule: "credits",
      reason: `This needs ${cost} credits but only ${Math.max(0, config.weeklyCredits - used)} of your ${config.weeklyCredits} weekly credits are left.`,
      values: { cost, left: Math.max(0, config.weeklyCredits - used), weekly: config.weeklyCredits },
    });
  }

  if (resource.demand === "high") {
    const active = history.filter(
      (b) => b.resourceId === resource.id && ACTIVE.has(b.status) && new Date(b.endsAt).getTime() > now.getTime(),
    );
    if (active.length >= config.maxActiveHighDemand) {
      violations.push({
        rule: "max_active",
        reason: `High-demand resource: you already hold ${active.length} upcoming booking(s); the limit is ${config.maxActiveHighDemand}.`,
        values: { count: active.length, limit: config.maxActiveHighDemand },
      });
    }

    const cooldownMs = config.cooldownHours * HOUR;
    const tooClose = history.find(
      (b) =>
        b.resourceId === resource.id &&
        COUNTS_TOWARDS_USAGE.has(b.status) &&
        Math.abs(new Date(b.startsAt).getTime() - slot.startsAt.getTime()) < cooldownMs,
    );
    if (tooClose) {
      violations.push({
        rule: "cooldown",
        reason: `High-demand resource: bookings by the same person must be ${config.cooldownHours} h apart so others get a turn.`,
        values: { hours: config.cooldownHours },
      });
    }
  }

  return violations;
}

export type PriorityBreakdownItem = { label: string; points: number };
export type Priority = { score: number; breakdown: PriorityBreakdownItem[] };

export const PRIORITY_BASE = 100;

/**
 * Transparent priority for competing requests. Higher is better.
 * Rewards first-time access and real deadlines, discounts recent heavy use and strikes.
 */
export function priorityScore(args: {
  config: FairnessConfig;
  resourceId: string;
  history: PastBooking[];
  strikes: number;
  hasDeadline: boolean;
  now?: Date;
}): Priority {
  const { config, resourceId, history, strikes, hasDeadline } = args;
  const now = args.now ?? new Date();
  const breakdown: PriorityBreakdownItem[] = [{ label: "Base score", points: PRIORITY_BASE }];

  const usedHere = history.some((b) => b.resourceId === resourceId && COUNTS_TOWARDS_USAGE.has(b.status));
  if (!usedHere) breakdown.push({ label: "First time using this resource", points: config.firstTimeBonus });

  if (hasDeadline) breakdown.push({ label: "Course or project deadline stated", points: config.deadlineBonus });

  const since = now.getTime() - 30 * 24 * HOUR;
  const recentHours = history
    .filter((b) => b.resourceId === resourceId && COUNTS_TOWARDS_USAGE.has(b.status))
    .filter((b) => new Date(b.startsAt).getTime() >= since && new Date(b.startsAt).getTime() <= now.getTime())
    .reduce((h, b) => h + hoursBetween(new Date(b.startsAt), new Date(b.endsAt)), 0);
  if (recentHours > 0) {
    breakdown.push({
      label: `Used ${Math.round(recentHours)} h in the last 30 days`,
      points: -Math.round(recentHours * config.usagePenaltyPerHour),
    });
  }

  if (strikes > 0) breakdown.push({ label: `${strikes} strike(s) on record`, points: -strikes * config.strikePenalty });

  const score = Math.max(1, breakdown.reduce((s, b) => s + b.points, 0));
  return { score, breakdown };
}
