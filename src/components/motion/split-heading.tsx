"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/**
 * A headline whose lines rise out of a mask, once, as it enters the viewport.
 * SplitText keeps the full sentence as the accessible name (aria: "auto").
 */
export function SplitHeading({ as: Tag = "h2", id, className, children, immediate = false }: { as?: ElementType; id?: string; className?: string; children: ReactNode; immediate?: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let split: SplitText | undefined;
        // Split only once the web font is in, or line breaks are measured against the fallback face.
        void document.fonts.ready.then(() => {
          if (!ref.current) return;
          split = SplitText.create(ref.current, { type: "lines", mask: "lines", aria: "auto" });
          gsap.from(split.lines, {
            yPercent: 110,
            duration: 0.9,
            stagger: 0.08,
            ease: "expo.out",
            delay: immediate ? 0.35 : 0,
            scrollTrigger: immediate ? undefined : { trigger: ref.current, start: "top 85%", once: true },
          });
        });
        return () => split?.revert();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} className={className}>
      {children}
    </Tag>
  );
}
