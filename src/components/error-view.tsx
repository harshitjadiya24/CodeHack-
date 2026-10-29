"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { Button, ButtonLink, Mono } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";

/** What people see when a page throws: it's reported to us, they get a way forward and a reference to quote. */
export function ErrorView({ error, reset, inApp = false }: { error: Error & { digest?: string }; reset: () => void; inApp?: boolean }) {
  const t = useTranslations("Errors");
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className={inApp ? "py-8" : "mx-auto flex min-h-screen max-w-[1200px] flex-col justify-center px-4 py-16 md:px-8"}>
      {!inApp && (
        <Link href="/" aria-label="Baanto home" className="mb-12">
          <Wordmark />
        </Link>
      )}
      <span className="tone-butter inline-block rotate-[-3deg] rounded-full px-4 py-1.5 font-semibold">{t("tag")}</span>
      <h1 className="type-h2 mt-6 max-w-[20ch]">{t("title")}</h1>
      <p className="mt-5 max-w-[52ch] text-lg text-subtle">{t("body")}</p>
      {error.digest && (
        <p className="mt-4 text-sm text-subtle">
          {t("reference")}: <Mono className="text-ink">{error.digest}</Mono>
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-2.5">
        <Button onClick={reset}>{t("retry")}</Button>
        <ButtonLink href="/" variant="secondary">
          {t("home")}
        </ButtonLink>
      </div>
    </main>
  );
}
