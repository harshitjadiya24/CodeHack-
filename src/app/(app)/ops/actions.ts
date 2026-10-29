"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { reviewInstitute } from "@/lib/services/review";
import type { GovState } from "@/app/(app)/manager/actions";

export async function reviewInstituteAction(_prev: GovState, formData: FormData): Promise<GovState> {
  const user = await requireUser();
  const result = await reviewInstitute(user, {
    orgId: z.guid().parse(formData.get("orgId")),
    decision: z.enum(["approve", "suspend", "reactivate"]).parse(formData.get("decision")),
    reason: String(formData.get("reason") ?? "").slice(0, 300),
  });
  revalidatePath("/ops");
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}
