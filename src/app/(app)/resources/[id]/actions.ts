"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { BORROWER_ROLES, ForbiddenError, requireRole } from "@/lib/auth";
import { campusInstant } from "@/lib/domain/time";
import { requestBooking } from "@/lib/services/bookings";

export type RequestState = { error?: string; reasons?: string[] };

const schema = z
  .object({
    resourceId: z.guid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    from: z.string().regex(/^\d{2}:\d{2}$/),
    to: z.string().regex(/^\d{2}:\d{2}$/),
    purpose: z.string().trim().min(10, "Tell the owner what you will use it for (at least 10 characters).").max(500),
    deadlineNote: z.string().trim().max(200).optional(),
  })
  .refine((v) => v.to > v.from, { message: "End time must be after start time.", path: ["to"] });

export async function requestBookingAction(_prev: RequestState, formData: FormData): Promise<RequestState> {
  let user;
  try {
    user = await requireRole(BORROWER_ROLES);
  } catch (e) {
    return { error: e instanceof ForbiddenError ? "Only students and researchers can request resources." : "Please sign in again." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

  const result = await requestBooking(user, {
    resourceId: v.resourceId,
    startsAt: campusInstant(v.date, v.from),
    endsAt: campusInstant(v.date, v.to),
    purpose: v.purpose,
    deadlineNote: v.deadlineNote,
  });
  if (!result.ok) return { error: result.error, reasons: result.reasons };
  redirect(`/bookings/${result.bookingId}?new=1`);
}
