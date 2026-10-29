import "server-only";
import { after } from "next/server";
import { releaseNoShows } from "./bookings";

// Runs after a response has been sent, at most once a minute per server instance, so freed slots reach the
// waitlist while people are using the app. The daily cron (/api/cron/retention) catches quiet days.
let lastRun = 0;

export function sweepNoShowsSoon() {
  if (Date.now() - lastRun < 60_000) return;
  lastRun = Date.now();
  after(() => releaseNoShows().catch((e) => console.error("[no-shows]", e instanceof Error ? e.message : e)));
}
