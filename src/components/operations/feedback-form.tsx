"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, inputClass } from "@/components/ui";
import { feedbackAction, type SimpleState } from "@/app/(app)/operations-actions";

export function FeedbackForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<SimpleState, FormData>(feedbackAction, {});
  const [rating, setRating] = useState(0);
  const t = useTranslations("Feedback");
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <fieldset>
        <legend className="text-sm font-semibold">{t("question")}</legend>
        <div className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-lg p-1 has-[:focus-visible]:outline has-[:focus-visible]:outline-2">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <Star className={`size-7 ${n <= rating ? "fill-[var(--butter-ink,#b58900)] text-[var(--butter-ink,#b58900)]" : "text-subtle"}`} aria-hidden />
              <span className="sr-only">{t("stars", { count: n })}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="sr-only">{t("comment")}</span>
        <textarea name="comment" rows={2} maxLength={500} placeholder={t("placeholder")} className={inputClass} />
      </label>
      <Button variant="secondary" disabled={pending || !rating} className="w-full">
        {pending ? t("sending") : t("send")}
      </Button>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
