import type { ErrorEvent } from "@sentry/nextjs";

// Error reports leave India for Sentry's servers, so they carry no personal data:
// no cookies or headers, no user beyond an id, and emails or roll numbers in messages are masked.
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const ROLL = /\b[A-Z]{2,}[0-9]{2}[A-Z0-9/-]{2,}\b/g;

export const mask = (text: string) => text.replace(EMAIL, "[email]").replace(ROLL, "[roll]");

export function scrub(event: ErrorEvent): ErrorEvent {
  if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    if (event.request.query_string) event.request.query_string = undefined;
  }
  if (event.message) event.message = mask(event.message);
  for (const ex of event.exception?.values ?? []) if (ex.value) ex.value = mask(ex.value);
  for (const crumb of event.breadcrumbs ?? []) if (crumb.message) crumb.message = mask(crumb.message);
  return event;
}

export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Off without a DSN, so local runs and CI send nothing.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrub,
};
