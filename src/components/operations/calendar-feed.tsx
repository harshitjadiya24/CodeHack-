"use client";

import { useActionState, useState } from "react";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { resetCalendarAction, type SimpleState } from "@/app/(app)/operations-actions";

export function CalendarFeed({ url }: { url: string }) {
  const t = useTranslations("CalendarFeed");
  const [copied, setCopied] = useState(false);
  const [state, reset, pending] = useActionState<SimpleState>(resetCalendarAction, {});
  const webcal = url.replace(/^https?:/, "webcal:");
  return (
    <div className="space-y-3 text-sm">
      <p className="text-ink-2">{t("explain")}</p>
      <div className="flex gap-2">
        <input readOnly value={url} aria-label={t("linkLabel")} className="min-w-0 flex-1 rounded-xl border border-rule bg-paper px-3 py-2 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true))}
          className="min-h-10 px-3.5"
        >
          <Copy className="size-4" aria-hidden /> {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a href={webcal} className="font-semibold text-ink underline underline-offset-4">
          {t("subscribe")}
        </a>
        <form action={reset}>
          <button disabled={pending} className="text-subtle underline underline-offset-4 hover:text-ink">
            {t("reset")}
          </button>
        </form>
        {state.message && <span className="text-ok">{state.message}</span>}
      </div>
      <p className="text-xs text-subtle">{t("private")}</p>
    </div>
  );
}
