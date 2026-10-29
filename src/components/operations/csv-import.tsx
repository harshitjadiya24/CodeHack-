"use client";

import { useActionState } from "react";
import { CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Button, DownloadLink, Pill } from "@/components/ui";
import { inventoryAction, registerAction, type InventoryState, type RegisterState } from "@/app/(app)/operations-actions";

const fileInput =
  "block w-full rounded-xl border border-dashed border-rule bg-paper p-3 text-[15px] file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-paper";

function Problems({ title, items }: { title: string; items: { line: number; message: string }[] }) {
  if (!items.length) return null;
  return (
    <details className="rounded-xl border border-rule p-3 text-sm" open={items.length <= 5}>
      <summary className="cursor-pointer font-semibold">
        {title} ({items.length})
      </summary>
      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {items.map((p, i) => (
          <li key={i}>
            <span className="tab text-subtle">Row {p.line}:</span> {p.message}
          </li>
        ))}
      </ul>
    </details>
  );
}

/** Upload → check every row → confirm. Nothing is written until the admin has seen what will happen. */
export function InventoryImport() {
  const [state, action, pending] = useActionState<InventoryState, FormData>(inventoryAction, {});
  const p = state.preview;
  if (state.done)
    return (
      <p role="status" className="tone-sage flex gap-2 rounded-2xl px-4 py-3 text-[15px]">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> {state.message}
      </p>
    );
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <label className="block text-[15px] font-semibold">
          Inventory spreadsheet (CSV)
          <input name="file" type="file" accept=".csv,text/csv" required={!state.csv} className={`${fileInput} mt-1.5`} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending}>{pending ? "Checking…" : "Check the file"}</Button>
          <DownloadLink href="/admin/import/template?kind=inventory">
            <FileSpreadsheet className="size-4" aria-hidden /> Template
          </DownloadLink>
        </div>
      </form>
      {state.error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-[15px] text-danger">{state.error}</p>}
      {p && (
        <div className="space-y-3" aria-live="polite">
          <p className="text-[15px]">
            <Pill tone={p.rows.length ? "ok" : "warn"}>{p.rows.length} ready</Pill> <Pill tone={p.problems.length ? "danger" : "neutral"}>{p.problems.length} need fixing</Pill>{" "}
            <Pill>{p.skipped.length} already listed</Pill>
          </p>
          {p.rows.length > 0 && (
            <ul className="max-h-56 divide-y divide-rule overflow-y-auto rounded-xl border border-rule text-sm">
              {p.rows.map((r) => (
                <li key={r.line} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-subtle">
                    {r.category} · {r.location}
                    {r.badges.length ? ` · needs ${r.badges.join(", ")}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Problems title="Rows to fix" items={p.problems} />
          <Problems title="Skipped" items={p.skipped} />
          {p.rows.length > 0 && state.csv && (
            <form action={action}>
              <input type="hidden" name="csv" value={state.csv} />
              <input type="hidden" name="commit" value="1" />
              <Button disabled={pending}>{pending ? "Listing…" : `List ${p.rows.length} ${p.rows.length === 1 ? "resource" : "resources"}`}</Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function RegisterImport() {
  const [state, action, pending] = useActionState<RegisterState, FormData>(registerAction, {});
  const m = state.match;
  if (state.done)
    return (
      <p role="status" className="tone-sage flex gap-2 rounded-2xl px-4 py-3 text-[15px]">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> {state.message}
      </p>
    );
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <label className="block text-[15px] font-semibold">
          College register (CSV with a roll_no column, and name if you have it)
          <input name="file" type="file" accept=".csv,text/csv" required={!state.csv} className={`${fileInput} mt-1.5`} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={pending}>{pending ? "Matching…" : "Match against sign-ups"}</Button>
          <DownloadLink href="/admin/import/template?kind=register">
            <FileSpreadsheet className="size-4" aria-hidden /> Template
          </DownloadLink>
        </div>
      </form>
      {state.error && <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-[15px] text-danger">{state.error}</p>}
      {m && (
        <div className="space-y-3" aria-live="polite">
          <p className="text-[15px]">
            <Pill tone={m.verify.length ? "ok" : "neutral"}>{m.verify.length} to verify</Pill> <Pill>{m.alreadyVerified} already verified</Pill>{" "}
            <Pill tone={m.nameMismatch.length ? "warn" : "neutral"}>{m.nameMismatch.length} name doesn’t match</Pill> <Pill>{m.notOnBaanto} not signed up yet</Pill>
          </p>
          {m.verify.length > 0 && (
            <ul className="max-h-56 divide-y divide-rule overflow-y-auto rounded-xl border border-rule text-sm">
              {m.verify.map((v) => (
                <li key={v.id} className="flex justify-between gap-2 px-3 py-2">
                  <span>{v.fullName}</span>
                  <span className="tab text-subtle">{v.rollNo}</span>
                </li>
              ))}
            </ul>
          )}
          {m.nameMismatch.length > 0 && (
            <div className="tone-butter rounded-xl p-3 text-sm">
              <p className="font-semibold">Check these by hand on the People page. The roll number matches, the name doesn’t:</p>
              <ul className="mt-1 space-y-0.5">
                {m.nameMismatch.map((v) => (
                  <li key={v.id}>
                    <span className="tab">{v.rollNo}</span>: signed up as “{v.fullName}”, register says “{v.registerName}”
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.duplicates.length > 0 && <p className="text-sm text-subtle">Listed twice in the file, counted once: {m.duplicates.join(", ")}</p>}
          <Problems title="Rows without a usable roll number" items={state.problems ?? []} />
          {m.verify.length > 0 && state.csv && (
            <form action={action}>
              <input type="hidden" name="csv" value={state.csv} />
              <input type="hidden" name="commit" value="1" />
              <Button disabled={pending}>{pending ? "Verifying…" : `Verify ${m.verify.length} ${m.verify.length === 1 ? "person" : "people"}`}</Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
