import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, Pill } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import { formatCampus } from "@/lib/domain/time";

type Handover = Tables<"handovers"> & { urls: string[] };

export function ConditionRecord({ handovers, slots }: { handovers: Handover[]; slots: string[] }) {
  const before = handovers.find((h) => h.phase === "check_in");
  const after = handovers.find((h) => h.phase === "return");
  if (!before && !after) return null;

  const Column = ({ h, title }: { h?: Handover; title: string }) => (
    <div>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      {h ? (
        <>
          <p className="mb-2 text-xs text-subtle">
            {formatCampus(h.created_at)}
            {h.attendant_confirmed_at && " · attendant confirmed"}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {h.urls.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="group relative block aspect-square overflow-hidden rounded bg-paper-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`${title}: ${slots[i] ?? `photo ${i + 1}`}`} className="size-full object-cover transition group-hover:scale-105" />
              </a>
            ))}
          </div>
          <ul className="mt-2 space-y-0.5 text-xs">
            {Object.entries(h.checklist as Record<string, boolean>).map(([item, ok]) => (
              <li key={item} className={ok ? "text-ink-2" : "font-medium text-danger"}>
                {ok ? "✓" : "✗"} {item}
              </li>
            ))}
          </ul>
          {h.notes && <p className="mt-2 text-xs text-ink-2">“{h.notes}”</p>}
        </>
      ) : (
        <p className="text-sm text-subtle">Not recorded yet.</p>
      )}
    </div>
  );

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">Condition record</h2>
        <Pill tone="accent">
          <ShieldCheck className="size-3" aria-hidden /> Timestamped & hash-chained
        </Pill>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Column h={before} title="Before (check-in)" />
        <Column h={after} title="After (return)" />
      </div>
      {after?.ai_summary && (
        <div className={`mt-4 flex gap-2 rounded-md p-3 text-sm ${after.ai_flag ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"}`}>
          {after.ai_flag ? <AlertTriangle className="size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="size-4 shrink-0" aria-hidden />}
          <div>
            <p className="font-medium">Automated comparison · advisory only</p>
            <p>{after.ai_summary}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
