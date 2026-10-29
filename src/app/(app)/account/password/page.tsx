import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Login"))("newTitle") };
}

/** Reached from a reset email (signed in by the link) or from the profile. */
export default async function PasswordPage() {
  const user = await requireUser();
  if (user.isDemo) redirect("/profile");
  const t = await getTranslations("Login");
  return (
    <>
      <PageHeader title={t("newTitle")} />
      <Card className="max-w-md p-6">
        <PasswordForm />
      </Card>
    </>
  );
}
