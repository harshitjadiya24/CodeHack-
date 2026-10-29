import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { listCampuses } from "@/lib/services/accounts";
import { SignupForm } from "./signup-form";
import { Wordmark } from "@/components/wordmark";
import { LanguageToggle } from "@/components/language-toggle";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Signup"))("metaTitle") };
}

// Message keys under Signup.steps: a name and its text.
const STEPS = ["s1", "s2", "s3", "s4"] as const;

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const campuses = await listCampuses();
  const t = await getTranslations("Signup");

  return (
    <main className="mx-auto grid min-h-screen max-w-[1240px] gap-12 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-8 lg:gap-20">
      <section className="flex flex-col justify-center">
        <div className="mb-12 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-ink">
            <Wordmark />
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="type-h2">{t("title")}</h1>
        <p className="mb-8 mt-3 max-w-[50ch] text-ink-2">{t("lede")}</p>
        <Card className="p-5 sm:p-7">
          <SignupForm campuses={campuses} />
        </Card>
        <p className="mt-6 text-[15px] text-subtle">
          {t("already")}{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
            {t("signIn")}
          </Link>
        </p>
      </section>

      <aside aria-labelledby="after-heading" className="flex flex-col justify-center">
        <h2 id="after-heading" className="type-h3 text-3xl">
          {t("nextTitle")}
        </h2>
        <ol className="relative mt-8 space-y-7 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-rule">
          {STEPS.map((s, i) => (
            <li key={s} className="relative grid grid-cols-[34px_1fr] gap-x-4">
              <span
                aria-hidden
                className={`tab relative grid size-[34px] place-items-center rounded-full text-sm font-extrabold ${i === 0 ? "bg-ink text-paper" : "border border-rule bg-paper"}`}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold">{t(`steps.${s}`)}</h3>
                <p className="mt-0.5 text-[15px] text-subtle">{t(`steps.${s}Text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </aside>
    </main>
  );
}
