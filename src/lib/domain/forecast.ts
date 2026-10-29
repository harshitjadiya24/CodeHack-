// Looking a week ahead, and spotting equipment nobody uses. Pure, so it is unit tested.

export const OPEN_HOURS_PER_WEEK = 45;
const WEEK_MS = 7 * 24 * 3_600_000;

type Span = { starts_at: string; ends_at: string };
const hours = (b: Span) => (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 3_600_000;

/** Hours used in each of the `weeks` weeks before `now`, oldest first. */
export function weeklyHours(used: Span[], now: Date, weeks = 4): number[] {
  const out = Array.from({ length: weeks }, () => 0);
  for (const b of used) {
    const ago = Math.floor((now.getTime() - new Date(b.starts_at).getTime()) / WEEK_MS);
    if (ago >= 0 && ago < weeks) out[weeks - 1 - ago] += hours(b);
  }
  return out;
}

export type Forecast = { hours: number; utilisation: number; level: "full" | "busy" | "quiet"; booked: number };

/**
 * Next week's demand: the larger of what is already booked and a recency-weighted average of recent weeks
 * (the latest week counts four times the oldest). Simple on purpose: it is explainable to an admin office,
 * and right often enough to say "buy a second printer" or "this one is fine".
 */
export function forecastNextWeek(history: number[], alreadyBooked: number, openHours = OPEN_HOURS_PER_WEEK): Forecast {
  const weights = history.map((_, i) => i + 1);
  const total = weights.reduce((s, w) => s + w, 0);
  const trend = total ? history.reduce((s, h, i) => s + h * weights[i], 0) / total : 0;
  const expected = Math.max(alreadyBooked, trend);
  const utilisation = Math.min(1, expected / openHours);
  return { hours: Math.round(expected * 10) / 10, utilisation, booked: alreadyBooked, level: utilisation >= 0.8 ? "full" : utilisation >= 0.5 ? "busy" : "quiet" };
}

export type NudgeAction = "instant_approval" | "open_to_partners" | "normal_demand" | "fewer_credits";

export type IdleResource = {
  id: string;
  name: string;
  hours: number;
  utilisation: number;
  actions: NudgeAction[];
};

/**
 * Resources used for under 10% of their open hours over four weeks, with the changes most likely to help,
 * in the order worth trying. Resources listed in the last fortnight haven't had a fair chance yet.
 */
export function idleResources(
  resources: {
    id: string;
    name: string;
    createdAt: string;
    autoApprove: boolean;
    requiresSupervision: boolean;
    openToPartners: boolean;
    demand: "normal" | "high";
    creditRate: number;
    hours4w: number;
  }[],
  now: Date,
): IdleResource[] {
  const capacity = OPEN_HOURS_PER_WEEK * 4;
  return resources
    .filter((r) => now.getTime() - new Date(r.createdAt).getTime() >= 14 * 24 * 3_600_000 && r.hours4w < capacity * 0.1)
    .map((r) => {
      const actions: NudgeAction[] = [];
      if (!r.openToPartners) actions.push("open_to_partners");
      if (!r.autoApprove && !r.requiresSupervision) actions.push("instant_approval");
      if (r.demand === "high") actions.push("normal_demand");
      if (r.creditRate > 1) actions.push("fewer_credits");
      return { id: r.id, name: r.name, hours: Math.round(r.hours4w), utilisation: r.hours4w / capacity, actions };
    })
    .sort((a, b) => a.utilisation - b.utilisation);
}
