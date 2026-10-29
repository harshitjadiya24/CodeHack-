"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { BORROWER_ROLES, ForbiddenError, requireRole } from "@/lib/auth";
import { campusInstant } from "@/lib/domain/time";
import { requestBooking } from "@/lib/services/bookings";
import { getTranslations } from "next-intl/server";
import { explainCheck, explainViolation } from "@/i18n/explain";

// `series`: a weekly repeat answers week by week, because each week is checked and decided on its own.
export type SeriesWeek = { date: string; bookingId?: string; reason?: string };
export type RequestState = { error?: string; reasons?: string[]; series?: SeriesWeek[] };

const MAX_WEEKS = 8;

/** The same weekday, `weeks` later, as YYYY-MM-DD. */
function weeksLater(date: string, weeks: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * weeks);
  return d.toISOString().slice(0, 10);
}

const schema = z
  .object({
    resourceId: z.guid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "pickDate"),
    from: z.string().regex(/^\d{2}:\d{2}$/),
    to: z.string().regex(/^\d{2}:\d{2}$/),
    purpose: z.string().trim().min(10, "purpose").max(500, "purpose"),
    deadlineNote: z.string().trim().max(200).optional(),
    weeks: z.coerce.number().int().min(1).max(MAX_WEEKS).default(1),
  })
  .refine((v) => v.to > v.from, { message: "endAfterStart", path: ["to"] });

// Schema messages are keys under Resource.errors, so the reply is in the reader's language.
export async function requestBookingAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const t = await getTranslations();
  let user;
  try {
    user = await requireRole(BORROWER_ROLES);
  } catch (e) {
    return { error: t(e instanceof ForbiddenError ? "Resource.errors.borrowersOnly" : "Resource.errors.signIn") };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const key = `Resource.errors.${parsed.error.issues[0].message}`;
    return { error: t.has(key) ? t(key) : parsed.error.issues[0].message };
  }
  const v = parsed.data;

  // A weekly lab session: every week is its own request through the same checks (credits, clashes, eligibility).
  if (v.weeks > 1) {
    const series: SeriesWeek[] = [];
    for (let w = 0; w < v.weeks; w++) {
      const date = weeksLater(v.date, w);
      const r = await requestBooking(user, {
        resourceId: v.resourceId,
        startsAt: campusInstant(date, v.from),
        endsAt: campusInstant(date, v.to),
        purpose: v.purpose,
        deadlineNote: v.deadlineNote,
      });
      if (r.ok) series.push({ date, bookingId: r.bookingId });
      else series.push({ date, reason: r.checks?.length ? explainCheck(t, r.checks.find((c) => c.blocking && !c.passed) ?? r.checks[0]) : r.violations?.length ? explainViolation(t, r.violations[0]) : r.error });
    }
    return { series };
  }

  const result = await requestBooking(user, {
    resourceId: v.resourceId,
    startsAt: campusInstant(v.date, v.from),
    endsAt: campusInstant(v.date, v.to),
    purpose: v.purpose,
    deadlineNote: v.deadlineNote,
  });
  if (!result.ok) {
    if (result.checks) return { error: t("Resource.errors.notEligible"), reasons: result.checks.map((c) => explainCheck(t, c)) };
    if (result.violations) return { error: t("Resource.errors.breaksRule"), reasons: result.violations.map((v) => explainViolation(t, v)) };
    return { error: result.error, reasons: result.reasons };
  }
  redirect(`/bookings/${result.bookingId}?new=1`);
}
