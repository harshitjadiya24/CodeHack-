import { cn } from "@/lib/utils";

/** The station board: the name in Hindi and English, the campus code, today’s count. Saajha’s mark. */
export function StationBoard({ campus, code, openToday, when, className }: { campus: string; code: string; openToday: number; when: string; className?: string }) {
  return (
    <div className={cn("relative pb-10", className)}>
      <div
        role="img"
        aria-label={`Station board reading साझा, Saajha. ${campus}, ${openToday} labs open ${when}.`}
        className="board-plate board-in grid items-end gap-6 px-6 pb-6 pt-6 sm:grid-cols-[1fr_auto] sm:px-9 sm:pb-7 sm:pt-7"
      >
        <div>
          <p className="font-deva text-[clamp(3rem,7vw,6rem)] font-extrabold leading-[0.95] [font-stretch:80%]">साझा</p>
          <p className="type-display mt-1">SAAJHA</p>
        </div>
        <div className="font-semibold [font-stretch:88%] sm:pb-3 sm:text-right">
          <p className="text-[15px]">{campus}</p>
          <p className="readout my-1 text-[3.5rem] !text-board-ink">{code}</p>
          <p className="tab text-[15px]">
            {openToday} labs open {when}
          </p>
        </div>
      </div>
      {/* Two posts hold the board up. */}
      <div aria-hidden className="absolute inset-x-[14%] bottom-0 flex h-10 justify-between">
        <span className="w-3.5 bg-subtle" />
        <span className="w-3.5 bg-subtle" />
      </div>
    </div>
  );
}
