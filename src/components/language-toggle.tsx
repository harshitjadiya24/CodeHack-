"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { LOCALE_NAMES, type Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/utils";

/** One tap switches between English and Hindi. It names the language you'd switch *to*, in that language. */
export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const next: Locale = locale === "hi" ? "en" : "hi";
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      lang={next}
      onClick={() => start(() => setLocale(next))}
      disabled={pending}
      aria-label={next === "hi" ? "हिन्दी में देखें (View in Hindi)" : "View in English"}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-card px-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-subtle disabled:opacity-60",
        className,
      )}
    >
      <Languages className="size-4" aria-hidden />
      {LOCALE_NAMES[next]}
    </button>
  );
}
