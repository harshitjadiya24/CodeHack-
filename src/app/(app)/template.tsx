"use client";

import { motion, useReducedMotion } from "motion/react";

/** Route changes happen many times a day, so only a quick fade: enough to avoid a hard cut, never slow. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.14, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
