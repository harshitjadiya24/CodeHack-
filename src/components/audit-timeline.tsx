import { Mono } from "@/components/ui";
import { ACTION_LABEL } from "@/lib/status";
import { formatCampus } from "@/lib/domain/time";

export type TimelineEntry = {
  id: number;
  action: string;
  reason: string | null;
  created_at: string;
  hash: string;
  actor: { full_name: string } | null;
};

export function AuditTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return <p className="text-sm text-subtle">No recorded actions yet.</p>;
  return (
    <ol className="relative space-y-5 border-l border-rule pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-card bg-accent" aria-hidden />
          <p className="text-sm font-medium text-ink">{ACTION_LABEL[e.action] ?? e.action}</p>
          <p className="text-xs text-subtle">
            {formatCampus(e.created_at)} · {e.actor?.full_name ?? "Saajha (automatic rule)"}
          </p>
          {e.reason && <p className="mt-0.5 text-sm text-ink-2">“{e.reason}”</p>}
          <Mono className="mt-0.5 block" title={e.hash}>
            #{e.hash.slice(0, 12)}
          </Mono>
        </li>
      ))}
    </ol>
  );
}
