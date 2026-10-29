"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button, Field, inputClass } from "@/components/ui";
import { DEPOSIT_METHODS } from "@/lib/domain/deposit";
import { collectDepositAction, settleDepositAction, type DepositState } from "@/app/(app)/bookings/[id]/deposit-actions";

function useToast(state: DepositState) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}

export function CollectDepositForm({ bookingId, amount }: { bookingId: string; amount: string }) {
  const [state, action, pending] = useActionState<DepositState, FormData>(collectDepositAction, {});
  const t = useTranslations("Deposit");
  useToast(state);
  if (state.ok) return null;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Field label={t("method")}>
        <select name="method" defaultValue="upi" className={inputClass}>
          {DEPOSIT_METHODS.map((m) => (
            <option key={m} value={m}>
              {t(m)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("reference")}>
        <input name="reference" maxLength={80} className={inputClass} />
      </Field>
      <Button disabled={pending} variant="secondary" className="w-full">
        {pending ? t("collecting") : t("collect", { amount })}
      </Button>
    </form>
  );
}

/** `canKeep`: owner or manager. Counter staff can only hand it back in full. */
export function SettleDepositForm({ bookingId, max, canKeep }: { bookingId: string; max: number; canKeep: boolean }) {
  const [state, action, pending] = useActionState<DepositState, FormData>(settleDepositAction, {});
  const [keep, setKeep] = useState(false);
  const t = useTranslations("Deposit");
  useToast(state);
  if (state.ok) return null;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      {canKeep ? (
        <div className="flex gap-2" role="radiogroup" aria-label={t("title")}>
          <label className="flex-1 cursor-pointer rounded-xl border border-rule p-2 text-center text-sm has-[:checked]:border-ok has-[:checked]:bg-ok-soft">
            <input type="radio" name="outcome" value="refund" checked={!keep} onChange={() => setKeep(false)} className="sr-only" />
            {t("returnFull")}
          </label>
          <label className="flex-1 cursor-pointer rounded-xl border border-rule p-2 text-center text-sm has-[:checked]:border-danger has-[:checked]:bg-danger-soft">
            <input type="radio" name="outcome" value="keep" checked={keep} onChange={() => setKeep(true)} className="sr-only" />
            {t("keepPart")}
          </label>
        </div>
      ) : (
        <input type="hidden" name="outcome" value="refund" />
      )}
      {keep && (
        <>
          <Field label={t("keepAmount")}>
            <input name="withheld" type="number" inputMode="numeric" min={1} max={max} step={1} required className={inputClass} />
          </Field>
          <Field label={t("keepReason")}>
            <textarea name="reason" required minLength={10} maxLength={500} rows={2} className={inputClass} />
          </Field>
        </>
      )}
      <Button disabled={pending} variant={keep ? "primary" : "secondary"} className="w-full">
        {pending ? t("settling") : keep ? t("settle") : t("returnFull")}
      </Button>
    </form>
  );
}
