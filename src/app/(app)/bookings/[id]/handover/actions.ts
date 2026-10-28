"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { confirmSupervisedCheckIn, recordHandover, reportIncident, verifyReturn } from "@/lib/services/handovers";

export type HandoverState = { error?: string; ok?: boolean; message?: string };

export async function recordHandoverAction(_prev: HandoverState, formData: FormData): Promise<HandoverState> {
  const user = await requireUser();
  const bookingId = z.guid().parse(formData.get("bookingId"));
  const phase = z.enum(["check_in", "return"]).parse(formData.get("phase"));
  const items: string[] = JSON.parse(String(formData.get("items") ?? "[]"));
  const checklist = Object.fromEntries(items.map((item, i) => [item, formData.get(`item-${i}`) === "ok"]));
  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);

  const result = await recordHandover(user, {
    bookingId,
    phase,
    checklist,
    notes: String(formData.get("notes") ?? "").slice(0, 1000),
    photos,
  });
  if (!result.ok) return { error: result.error };
  redirect(`/bookings/${bookingId}?done=${phase}`);
}

export async function confirmCheckInAction(_prev: HandoverState, formData: FormData): Promise<HandoverState> {
  const user = await requireUser();
  const bookingId = z.guid().parse(formData.get("bookingId"));
  const result = await confirmSupervisedCheckIn(user, bookingId);
  revalidatePath("/attendant");
  revalidatePath(`/bookings/${bookingId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

const verifySchema = z.object({
  bookingId: z.guid(),
  outcome: z.enum(["ok", "issue"]),
  notes: z.string().trim().max(1000).default(""),
  severity: z.enum(["low", "medium", "high"]).optional(),
});

export async function verifyReturnAction(_prev: HandoverState, formData: FormData): Promise<HandoverState> {
  const user = await requireUser();
  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid verification." };
  const result = await verifyReturn(user, parsed.data);
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

const incidentSchema = z.object({
  bookingId: z.guid(),
  type: z.enum(["damage", "delay", "conflict", "misuse", "safety"]),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().trim().min(10, "Describe what happened (at least 10 characters).").max(1000),
});

export async function reportIncidentAction(_prev: HandoverState, formData: FormData): Promise<HandoverState> {
  const user = await requireUser();
  const parsed = incidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await reportIncident(user, parsed.data);
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}
