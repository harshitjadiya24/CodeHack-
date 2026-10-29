"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { DEPOSIT_METHODS } from "@/lib/domain/deposit";
import { collectDeposit, settleDeposit } from "@/lib/services/deposits";

export type DepositState = { ok?: boolean; error?: string; message?: string };

const collect = z.object({ bookingId: z.guid(), method: z.enum(DEPOSIT_METHODS), reference: z.string().max(80).default("") });

export async function collectDepositAction(_prev: DepositState, formData: FormData): Promise<DepositState> {
  const user = await requireUser();
  const parsed = collect.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose how it was paid." };
  const result = await collectDeposit(user, parsed.data);
  revalidatePath(`/bookings/${parsed.data.bookingId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}

const settle = z.object({
  bookingId: z.guid(),
  outcome: z.enum(["refund", "keep"]),
  withheld: z.coerce.number().default(0),
  reason: z.string().max(500).default(""),
});

export async function settleDepositAction(_prev: DepositState, formData: FormData): Promise<DepositState> {
  const user = await requireUser();
  const parsed = settle.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose whether to return it in full." };
  const v = parsed.data;
  const result = await settleDeposit(user, { bookingId: v.bookingId, withheld: v.outcome === "keep" ? v.withheld : 0, reason: v.reason });
  revalidatePath(`/bookings/${v.bookingId}`);
  return result.ok ? { ok: true, message: result.message } : { error: result.error };
}
