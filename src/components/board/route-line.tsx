"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Stop = { name: string; text: string; mark?: boolean };

/**
 * The seven stops as a railway line. As you scroll, the line is drawn and each station lights up
 * when the train reaches it. Scrubbed, so scrolling back runs it in reverse. Static under reduced motion.
 */
export function RouteLine({ stops }: { stops: Stop[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { wide: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)", narrow: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)" },
        (ctx) => {
          const wide = ctx.conditions?.wide;
          const dots = gsap.utils.toArray<HTMLElement>("[data-stop-dot]");
          const texts = gsap.utils.toArray<HTMLElement>("[data-stop-text]");
          gsap.set("[data-line-fill]", wide ? { scaleX: 0, transformOrigin: "left center" } : { scaleY: 0, transformOrigin: "center top" });
          gsap.set(texts, { opacity: 0.35 });

          const tl = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: { trigger: ref.current, start: wide ? "top 70%" : "top 75%", end: wide ? "bottom 45%" : "bottom 60%", scrub: 0.6 },
          });
          tl.to("[data-line-fill]", wide ? { scaleX: 1, duration: 1 } : { scaleY: 1, duration: 1 }, 0);
          dots.forEach((dot, i) => {
            const at = i / (dots.length - 1);
            tl.to(dot, { backgroundColor: "var(--board)", color: "var(--board-ink)", scale: 1.12, duration: 0.04 }, at * 0.96)
              .to(dot, { scale: 1, duration: 0.04 }, at * 0.96 + 0.04)
              .to(texts[i], { opacity: 1, duration: 0.06 }, at * 0.96);
          });
        },
      );
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <ol ref={ref} className="relative mt-12 grid gap-7 lg:grid-cols-7 lg:gap-0">
      {/* Track and the drawn line on top of it. */}
      <span aria-hidden className="absolute bottom-0 left-[15px] top-0 w-1 bg-rule lg:bottom-auto lg:left-0 lg:right-0 lg:top-[15px] lg:h-1 lg:w-auto" />
      <span data-line-fill aria-hidden className="absolute bottom-0 left-[15px] top-0 w-1 bg-ink lg:bottom-auto lg:left-0 lg:right-0 lg:top-[15px] lg:h-1 lg:w-auto" />
      {stops.map((s, i) => (
        <li key={s.name} className="relative grid grid-cols-[34px_1fr] gap-x-4 lg:block lg:pr-4">
          <span
            data-stop-dot
            aria-hidden
            className={cn("tab relative grid size-[34px] place-items-center rounded-full border-4 border-ink text-sm font-extrabold", s.mark ? "bg-board text-board-ink" : "bg-paper")}
          >
            {i + 1}
          </span>
          <div data-stop-text>
            <h3 className="type-h3 mt-1 text-xl lg:mt-4">{s.name}</h3>
            <p className="mt-1 text-[15px] leading-snug text-subtle">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
