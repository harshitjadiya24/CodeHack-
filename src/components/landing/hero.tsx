"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Magnetic, TextReveal } from "@/components/motion/primitives";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false, loading: () => null });

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Hero({ signedInHome }: { signedInHome: string | null }) {
  const reduce = useReducedMotion();
  const [gl, setGl] = useState<boolean | null>(null);
  useEffect(() => setGl(webglAvailable()), []);

  return (
    <section className="blueprint-grid relative overflow-hidden text-white">
      {/* Title-block corner marks, as on an engineering drawing sheet. */}
      <div aria-hidden className="pointer-events-none absolute inset-4 hidden border border-white/15 md:block" />
      <div aria-hidden className="pointer-events-none absolute bottom-4 right-4 hidden border-l border-t border-white/15 px-4 py-2 font-mono text-[11px] leading-5 text-white/55 md:block">
        DWG SAAJHA-001 · SHARED LAB RESOURCES
        <br />
        NORTHFIELD INST. OF TECH · SCALE 1:1
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 pb-10 pt-10 md:px-8 lg:min-h-[calc(100vh-72px)] lg:grid-cols-[1.2fr_1fr] lg:pt-4">
        <div className="relative z-10">
          <p className="mb-5 text-sm text-white/75">
            <span lang="hi" className="font-display text-base text-signal">साझा</span> means “shared”
          </p>
          <h1 className="font-display text-[clamp(2.4rem,5vw,4.4rem)] font-semibold leading-[0.98]">
            <TextReveal text="The lab register," />
            <br />
            <TextReveal text="rebuilt for trust." delay={0.25} />
          </h1>
          <motion.p
            className="mt-6 max-w-xl text-lg text-white/80"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
          >
            Campus printers, scopes and studios sit idle most of the week. Saajha lends them to students who are verified to use them, shares
            scarce slots fairly, and keeps a record of every handover that nobody can quietly edit.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.6 }}
          >
            <Magnetic>
              <Link
                href={signedInHome ?? "/login"}
                className="inline-flex items-center rounded-full bg-accent px-7 py-3.5 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(255,90,31,0.7)] transition hover:bg-signal"
              >
                {signedInHome ? "Open Saajha" : "Try the live demo"}
              </Link>
            </Magnetic>
            <a href="#journey" className="rounded-full border border-white/30 px-5 py-3.5 text-base text-white transition hover:bg-white/10">
              Follow one booking
            </a>
          </motion.div>
          <p className="mt-4 text-sm text-white/60">One-click accounts for every role. All people and data are fictional.</p>
        </div>

        <motion.div
          className="relative h-[360px] sm:h-[460px] lg:h-[600px]"
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          {gl === true && <HeroScene still={!!reduce} />}
          {gl === false && (
            <div className="grid h-full place-items-center rounded-2xl border border-white/20 p-8 text-center text-white/80">
              Three pins, one per verified badge. All three up and the drawer opens.
            </div>
          )}
          <p className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/20 px-3 py-1 text-xs text-white/70">
            Pins rise for each verified badge
          </p>
        </motion.div>
      </div>
    </section>
  );
}
