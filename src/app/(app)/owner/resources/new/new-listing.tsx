"use client";

import { useActionState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { draftListingAction, type DraftState } from "../actions";
import { ListingForm } from "./listing-form";

export function NewListing({ badges, aiOn }: { badges: { id: string; name: string }[]; aiOn: boolean }) {
  const [state, action, pending] = useActionState<DraftState, FormData>(draftListingAction, {});
  return (
    <div className="space-y-6">
      <Card className="border-accent/40 p-5">
        <h2 className="flex items-center gap-2 font-bold">
          <Sparkles className="size-4 text-accent" aria-hidden /> Snap a photo, get a draft
        </h2>
        <p className="mb-3 text-sm text-subtle">
          {aiOn
            ? "AI drafts the name, description, safety rules and handover checklist. You review and edit every field before publishing."
            : "AI drafting is off (no Gemini key). The form below works the same by hand."}
        </p>
        <form action={action} className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-rule bg-paper-2 px-3 py-2 text-sm">
            <Camera className="size-4" aria-hidden />
            <input type="file" name="photo" accept="image/*" capture="environment" className="text-sm" aria-label="Equipment photo" />
          </label>
          <Button disabled={pending || !aiOn} variant="secondary">
            {pending ? "Reading photo…" : "Draft listing"}
          </Button>
        </form>
        {state.error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.draft && (
          <p role="status" className="mt-2 text-sm text-ok">
            Draft filled in below. Check every field. AI can be wrong about specifics.
          </p>
        )}
      </Card>
      <ListingForm key={state.draft?.name ?? "blank"} badges={badges} draft={state.draft} />
    </div>
  );
}
