import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";
import { checkEnv } from "@/lib/env";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { errors, warnings } = checkEnv(process.env);
    for (const w of warnings) console.warn(`[baanto] ${w}`);
    if (errors.length) throw new Error(`Baanto can't start:\n- ${errors.join("\n- ")}`);
  }
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") Sentry.init(sentryOptions);
}

export const onRequestError = Sentry.captureRequestError;
