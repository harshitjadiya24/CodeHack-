import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "draw" | "warn" | "danger" | "neutral";

const BAND: Record<Tone, string> = {
  ok: "tone-sage",
  draw: "tone-butter",
  warn: "tone-butter",
  danger: "tone-rose",
  neutral: "bg-paper-2 text-ink-2",
};

/** A booking as a claim tag: a soft status band, the facts, and a tear-off stub with the record hash. */
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
    <figure aria-label={`Booking ${code}: ${status}`} className={cn("overflow-hidden rounded-[22px] border border-rule bg-paper", className)}>
      <div className={cn("flex items-center justify-between gap-3 px-5 py-3 text-[15px] font-semibold", BAND[tone])}>
        <span>{status}</span>
        <span className="tab">{code}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 p-5">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[13px] text-subtle">{k}</dt>
            <dd className="font-semibold leading-snug">{v}</dd>
          </div>
        ))}
      </dl>
      {stub && (
        <div className="relative flex flex-wrap justify-between gap-2 border-t border-dashed border-rule px-5 py-3 text-[13px] text-subtle">
          <span aria-hidden className="absolute -left-3 -top-3 size-6 rounded-full border border-rule bg-card [clip-path:inset(0_0_0_50%)]" />
          <span aria-hidden className="absolute -right-3 -top-3 size-6 rounded-full border border-rule bg-card [clip-path:inset(0_50%_0_0)]" />
          <span className="min-w-0 break-all">{stub.left}</span>
          {stub.right && <span>{stub.right}</span>}
        </div>
      )}
    </figure>
  );
}
