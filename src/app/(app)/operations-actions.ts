"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { campusInstant } from "@/lib/domain/time";
import type { InventoryPreview } from "@/lib/services/operations";
import { applyNudge, calendarToken, cancelMaintenance, importInventory, saveFeedback, scheduleMaintenance, verifyFromRegister } from "@/lib/services/operations";
import type { RegisterMatch } from "@/lib/domain/register";

export type SimpleState = { ok?: boolean; error?: string; message?: string };

const MAX_FILE = 2 * 1024 * 1024;

async function fileText(formData: FormData): Promise<string | { error: string }> {
  // The first step uploads the file; the confirm step sends back the same text it was shown.
  const kept = formData.get("csv");
  if (typeof kept === "string" && kept) return kept;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file first." };
  if (file.size > MAX_FILE) return { error: "Keep the file under 2 MB. Split it into parts if needed." };
  if (!/\.csv$/i.test(file.name) && !file.type.includes("csv") && !file.type.includes("text")) return { error: "Save the sheet as CSV (File → Download → CSV) and upload that." };
  return file.text();
}

export type InventoryState = SimpleState & { preview?: InventoryPreview; csv?: string; done?: boolean };

export async function inventoryAction(_prev: InventoryState, formData: FormData): Promise<InventoryState> {
  const user = await requireUser();
  if (!(await allow("import", user.id))) return { error: "Too many uploads in the last hour. Wait a little and try again." };
  const csv = await fileText(formData);
  if (typeof csv !== "string") return csv;
  const commit = formData.get("commit") === "1";
  const result = await importInventory(user, csv, commit);
  if (commit && result.ok) {
    revalidatePath("/admin");
    revalidatePath("/resources");
    return { ok: true, done: true, message: result.message, preview: result.preview };
  }
  return result.ok ? { preview: result.preview, csv } : { error: result.error, preview: result.preview, csv };
}

export type RegisterState = SimpleState & { match?: RegisterMatch; problems?: { line: number; message: string }[]; csv?: string; done?: boolean };

export async function registerAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const user = await requireUser();
  if (!(await allow("import", user.id))) return { error: "Too many uploads in the last hour. Wait a little and try again." };
  const csv = await fileText(formData);
  if (typeof csv !== "string") return csv;
  const commit = formData.get("commit") === "1";
  const result = await verifyFromRegister(user, csv, commit);
  if (commit && result.ok) {
    revalidatePath("/admin/people");
    return { ok: true, done: true, message: result.message, match: result.match, problems: result.problems };
  }
  return result.ok ? { match: result.match, problems: result.problems, csv } : { error: result.error, match: result.match, problems: result.problems, csv };
}

const nudge = z.object({ resourceId: z.guid(), action: z.enum(["instant_approval", "open_to_partners", "normal_demand", "fewer_credits"]) });

export async function nudgeAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await requireUser();
  const parsed = nudge.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Unknown change." };
  const result = await applyNudge(user, parsed.data.resourceId, parsed.data.action);
  revalidatePath("/admin");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the dates.");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Pick the times.");
const maintenance = z.object({ resourceId: z.guid(), fromDate: day, fromTime: time, toDate: day, toTime: time, reason: z.string().trim().max(300) });

export async function maintenanceAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await requireUser();
  const parsed = maintenance.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;
  const result = await scheduleMaintenance(user, {
    resourceId: v.resourceId,
    startsAt: campusInstant(v.fromDate, v.fromTime),
    endsAt: campusInstant(v.toDate, v.toTime),
    reason: v.reason,
  });
  revalidatePath(`/owner/resources/${v.resourceId}/edit`);
  revalidatePath(`/resources/${v.resourceId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

export async function cancelMaintenanceAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await requireUser();
  const id = z.guid().safeParse(formData.get("windowId"));
  if (!id.success) return { error: "Not found." };
  const result = await cancelMaintenance(user, id.data);
  revalidatePath("/owner/resources", "layout");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

const feedback = z.object({ bookingId: z.guid(), rating: z.coerce.number().int(), comment: z.string().max(500).default("") });

export async function feedbackAction(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await requireUser();
  const t = await getTranslations("Feedback");
  const parsed = feedback.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: t("pickStars") };
  const result = await saveFeedback(user, parsed.data);
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return result.ok ? { ok: true, message: t("thanks") } : { error: result.error };
}

export async function resetCalendarAction(): Promise<SimpleState> {
  const user = await requireUser();
  await calendarToken(user.id, true);
  revalidatePath("/profile");
  const t = await getTranslations("CalendarFeed");
  return { ok: true, message: t("resetDone") };
}
