"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteMyAccount } from "@/lib/services/privacy";

export type DeleteState = { error?: string };

export async function deleteAccountAction(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const user = await requireUser();
  const result = await deleteMyAccount(user, { confirmEmail: String(formData.get("confirmEmail") ?? "") });
  if (!result.ok) return { error: result.error };
  await (await createClient()).auth.signOut();
  redirect("/login?deleted=1");
}
