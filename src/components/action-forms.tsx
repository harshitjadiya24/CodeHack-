"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button, inputClass } from "@/components/ui";
import { cancelAction, decideAction, runDrawAction, type ActionState } from "@/app/(app)/bookings/[id]/actions";

function useToast(state: ActionState) {
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.message) toast.success(state.message);
  }, [state]);
}

export function CancelForm({ bookingId, needsReason }: { bookingId: string; needsReason: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(cancelAction, {});
  const [open, setOpen] = useState(false);
  const t = useTranslations("Booking.forms");
  useToast(state);
  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full">
        {t("cancel")}
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="block text-sm">
        <span className="font-medium">{needsReason ? t("reasonShared") : t("reasonOptional")}</span>
        <input name="reason" required={needsReason} className={`${inputClass} mt-1`} placeholder={t("reasonPlaceholder")} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending} className="flex-1">
          {pending ? t("cancelling") : t("confirmCancel")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          {t("keep")}
        </Button>
      </div>
    </form>
  );
}

export function DecisionForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(decideAction, {});
  const t = useTranslations("Booking.forms");
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="sr-only" htmlFor={`reason-${bookingId}`}>
        {t("decisionReason")}
      </label>
      <input
        id={`reason-${bookingId}`}
        name="reason"
        className={inputClass}
        placeholder={t("decisionPlaceholder")}
      />
      <div className="flex flex-wrap gap-2">
        <Button name="decision" value="approve" disabled={pending}>
          {t("approve")}
        </Button>
        <Button name="decision" value="waitlist" variant="secondary" disabled={pending}>
          {t("waitlist")}
        </Button>
        <Button name="decision" value="reject" variant="ghost" disabled={pending} className="text-danger">
          {t("decline")}
        </Button>
      </div>
    </form>
  );
}

export function RunDrawForm({ drawId, entrants }: { drawId: string; entrants: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(runDrawAction, {});
  useToast(state);
  if (state.ok) return <p className="text-sm text-ok">{state.message}</p>;
  return (
    <form action={action}>
      <input type="hidden" name="drawId" value={drawId} />
      <Button disabled={pending} className="bg-saffron">
        {pending ? "Drawing…" : `Run Fair Draw (${entrants} entrants)`}
      </Button>
    </form>
  );
}
