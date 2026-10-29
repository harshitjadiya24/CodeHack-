"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { cancelBooking, decideBooking, requestExtension, runFairDraw } from "@/lib/services/bookings";
import { campusInstant } from "@/lib/domain/time";
import { getTranslations } from "next-intl/server";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const id = z.guid();

export async function cancelAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = id.parse(formData.get("bookingId"));
  const result = await cancelBooking(user, bookingId, String(formData.get("reason") ?? ""));
  revalidatePath(`/bookings/${bookingId}`);
  if (!result.ok) return { error: result.error };
  const t = await getTranslations("Booking.toasts");
  return { ok: true, message: t(result.message.includes("waitlist") ? "cancelledOffered" : "cancelled") };
}

const decision = z.object({
  bookingId: id,
  decision: z.enum(["approve", "reject", "waitlist"]),
  reason: z.string().trim().max(500).default(""),
});

export async function decideAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = decision.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid decision." };
  const result = await decideBooking(user, parsed.data.bookingId, parsed.data.decision, parsed.data.reason);
  revalidatePath("/owner");
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function runDrawAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const result = await runFairDraw(user, id.parse(formData.get("drawId")));
  revalidatePath("/owner");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function extendAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const bookingId = id.parse(formData.get("bookingId"));
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(formData.get("date"));
  const to = z.string().regex(/^\d{2}:\d{2}$/).parse(formData.get("to"));
  const result = await requestExtension(user, bookingId, campusInstant(date, to));
  revalidatePath(`/bookings/${bookingId}`);
  if (!result.ok) return { error: [result.error, ...(result.reasons ?? [])].join(" ") };
  const t = await getTranslations("Booking.toasts");
  return { ok: true, message: t("extended", { time: to }) };
}
