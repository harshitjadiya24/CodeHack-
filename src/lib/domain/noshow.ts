// An approved slot nobody turns up for is the most underused resource of all. Pure, so it is unit tested.

/** How long after the start someone can still check in before the slot goes to the next person. */
export const NO_SHOW_GRACE_MINUTES = 15;
/** Older slots are history, not something to free up. */
export const NO_SHOW_LOOKBACK_HOURS = 24;
/** The receipt headline of a released no-show; the review desk counts them by it. */
export const NO_SHOW_HEADLINE = "Released: nobody checked in";

export type HeldSlot = { id: string; startsAt: string; endsAt: string; checkedIn: boolean };

/** Approved bookings whose holder never started check-in within the grace period. */
export function noShows<T extends HeldSlot>(held: T[], now: Date): T[] {
  const graceEnd = now.getTime() - NO_SHOW_GRACE_MINUTES * 60_000;
  const oldest = now.getTime() - NO_SHOW_LOOKBACK_HOURS * 3_600_000;
  return held.filter((b) => {
    const start = new Date(b.startsAt).getTime();
    return !b.checkedIn && start <= graceEnd && start > oldest;
  });
}

/** Whether there is still enough of the slot left to be worth offering to the waitlist. */
export const worthOffering = (b: HeldSlot, now: Date) => new Date(b.endsAt).getTime() > now.getTime();
