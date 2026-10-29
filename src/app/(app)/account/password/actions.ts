"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/services/records";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PasswordState = { error?: string };

/** Sets a new password, then signs out everywhere so a lost phone or a shared laptop loses access. */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await requireUser();
  const t = await getTranslations("Login");
  // Everyone shares the demo accounts' password; one person changing it would lock the rest out.
  if (user.isDemo) return { error: t("failed") };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8 || password.length > 72) return { error: t("tooShort") };
  if (password !== formData.get("confirm")) return { error: t("mismatch") };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: t("failed") };
  await audit(createAdminClient(), { orgId: user.org_id, actorId: user.id, action: "user.password_changed", entity: "profile", entityId: user.id });
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?password=changed");
}
