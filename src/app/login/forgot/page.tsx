import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { emailConfirmation } from "@/lib/site";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Login"))("forgotTitle") };
}

export default async function ForgotPage() {
  // Without a mail domain Supabase can't email real people, so the page would promise a link that never comes.
  if (!emailConfirmation()) redirect("/login");
  const t = await getTranslations("Login");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-10 text-xl font-extrabold text-ink">
        <Wordmark />
      </Link>
      <h1 className="type-h2">{t("forgotTitle")}</h1>
      <p className="mb-8 mt-3 text-ink-2">{t("forgotLede")}</p>
      <Card className="p-6">
        <ForgotForm />
      </Card>
      <p className="mt-6 text-[15px]">
        <Link href="/login" className="text-subtle hover:text-ink">
          {t("back")}
        </Link>
      </p>
    </main>
  );
}
