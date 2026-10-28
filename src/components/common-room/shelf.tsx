"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { categoryIcon, categoryTone } from "@/components/resource-icon";
import type { ShelfItem } from "@/lib/services/shelf";
import { cn } from "@/lib/utils";

// Where each tag sits on the two shelves (desktop), and how it leans.
const SPOTS = [
  { x: "6%", y: "6%", r: -3 },
  { x: "50%", y: "11%", r: 3 },
  { x: "9%", y: "54%", r: 2 },
  { x: "48%", y: "59%", r: -2.5 },
];

/** Four real things from the demo campus, propped on a shelf. Pick one up; it settles back where it was. */
export function Shelf({ items }: { items: ShelfItem[] }) {
  const reduce = useReducedMotion();
  const bounds = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={bounds}
      aria-label="Equipment on the demo campus shelf"
      role="list"
      className="relative grid grid-cols-2 gap-3 overflow-hidden rounded-[32px] border border-rule bg-card p-3 sm:block sm:h-[540px] sm:p-0"
    >
      <span aria-hidden className="absolute inset-x-6 top-[46%] hidden h-2.5 rounded-full bg-rule sm:block" />
      <span aria-hidden className="absolute inset-x-6 bottom-7 hidden h-2.5 rounded-full bg-rule sm:block" />
      {items.map((item, i) => {
        const spot = SPOTS[i % SPOTS.length];
        const Icon = categoryIcon(item.category);
        return (
          <motion.div
            key={item.id}
            role="listitem"
            drag={!reduce}
            dragConstraints={bounds}
            dragSnapToOrigin
            dragElastic={0.2}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 14 }}
            initial={reduce ? false : { opacity: 0, y: -48, rotate: spot.r * 3 }}
            animate={{ opacity: 1, y: 0, rotate: spot.r }}
            whileHover={reduce ? undefined : { y: -6, rotate: 0 }}
            whileDrag={{ scale: 1.06, rotate: 0, zIndex: 10, cursor: "grabbing" }}
            transition={{ type: "spring", stiffness: 220, damping: 16, delay: reduce ? 0 : 0.25 + i * 0.12 }}
            style={{ "--x": spot.x, "--y": spot.y } as React.CSSProperties}
            className={cn(
              "touch-pan-y select-none rounded-[22px] p-4 text-[13px] leading-snug sm:absolute sm:left-[var(--x)] sm:top-[var(--y)] sm:w-[44%] sm:max-w-[240px] sm:cursor-grab sm:p-[18px]",
              categoryTone(item.category),
            )}
          >
            <Icon className="size-9 sm:size-11" strokeWidth={1.6} aria-hidden />
            <b className="mt-2.5 block text-[15px] font-[750] leading-tight [font-stretch:110%] sm:text-base">{item.name}</b>
            <span className="mt-0.5 block opacity-85">{item.place}</span>
            <span className="tag-soft mt-2.5 inline-block rounded-full px-2.5 py-0.5 font-semibold">{item.tag}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
