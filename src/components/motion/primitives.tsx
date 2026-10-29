"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { TextScramble } from "@/components/ui-kit/text-scramble";

// Formats live here, not in props: a server component can't pass a function to a client one.
const FORMATS = {
  lakh: (n: number) => `₹${(n / 100000).toFixed(2)}L`,
  int: (n: number) => `${Math.round(n)}`,
  fixed2: (n: number) => n.toFixed(2),
} as const;

/**
 * Counts up to a figure the first time it scrolls into view, then stays put.
 * The final text is rendered on the server, so the number is right with JS off.
 */
export function CountUp({ value, kind, suffix = "", className }: { value: number; kind: keyof typeof FORMATS; suffix?: string; className?: string }) {
  const format = FORMATS[kind];
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const reduce = useReducedMotion();
  const [text, setText] = useState(format(value) + suffix);

  useEffect(() => {
    if (!seen || reduce) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (n) => setText(format(n) + suffix),
    });
    return () => controls.stop();
  }, [seen, reduce, value, format, suffix]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

/** Lifts a block into place once, when it first enters the viewport. For one or two moments per page, not everything. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -5% 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** A record hash that types itself in like a ticket printer, the first time it is seen. Uses motion-primitives' TextScramble. */
export function PrintedHash({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: "0px 0px -5% 0px" });
  const reduce = useReducedMotion();
  return (
    <span ref={ref} className={className}>
      <TextScramble as="span" trigger={seen && !reduce} duration={0.9} speed={0.035} characterSet="0123456789abcdef">
        {children}
      </TextScramble>
    </span>
  );
}
