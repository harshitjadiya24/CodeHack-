// Languages Baanto speaks. The choice lives in a cookie, so URLs stay the same in every language.
export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "baanto-locale";

export const LOCALE_NAMES: Record<Locale, string> = { en: "English", hi: "हिन्दी" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** The Intl locale for dates and numbers: Indian English or Hindi. */
export function intlLocale(locale: string): string {
  return locale === "hi" ? "hi-IN" : "en-IN";
}
