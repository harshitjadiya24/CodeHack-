"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Step = { title: string; who: string; body: string; mock: React.ReactNode };

const Row = ({ ok, children }: { ok: boolean | null; children: React.ReactNode }) => (
  <li className="flex items-center gap-2">
    <span className={cn("grid size-5 place-items-center rounded-full text-[11px] font-bold", ok === null ? "bg-paper-2 text-muted" : ok ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger")}>
      {ok === null ? "i" : ok ? "✓" : "✗"}
    </span>
    {children}
  </li>
);

const STEPS: Step[] = [
  {
    title: "The owner lists it, with conditions",
    who: "Dr. Priya Nair, makerspace in-charge",
    body: "Opening hours, required badges, deposit, supervision, the handover checklist and the photos every borrower must take.",
    mock: (
      <div className="space-y-3">
        <p className="font-display text-xl font-semibold">Ultimaker S5 3D Printer</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-saffron-soft px-2 py-0.5 text-saffron">High demand</span>
          <span className="rounded bg-accent-soft px-2 py-0.5 text-accent">Needs: Safety induction</span>
          <span className="rounded bg-paper-2 px-2 py-0.5">Max 4 h</span>
        </div>
        <ul className="list-disc pl-5 text-sm text-ink-2">
          <li>Nozzle clean, no filament residue</li>
          <li>Build plate clean and undamaged</li>
        </ul>
      </div>
    ),
  },
  {
    title: "A student checks eligibility",
    who: "Aarav, 2nd-year CSE",
    body: "Saajha reads his Trust Passport and shows exactly what is missing, with the way to fix it, before he wastes a request.",
    mock: (
      <ul className="space-y-2 text-sm">
        <Row ok>Verified campus identity</Row>
        <Row ok={false}>3D Printer Safety Induction</Row>
        <Row ok>Good standing (0 of 3 strikes)</Row>
        <li className="pl-7 text-accent">Upload your certificate; a manager verifies it.</li>
      </ul>
    ),
  },
  {
    title: "The request meets fair-use rules",
    who: "Meera, with a capstone deadline",
    body: "Weekly credits, a cap on active bookings and a cooldown keep anyone from monopolising a scarce machine. Every point of priority is explained.",
    mock: (
      <div className="space-y-2 text-sm">
        {[
          ["Base score", "+100"],
          ["Course deadline stated", "+10"],
          ["Used 7 h in the last 30 days", "−14"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-rule pb-1">
            <span className="text-ink-2">{k}</span>
            <span className={cn("font-mono", v.startsWith("−") ? "text-danger" : "text-ok")}>{v}</span>
          </div>
        ))}
        <p className="font-medium">Priority 96 · 14 of 20 credits left</p>
      </div>
    ),
  },
  {
    title: "A clash goes to a Fair Draw",
    who: "Meera and Kabir want the same Friday slot",
    body: "A weighted lottery whose seed is locked in before anyone applies. Anyone can re-run it and get the same result.",
    mock: (
      <div className="space-y-3 text-sm">
        <p className="break-all font-mono text-xs text-muted">commit 1949fc8d9b7a7c9898a99953…</p>
        {[
          ["Meera", 53],
          ["Kabir", 47],
        ].map(([n, p]) => (
          <div key={n as string}>
            <div className="flex justify-between">
              <span>{n}</span>
              <span className="font-mono">{p}%</span>
            </div>
            <div className="mt-1 h-2 rounded bg-paper-2">
              <div className="h-2 rounded bg-saffron" style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Check-in records the condition",
    who: "Kabir scans the QR tag on the printer",
    body: "Guided photos from set angles and a checklist. Supervised machines wait for the attendant to confirm in person.",
    mock: (
      <div className="grid grid-cols-3 gap-2">
        {["Front view", "Build plate", "Nozzle"].map((s) => (
          <div key={s} className="grid aspect-[4/3] place-items-center rounded-md border border-dashed border-rule bg-paper-2 p-1 text-center text-xs text-ink-2">
            ✓ {s}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Return, compare, report",
    who: "Owner verifies; manager decides",
    body: "Before and after are compared item by item. Damage becomes an incident the borrower can contest, and only a person decides any penalty.",
    mock: (
      <div className="space-y-2 text-sm">
        <Row ok>Nozzle clean</Row>
        <Row ok={false}>Build plate undamaged</Row>
        <p className="rounded-md bg-warn-soft p-2 text-warn">Worse than at check-in: build plate. Sent to the manager, not penalised automatically.</p>
      </div>
    ),
  },
  {
    title: "Everyone sees the same history",
    who: "Student, owner and admin",
    body: "Every approval, extension, return and decision is hash-chained. Change one record and the chain breaks for everyone to see.",
    mock: (
      <ol className="space-y-2 font-mono text-xs">
        {["Request submitted  #29805d", "Won Fair Draw      #22f00d", "Checked in         #bb52f8", "Returned           #723f33", "Closed, decided    #a91c4e"].map((l) => (
          <li key={l} className="rounded bg-paper-2 px-2 py-1">
            {l}
          </li>
        ))}
        <li className="font-sans text-sm text-ok">Chain verified · 16 of 16 records</li>
      </ol>
    ),
  },
];

export function Journey() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-step-card]");
        gsap.set(cards, { autoAlpha: 0, y: 40 });
        gsap.set(cards[0], { autoAlpha: 1, y: 0 });
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: "[data-journey-pin]",
            start: "top top+=72",
            end: `+=${cards.length * 70}%`,
            pin: true,
            scrub: 0.6,
            snap: { snapTo: 1 / (cards.length - 1), duration: 0.35, ease: "power2.out" },
            onUpdate: (self) => setActive(Math.round(self.progress * (cards.length - 1))),
          },
        });
        cards.slice(1).forEach((card, i) => {
          tl.to(cards[i], { autoAlpha: 0, y: -40, duration: 0.5 }).to(card, { autoAlpha: 1, y: 0, duration: 0.5 }, "<0.15");
        });
        gsap.to("[data-journey-rail]", { scaleY: 1, ease: "none", scrollTrigger: { trigger: "[data-journey-pin]", start: "top top+=72", end: `+=${cards.length * 70}%`, scrub: true } });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="journey" aria-labelledby="journey-title" className="border-y border-rule bg-card">
      <div data-journey-pin className="mx-auto max-w-6xl px-4 py-16 md:px-8 lg:min-h-[calc(100vh-72px)] lg:py-20">
        <h2 id="journey-title" className="max-w-2xl font-display text-4xl font-semibold leading-tight md:text-5xl">
          One booking, start to finish
        </h2>
        <p className="mt-3 max-w-xl text-ink-2">Seven steps the problem statement asks for, each one something a judge can click through in the demo.</p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          {/* Step list with a progress rail (desktop) */}
          <ol className="relative hidden space-y-1 lg:block">
            <span aria-hidden className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px bg-rule" />
            <span aria-hidden data-journey-rail className="absolute left-[15px] top-2 h-[calc(100%-1rem)] w-px origin-top scale-y-0 bg-accent" />
            {STEPS.map((s, i) => (
              <li key={s.title} className={cn("relative flex gap-4 rounded-lg py-2 pl-0 pr-3 transition-colors", i === active ? "text-ink" : "text-muted")}>
                <span
                  className={cn(
                    "relative z-10 grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors",
                    i <= active ? "border-accent bg-accent text-accent-ink" : "border-rule bg-card",
                  )}
                >
                  {i + 1}
                </span>
                <span className="pt-1">
                  <span className="block font-medium">{s.title}</span>
                  {i === active && <span className="mt-1 block max-w-sm text-sm text-ink-2">{s.body}</span>}
                </span>
              </li>
            ))}
          </ol>

          {/* Cards: stacked and pinned on desktop, a plain list on mobile or reduced motion */}
          <div className="relative lg:h-[420px]">
            {STEPS.map((s, i) => (
              <article
                key={s.title}
                data-step-card
                className="mb-6 rounded-2xl border border-rule bg-paper p-6 shadow-[0_24px_48px_-32px_rgba(23,32,54,0.45)] lg:absolute lg:inset-0 lg:mb-0"
              >
                <p className="text-sm text-muted">
                  Step {i + 1} of {STEPS.length} · {s.who}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-2 lg:hidden">{s.body}</p>
                <div className="mt-5 rounded-xl border border-rule bg-card p-5">{s.mock}</div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
