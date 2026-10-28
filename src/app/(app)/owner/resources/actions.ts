"use server";

import { redirect } from "next/navigation";
import { OWNER_ROLES, requireUser } from "@/lib/auth";
import { createResource, listingSchema, setResourceStatus, updateResource } from "@/lib/services/resources";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { aiEnabled, draftListingFromPhoto } from "@/lib/ai";

export type DraftState = {
  error?: string;
  draft?: { name: string; category: string; description: string; rules: string; checklist: string; photoSlots: string };
};

export async function draftListingAction(_prev: DraftState, formData: FormData): Promise<DraftState> {
  const user = await requireUser();
  if (!OWNER_ROLES.includes(user.role)) return { error: "Only owners can draft listings." };
  if (!aiEnabled()) return { error: "AI drafting needs a Gemini API key. Fill the form by hand. Everything else works without AI." };
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Choose a photo first." };
  if (photo.size > 6 * 1024 * 1024) return { error: "Photo must be under 6 MB." };
  const data = Buffer.from(await photo.arrayBuffer()).toString("base64");
  const draft = await draftListingFromPhoto({ data, mimeType: photo.type || "image/jpeg" });
  if (!draft) return { error: "The AI could not read that photo. Try a clearer one, or fill the form by hand." };
  return {
    draft: {
      name: draft.name,
      category: draft.category,
      description: draft.description,
      rules: draft.rules,
      checklist: (draft.checklist ?? []).join("\n"),
      photoSlots: (draft.photoSlots ?? []).join("\n"),
    },
  };
}

export type ListingState = { error?: string };

export async function createListingAction(_prev: ListingState, formData: FormData): Promise<ListingState> {
  const user = await requireUser();
  const parsed = listingSchema.safeParse({
    ...Object.fromEntries(formData),
    requiresSupervision: formData.get("requiresSupervision") === "on",
    autoApprove: formData.get("autoApprove") === "on",
    badgeIds: formData.getAll("badgeIds"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".")}: ${issue.message}` };
  }
  const result = await createResource(user, parsed.data);
  if (!result.ok) return { error: result.error };
  redirect(`/owner/resources/${result.bookingId}/qr?new=1`);
}

export async function updateListingAction(_prev: ListingState, formData: FormData): Promise<ListingState> {
  const user = await requireUser();
  const resourceId = z.guid().parse(formData.get("resourceId"));
  const parsed = listingSchema.safeParse({
    ...Object.fromEntries(formData),
    requiresSupervision: formData.get("requiresSupervision") === "on",
    autoApprove: formData.get("autoApprove") === "on",
    badgeIds: formData.getAll("badgeIds"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(".")}: ${issue.message}` };
  }
  const result = await updateResource(user, resourceId, parsed.data);
  if (!result.ok) return { error: result.error };
  redirect(`/resources/${resourceId}`);
}

export type StatusState = { ok?: boolean; error?: string; message?: string };

export async function setStatusAction(_prev: StatusState, formData: FormData): Promise<StatusState> {
  const user = await requireUser();
  const resourceId = z.guid().parse(formData.get("resourceId"));
  const status = z.enum(["active", "maintenance"]).parse(formData.get("status"));
  const result = await setResourceStatus(user, resourceId, status, String(formData.get("reason") ?? ""));
  revalidatePath(`/owner/resources/${resourceId}/edit`);
  revalidatePath(`/resources/${resourceId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}
