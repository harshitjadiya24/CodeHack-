import type { Metadata } from "next";
import Link from "next/link";
import { ServiceWorker } from "@/components/service-worker";
import { LanguageToggle } from "@/components/language-toggle";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Card, Mono, Pill } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { LoginForm } from "./login-form";
import { loginAsDemo } from "./actions";
import { Wordmark } from "@/components/wordmark";
import { GoogleButton } from "@/components/google-button";
import { createClient } from "@/lib/supabase/server";
import { emailConfirmation } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Login"))("submit") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; created?: string; deleted?: string; check?: string; link?: string; password?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  // Signed in with Google but never finished sign-up: send them to finish it rather than show sign-in again.
  const { data: auth } = await (await createClient()).auth.getUser();
  if (auth.user) redirect("/signup/complete");
  const { next, created, deleted, check, link, password } = await searchParams;
  const t = await getTranslations("Login");
  const tr = await getTranslations("Shell.roles");

  return (
    <main className="mx-auto grid min-h-screen max-w-[1240px] gap-12 px-4 py-12 md:grid-cols-[1fr_1.2fr] md:px-8">
      {/* Reaching sign-in means nobody is signed in on this device: forget the saved passport. */}
      <ServiceWorker signedOut />
      <section className="flex flex-col justify-center">
        <div className="mb-12 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-ink">
            <Wordmark />
          </Link>
          <LanguageToggle />
        </div>
        <h1 className="type-h2">{t("title")}</h1>
        <p className="mb-8 mt-3 text-ink-2">{t("lede")}</p>
        {created && (
          <p role="status" className="mb-4 rounded-xl bg-ok-soft px-3 py-2.5 text-[15px] text-ok">
            {t("created")}
          </p>
        )}
        {(check || password) && (
          <p role="status" className="mb-4 rounded-xl bg-ok-soft px-3 py-2.5 text-[15px] text-ok">
            {check ? t("checkEmail") : t("passwordChanged")}
          </p>
        )}
        {link && (
          <p role="alert" className="mb-4 rounded-xl bg-paper-2 px-3 py-2.5 text-[15px] text-ink-2">
            {t("linkExpired")}
          </p>
        )}
        {deleted && (
          <p role="status" className="mb-4 rounded-xl bg-paper-2 px-3 py-2.5 text-[15px] text-ink-2">
            {t("deleted")}
          </p>
        )}
        <Card className="space-y-4 p-6">
          <GoogleButton next={next} />
          <LoginForm next={next} emailLinks={emailConfirmation()} />
        </Card>
        <p className="mt-6 text-[15px] text-subtle">
          {t("new")}{" "}
          <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
            {t("createAccount")}
          </Link>
        </p>
      </section>

      <section aria-labelledby="demo-heading" className="flex flex-col justify-center">
        <div className="mb-4">
          <p className="text-[15px] font-semibold text-subtle">{t("judges")}</p>
          <h2 id="demo-heading" className="type-h3 mt-1 text-3xl">
            {t("demoTitle")}
          </h2>
          <p className="mt-1 text-sm text-subtle">
            {t("demoNote")} <Mono className="text-ink">{DEMO_PASSWORD}</Mono>
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email} className="sm:[&:last-child:nth-child(odd)]:col-span-2">
              <form action={loginAsDemo} className="h-full">
                <input type="hidden" name="email" value={a.email} />
                <button
                  type="submit"
                  className="h-full w-full rounded-[22px] border border-rule bg-card p-4 text-left transition-[border-color,transform] duration-150 hover:border-subtle active:scale-[0.99]"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{a.name}</span>
                    <Pill tone="neutral">{tr(a.role)}</Pill>
                  </span>
                  <span className="mt-1 block text-sm text-subtle">{a.blurb}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
