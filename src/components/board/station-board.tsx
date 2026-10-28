"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const Board3D = dynamic(() => import("./board-3d"), { ssr: false });

/** WebGL, a screen wide enough for the lettering, no reduced-motion request, and a device that isn't struggling. */
function canRun3D() {
  if (!matchMedia("(min-width: 640px) and (prefers-reduced-motion: no-preference)").matches) return false;
  if ((navigator.hardwareConcurrency ?? 8) < 4) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/**
 * The station board: the name in Hindi and English, the campus code, the day’s count. Saajha’s mark.
 * The HTML board renders first (and stays for screen readers); on capable devices a 3D board takes its place.
 */
export function StationBoard({ campus, code, openToday, when, className }: { campus: string; code: string; openToday: number; when: string; className?: string }) {
  const [use3D, setUse3D] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setUse3D(canRun3D()), []);
  const line = `${openToday} labs open ${when}`;

  return (
    <div className={cn("relative pb-10", className)}>
      <div
        role="img"
        aria-label={`Station board reading साझा, Saajha. ${campus}, ${line}.`}
        className={cn(
          "board-plate board-in grid items-end gap-6 px-6 pb-6 pt-6 transition-opacity duration-300 sm:aspect-[10/3.2] sm:grid-cols-[1fr_auto] sm:px-9 sm:pb-7 sm:pt-7",
          ready && "opacity-0",
        )}
      >
        <div>
          <p className="font-deva text-[clamp(3rem,7vw,6rem)] font-extrabold leading-[0.95] [font-stretch:80%]">साझा</p>
          <p className="type-display mt-1">SAAJHA</p>
        </div>
        <div className="font-semibold [font-stretch:88%] sm:pb-3 sm:text-right">
          <p className="text-[15px]">{campus}</p>
          <p className="readout my-1 text-[3.5rem] !text-board-ink">{code}</p>
          <p className="tab text-[15px]">{line}</p>
        </div>
      </div>
      {/* Two posts hold the board up. */}
      <div aria-hidden className={cn("absolute inset-x-[14%] bottom-0 flex h-10 justify-between transition-opacity duration-300", ready && "opacity-0")}>
        <span className="w-3.5 bg-subtle" />
        <span className="w-3.5 bg-subtle" />
      </div>
      {use3D && (
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")}>
          <Board3D campus={campus} code={code} line={line} onReady={() => setReady(true)} />
        </div>
      )}
    </div>
  );
}
