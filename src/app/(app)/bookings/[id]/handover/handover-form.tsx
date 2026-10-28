"use client";

import { useActionState, useRef, useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { Button, Field, inputClass } from "@/components/ui";
import { recordHandoverAction, type HandoverState } from "./actions";

/** Downscale to ~1280px JPEG in the browser so uploads stay fast on campus Wi-Fi. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.82));
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export function HandoverForm({
  bookingId,
  phase,
  slots,
  items,
  before,
}: {
  bookingId: string;
  phase: "check_in" | "return";
  slots: string[];
  items: string[];
  before?: Record<string, boolean>;
}) {
  const [state, action, pending] = useActionState<HandoverState, FormData>(recordHandoverAction, {});
  const [photos, setPhotos] = useState<(File | null)[]>(slots.map(() => null));
  const [previews, setPreviews] = useState<(string | null)[]>(slots.map(() => null));
  const formRef = useRef<HTMLFormElement>(null);

  async function pick(i: number, file: File | undefined) {
    if (!file) return;
    const small = await shrink(file);
    setPhotos((p) => p.map((x, j) => (j === i ? small : x)));
    setPreviews((p) => p.map((x, j) => (j === i ? URL.createObjectURL(small) : x)));
  }

  function submit(formData: FormData) {
    formData.delete("photos");
    photos.forEach((p) => p && formData.append("photos", p));
    action(formData);
  }

  const ready = photos.every(Boolean);

  return (
    <form ref={formRef} action={submit} className="space-y-6">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="phase" value={phase} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <fieldset>
        <legend className="mb-2 font-medium">1. Photos ({photos.filter(Boolean).length}/{slots.length})</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot, i) => (
            <label
              key={slot}
              className="relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-rule bg-paper-2 text-center text-sm hover:border-accent"
            >
              {previews[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[i]!} alt={`${slot} photo`} className="absolute inset-0 size-full object-cover" />
              ) : (
                <>
                  <Camera className="mb-1 size-6 text-muted" aria-hidden />
                  <span className="px-2 text-ink-2">{slot}</span>
                </>
              )}
              {previews[i] && (
                <span className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-card/90 px-1.5 py-0.5 text-xs">
                  <CheckCircle2 className="size-3 text-ok" aria-hidden /> {slot}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label={`Photo: ${slot}`}
                onChange={(e) => pick(i, e.target.files?.[0])}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium">2. Condition checklist</legend>
        <ul className="divide-y divide-rule rounded-lg border border-rule bg-card">
          {items.map((item, i) => (
            <li key={item} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                {item}
                {before && before[item] === false && <span className="ml-2 text-xs text-warn">(already flagged at check-in)</span>}
              </span>
              <span className="flex gap-1" role="radiogroup" aria-label={item}>
                <label className="flex cursor-pointer items-center gap-1 rounded border border-rule px-2 py-1 has-[:checked]:border-ok has-[:checked]:bg-ok-soft">
                  <input type="radio" name={`item-${i}`} value="ok" defaultChecked className="sr-only" /> OK
                </label>
                <label className="flex cursor-pointer items-center gap-1 rounded border border-rule px-2 py-1 has-[:checked]:border-danger has-[:checked]:bg-danger-soft">
                  <input type="radio" name={`item-${i}`} value="issue" className="sr-only" /> Issue
                </label>
              </span>
            </li>
          ))}
        </ul>
      </fieldset>

      <Field label="3. Notes" hint={phase === "check_in" ? "Mention anything already wrong so it is not blamed on you later." : "Anything the owner should know?"}>
        <textarea name="notes" rows={3} className={inputClass} />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-md bg-danger-soft p-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={!ready || pending} className="w-full py-3 text-base">
        {pending ? "Uploading and recording…" : phase === "check_in" ? "Record condition and check in" : "Record condition and return"}
      </Button>
      {!ready && <p className="text-center text-xs text-muted">Add every photo to continue.</p>}
    </form>
  );
}
