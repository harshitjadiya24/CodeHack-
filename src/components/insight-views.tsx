import { Card } from "@/components/ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${9 + i}`);

export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-subtle">{label}</p>
      <p className="readout mt-2 text-5xl">{value}</p>
      {note && <p className="mt-1 text-xs text-subtle">{note}</p>}
    </Card>
  );
}

/** Booked hours by weekday and hour. Pale cells are idle capacity waiting to be lent. */
export function Heatmap({ heat }: { heat: number[][] }) {
  const max = Math.max(1, ...heat.flat());
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-xs">
        <caption className="sr-only">Booked hours by weekday and hour of day</caption>
        <thead>
          <tr>
            <th />
            {HOURS.map((h) => (
              <th key={h} scope="col" className="font-normal text-subtle">
                {h}:00
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heat.map((row, d) => (
            <tr key={DAYS[d]}>
              <th scope="row" className="pr-2 text-left font-normal text-subtle">
                {DAYS[d]}
              </th>
              {row.map((v, h) => (
                <td
                  key={h}
                  title={`${DAYS[d]} ${HOURS[h]}:00 · ${v} booked hour${v === 1 ? "" : "s"}`}
                  className="tab h-7 rounded-[3px] text-center text-[11px] font-bold"
                  style={{
                    background: v ? `color-mix(in srgb, var(--board) ${15 + Math.round((v / max) * 85)}%, var(--paper-2))` : "var(--paper-2)",
                    color: v / max > 0.45 ? "var(--board-ink)" : "var(--ink)",
                  }}
                >
                  {v || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UtilisationBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded bg-paper-2" aria-hidden>
        <div className={`h-full ${pct < 10 ? "bg-warn" : "bg-accent"}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className="w-9 text-right font-mono text-xs">{pct}%</span>
    </div>
  );
}
