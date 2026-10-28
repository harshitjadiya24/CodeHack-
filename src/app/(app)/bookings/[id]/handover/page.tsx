import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEMO_MODE, checkInWindow } from "@/lib/services/handovers";
import { formatCampus } from "@/lib/domain/time";
import { HandoverForm } from "./handover-form";

export const metadata: Metadata = { title: "Handover" };

export default async function HandoverPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ phase?: string }> }) {
  const { id } = await params;
  const { phase: rawPhase } = await searchParams;
  const phase = rawPhase === "return" ? "return" : "check_in";
  const user = await requireUser();
  const supabase = await createClient();

  const { data: b } = await supabase
    .from("bookings")
    .select("id, user_id, status, starts_at, ends_at, resource:resources(name, checklist, photo_slots, requires_supervision, deposit_inr)")
    .eq("id", id)
    .maybeSingle();
  if (!b?.resource || b.user_id !== user.id) notFound();

  const expected = phase === "check_in" ? ["approved"] : ["checked_in", "overdue"];
  if (!expected.includes(b.status)) redirect(`/bookings/${id}`);

  const { data: before } =
    phase === "return"
      ? await supabase.from("handovers").select("checklist").eq("booking_id", id).eq("phase", "check_in").maybeSingle()
      : { data: null };

  const window = checkInWindow(b.starts_at, b.ends_at);
  const realWindowOpen = new Date() >= window.opens;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/bookings/${id}`} className="text-sm text-accent">
        ← Back to booking
      </Link>
      <p className="mt-4 text-sm text-subtle">{phase === "check_in" ? "Check-in" : "Return"}</p>
      <h1 className="font-display text-4xl leading-tight">{b.resource.name}</h1>
      <p className="mb-6 text-sm text-subtle">
        {formatCampus(b.starts_at, { weekday: "short" })} – {formatCampus(b.ends_at, { day: undefined, month: undefined })}
      </p>

      {phase === "check_in" && DEMO_MODE && !realWindowOpen && (
        <p role="note" className="mb-4 rounded-md border border-saffron/40 bg-saffron-soft p-3 text-sm text-saffron">
          Demo mode: check-in normally opens 30 minutes before the slot ({formatCampus(window.opens)}). It is unlocked early so judges can try the full flow, and the audit log records that.
        </p>
      )}
      {phase === "check_in" && b.resource.requires_supervision && (
        <p className="mb-4 rounded-md bg-info-soft p-3 text-sm text-info">
          Supervised resource: after you record the condition, a lab attendant confirms in person before your session starts.
        </p>
      )}
      {phase === "check_in" && b.resource.deposit_inr > 0 && (
        <p className="mb-4 rounded-md bg-info-soft p-3 text-sm text-info">
          A refundable deposit of ₹{b.resource.deposit_inr.toLocaleString("en-IN")} is collected at the counter.
        </p>
      )}

      {phase === "check_in" && !window.open ? (
        <Card className="p-6 text-center text-sm text-ink-2">Check-in opens at {formatCampus(window.opens)}.</Card>
      ) : (
        <Card className="p-5">
          <HandoverForm
            bookingId={b.id}
            phase={phase}
            slots={(b.resource.photo_slots as string[]) ?? []}
            items={(b.resource.checklist as string[]) ?? []}
            before={(before?.checklist ?? undefined) as Record<string, boolean> | undefined}
          />
        </Card>
      )}
    </div>
  );
}
