import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

// No DSN, no SDK: there is nowhere to send reports, so don't patch fetch and navigation for nothing.
if (sentryOptions.enabled) Sentry.init(sentryOptions);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
