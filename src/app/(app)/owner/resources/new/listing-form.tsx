"use client";

import { useActionState } from "react";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { createListingAction, updateListingAction, type ListingState } from "../actions";

export type ListingDraft = Partial<{
  name: string;
  category: string;
  description: string;
  rules: string;
  checklist: string;
  photoSlots: string;
  kind: string;
  location: string;
  demand: string;
  maxHours: number;
  creditRate: number;
  depositInr: number;
  rentalValue: number;
  requiresSupervision: boolean;
  autoApprove: boolean;
  badgeIds: string[];
}>;

/** One form for listing and for editing; `resourceId` switches it to edit mode. */
export function ListingForm({ badges, draft, resourceId }: { badges: { id: string; name: string }[]; draft?: ListingDraft; resourceId?: string }) {
  const [state, action, pending] = useActionState<ListingState, FormData>(resourceId ? updateListingAction : createListingAction, {});
  return (
    <form action={action} className="space-y-6">
      {resourceId && <input type="hidden" name="resourceId" value={resourceId} />}
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={draft?.name} className={inputClass} placeholder="Bambu Lab X1 Carbon" />
        </Field>
        <Field label="Category">
          <input name="category" required defaultValue={draft?.category} className={inputClass} placeholder="3D Printing" list="categories" />
          <datalist id="categories">
            {["3D Printing", "Laser Cutting", "Test & Measurement", "Electronics", "Media", "XR", "Compute", "Rooms", "Workspace", "Fabrication"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Type">
          <select name="kind" defaultValue={draft?.kind} className={inputClass}>
            <option value="equipment">Equipment</option>
            <option value="space">Space</option>
          </select>
        </Field>
        <Field label="Location">
          <input name="location" required defaultValue={draft?.location} className={inputClass} placeholder="Central Makerspace, Bay 4" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <textarea name="description" required minLength={10} rows={3} defaultValue={draft?.description} className={inputClass} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Usage rules" hint="Shown to every borrower before they request.">
            <textarea name="rules" rows={3} defaultValue={draft?.rules} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Access conditions</h2>
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-sm font-medium">Required Trust Passport badges</legend>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <label key={b.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-rule px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="checkbox" name="badgeIds" value={b.id} defaultChecked={draft?.badgeIds?.includes(b.id)} className="accent-[var(--accent)]" /> {b.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Demand" hint="High demand turns on Fair Draw, cooldowns and per-person caps.">
          <select name="demand" defaultValue={draft?.demand} className={inputClass}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </Field>
        <Field label="Max hours per booking">
          <input name="maxHours" type="number" min={1} max={8} defaultValue={draft?.maxHours ?? 4} className={inputClass} />
        </Field>
        <Field label="Credits per hour">
          <input name="creditRate" type="number" min={0} max={10} defaultValue={draft?.creditRate ?? 1} className={inputClass} />
        </Field>
        <Field label="Refundable deposit (₹)">
          <input name="depositInr" type="number" min={0} defaultValue={draft?.depositInr ?? 0} className={inputClass} />
        </Field>
        <Field label="Market rental value (₹/hour)" hint="Used to report the value your campus unlocks.">
          <input name="rentalValue" type="number" min={0} defaultValue={draft?.rentalValue ?? 300} className={inputClass} />
        </Field>
        <div className="space-y-2 self-end text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="requiresSupervision" defaultChecked={draft?.requiresSupervision} className="accent-[var(--accent)]" /> Attendant must supervise check-in
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="autoApprove" defaultChecked={draft?.autoApprove} className="accent-[var(--accent)]" /> Approve instantly when eligible and uncontested
          </label>
        </div>
      </Card>

      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <h2 className="font-medium md:col-span-2">Handover protocol</h2>
        <Field label="Condition checklist" hint="One item per line. Checked at every check-in and return.">
          <textarea name="checklist" rows={5} required defaultValue={draft?.checklist} className={inputClass} placeholder={"Nozzle clean\nBuild plate undamaged"} />
        </Field>
        <Field label="Required photo angles" hint="One per line. Borrowers must capture each.">
          <textarea name="photoSlots" rows={5} required defaultValue={draft?.photoSlots ?? "Front view\nControl panel\nAccessories"} className={inputClass} />
        </Field>
      </Card>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button disabled={pending} className="w-full py-3 text-base">
        {pending ? "Saving…" : resourceId ? "Save changes" : "Publish listing"}
      </Button>
    </form>
  );
}
