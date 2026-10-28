// Fair Draw: a verifiable weighted lottery for high-demand slots.
//
// 1. When the request window opens we publish commit = sha256(seed). The seed stays secret.
// 2. When the window closes we reveal the seed. Anyone can check sha256(seed) === commit,
//    so the seed was fixed before anyone knew who would apply.
// 3. Each entrant gets key = u^(1/weight), with u derived from sha256(seed + bookingId)
//    (Efraimidis–Spirakis weighted sampling). Highest key wins; the rest form the waitlist.
//    The result depends only on the seed, booking ids and weights, never on request order.

export type DrawEntrant = { bookingId: string; weight: number };
export type DrawResultRow = DrawEntrant & { key: number; rank: number };

const encoder = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function newSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function commitFor(seed: string): Promise<string> {
  return sha256Hex(`saajha-draw:${seed}`);
}

export async function verifyCommit(seed: string, commit: string): Promise<boolean> {
  return (await commitFor(seed)) === commit;
}

/** Uniform number in (0, 1) derived deterministically from seed and booking id. */
async function uniform(seed: string, bookingId: string): Promise<number> {
  const hex = await sha256Hex(`${seed}:${bookingId}`);
  // 52 bits keeps full double precision; +1 / +2 keeps the value strictly inside (0, 1).
  const n = parseInt(hex.slice(0, 13), 16);
  return (n + 1) / (2 ** 52 + 2);
}

export async function runDraw(seed: string, entrants: DrawEntrant[]): Promise<DrawResultRow[]> {
  const keyed = await Promise.all(
    entrants.map(async (e) => {
      const weight = Math.max(e.weight, 1);
      const u = await uniform(seed, e.bookingId);
      return { ...e, weight, key: Math.pow(u, 1 / weight) };
    }),
  );
  keyed.sort((a, b) => b.key - a.key || a.bookingId.localeCompare(b.bookingId));
  return keyed.map((row, i) => ({ ...row, rank: i + 1 }));
}
