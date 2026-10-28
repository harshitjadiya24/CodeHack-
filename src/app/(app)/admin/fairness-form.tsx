"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, Field, inputClass } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import { updateFairnessAction, type ConfigState } from "./actions";

const FIELDS: { name: keyof Tables<"fairness_config">; label: string; hint: string }[] = [
  { name: "weekly_credits", label: "Weekly credits per person", hint: "Every booking spends credits; resets Monday." },
  { name: "max_active_high_demand", label: "Active high-demand bookings", hint: "Per person, per scarce resource." },
  { name: "cooldown_hours", label: "Cooldown (hours)", hint: "Gap between one person's bookings of a scarce resource." },
  { name: "first_time_bonus", label: "First-time bonus", hint: "Priority points for someone new to a resource." },
  { name: "deadline_bonus", label: "Deadline bonus", hint: "Priority points for a stated course deadline." },
  { name: "usage_penalty_per_hour", label: "Recent-use penalty / hour", hint: "Discount per hour used in the last 30 days." },
  { name: "strike_penalty", label: "Strike penalty", hint: "Priority points removed per strike." },
];

export function FairnessForm({ config }: { config: Tables<"fairness_config"> }) {
  const [state, action, pending] = useActionState<ConfigState, FormData>(updateFairnessAction, {});
  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.ok) toast.success("Policy updated and published to the audit log.");
  }, [state]);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <Field key={f.name} label={f.label} hint={f.hint}>
            <input name={f.name} type="number" step="any" defaultValue={String(config[f.name])} className={inputClass} />
          </Field>
        ))}
      </div>
      <Field label="Reason for change" hint="Recorded in the audit log so everyone can see why the rules moved.">
        <input name="reason" required className={inputClass} placeholder="Exam season: more students need the printers" />
      </Field>
      <Button disabled={pending}>{pending ? "Saving…" : "Publish policy"}</Button>
    </form>
  );
}
