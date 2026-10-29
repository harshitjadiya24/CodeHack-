// Who gets a slot when it frees up, and how the rest of the queue moves. Pure, so it is unit tested.

export type Queued = { id: string; waitlistPosition: number | null; priorityScore: number | null; startsAt: string; endsAt: string };

/** Minimum time left in a slot for a promotion to be worth anything. */
export const MIN_USEFUL_MINUTES = 30;

/** The order to offer a freed slot in: queue position first, then priority. Slots that are over (or nearly) are skipped. */
export function promotionOrder<T extends Queued>(queue: T[], now: Date): T[] {
  const cutoff = now.getTime() + MIN_USEFUL_MINUTES * 60_000;
  return queue
    .filter((q) => new Date(q.endsAt).getTime() > cutoff)
    .sort((a, b) => (a.waitlistPosition ?? Infinity) - (b.waitlistPosition ?? Infinity) || (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}

/** Close the gaps after someone leaves the queue: positions become 1, 2, 3… in the same order. Returns only the ones that moved. */
export function renumber<T extends Queued>(queue: T[]): { id: string; from: number | null; to: number }[] {
  return promotionOrder(queue, new Date(0))
    .map((q, i) => ({ id: q.id, from: q.waitlistPosition, to: i + 1 }))
    .filter((m) => m.from !== m.to);
}
