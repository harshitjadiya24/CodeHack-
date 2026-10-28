import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "draw" | "warn" | "danger" | "neutral";

const BAND: Record<Tone, string> = {
  ok: "bg-board text-board-ink",
  draw: "bg-saffron-soft text-saffron",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-paper-2 text-ink-2",
};

/** A booking printed as a ticket: status band, the facts, a perforated stub with the record hash. */
export function Ticket({
  status,
  code,
  tone = "ok",
  rows,
  stub,
  className,
}: {
  status: string;
  code: string;
  tone?: Tone;
  rows: [string, ReactNode][];
  stub?: { left: ReactNode; right?: ReactNode };
  className?: string;
}) {
  return (
    <figure aria-label={`Ticket ${code}: ${status}`} className={cn("overflow-hidden rounded-lg border-2 border-ink bg-card", className)}>
      <div className={cn("chart-code flex items-center justify-between gap-3 px-4 py-3 text-[15px]", BAND[tone])}>
        <span>{status}</span>
        <span className="tab">{code}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 p-4">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[13px] font-semibold text-subtle">{k}</dt>
            <dd className="font-bold leading-snug [font-stretch:88%]">{v}</dd>
          </div>
        ))}
      </dl>
      {stub && (
        <div className="relative flex flex-wrap justify-between gap-2 border-t-2 border-dashed border-rule px-4 py-3 text-[13px] text-subtle">
          <span aria-hidden className="absolute -left-2.5 -top-2.5 size-5 rounded-full border-2 border-ink bg-paper [clip-path:inset(0_0_0_50%)]" />
          <span aria-hidden className="absolute -right-2.5 -top-2.5 size-5 rounded-full border-2 border-ink bg-paper [clip-path:inset(0_50%_0_0)]" />
          <span className="min-w-0 break-all">{stub.left}</span>
          {stub.right && <span>{stub.right}</span>}
        </div>
      )}
    </figure>
  );
}
