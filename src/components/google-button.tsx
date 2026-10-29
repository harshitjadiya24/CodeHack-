"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

/** Shown only when Google sign-in is switched on for this deployment (NEXT_PUBLIC_GOOGLE_AUTH=1). */
export function GoogleButton({ next }: { next?: string }) {
  const t = useTranslations("Signup");
  const [busy, setBusy] = useState(false);
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH !== "1") return null;
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        className="w-full"
        onClick={async () => {
          setBusy(true);
          const callback = new URL("/auth/callback", window.location.origin);
          if (next) callback.searchParams.set("next", next);
          await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString(), queryParams: { prompt: "select_account" } } });
        }}
      >
        <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
          <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h6c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8.1z" />
          <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8C3.8 20.5 7.6 23 12 23z" />
          <path fill="#FBBC05" d="M5.7 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2C1.3 8.6.9 10.2.9 12s.4 3.4 1.1 4.9l3.7-2.8z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.6 1 3.8 3.5 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4z" />
        </svg>
        {t("google")}
      </Button>
      <p className="text-center text-sm text-subtle">{t("googleNote")}</p>
      <div className="flex items-center gap-3 text-sm text-subtle" aria-hidden>
        <span className="h-px flex-1 bg-rule" /> {t("or")} <span className="h-px flex-1 bg-rule" />
      </div>
    </div>
  );
}
