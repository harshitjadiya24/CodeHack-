import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { listCampuses } from "@/lib/services/accounts";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "../signup-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Signup"))("completeTitle") };
}

/** Signed in with Google but no campus profile yet: ask only for what Google can't tell us. */
export default async function CompleteSignupPage() {
  const existing = await getCurrentUser();
  if (existing) redirect(homeFor(existing.role));
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (!user?.email) redirect("/login");
  const [campuses, t] = await Promise.all([listCampuses(), getTranslations("Signup")]);
  const name = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-8">
      <Link href="/" className="mb-12 inline-flex text-xl font-extrabold text-ink">
        <Wordmark />
      </Link>
      <h1 className="type-h2">{t("completeTitle")}</h1>
      <p className="mb-8 mt-3 text-ink-2">{t("lede")}</p>
      <Card className="p-5 sm:p-7">
        <SignupForm campuses={campuses} google={{ name, email: user.email }} />
      </Card>
    </main>
  );
}
