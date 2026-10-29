// Patterns a manager should look at: one person taking most of a scarce resource while others are turned away,
// and repeated no-shows. Advisory only: nothing here changes a booking or adds a strike. Pure, so it is tested.

export type UsageRow = { userId: string; resourceId: string; hours: number; outcome: "used" | "turned_away" | "no_show" };

export type PatternFlag =
  | { kind: "hogging"; userId: string; resourceId: string; share: number; hours: number; turnedAway: number }
  | { kind: "no_shows"; userId: string; count: number };

/** Share of a resource's used hours above which one person is worth a look, when others were turned away. */
export const HOG_SHARE = 0.5;
/** Ignore resources with too little use for a share to mean anything. */
export const HOG_MIN_HOURS = 6;
export const NO_SHOW_FLAG = 2;

export function usagePatterns(rows: UsageRow[]): PatternFlag[] {
  const flags: PatternFlag[] = [];
  const byResource = new Map<string, UsageRow[]>();
  for (const r of rows) byResource.set(r.resourceId, [...(byResource.get(r.resourceId) ?? []), r]);

  for (const [resourceId, list] of byResource) {
    const used = list.filter((r) => r.outcome === "used");
    const total = used.reduce((s, r) => s + r.hours, 0);
    if (total < HOG_MIN_HOURS) continue;
    const perUser = new Map<string, number>();
    for (const r of used) perUser.set(r.userId, (perUser.get(r.userId) ?? 0) + r.hours);
    for (const [userId, hours] of perUser) {
      const turnedAway = list.filter((r) => r.outcome === "turned_away" && r.userId !== userId).length;
      if (hours / total >= HOG_SHARE && turnedAway > 0) flags.push({ kind: "hogging", userId, resourceId, share: hours / total, hours, turnedAway });
    }
  }

  const noShows = new Map<string, number>();
  for (const r of rows) if (r.outcome === "no_show") noShows.set(r.userId, (noShows.get(r.userId) ?? 0) + 1);
  for (const [userId, count] of noShows) if (count >= NO_SHOW_FLAG) flags.push({ kind: "no_shows", userId, count });

  // Biggest share first, then the most no-shows.
  return flags.sort((a, b) => (a.kind === "hogging" ? a.share : a.count / 10) < (b.kind === "hogging" ? b.share : b.count / 10) ? 1 : -1);
}
