import Link from "next/link";
import { Check, X } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { campusInsights } from "@/lib/services/insights";
import { bookingChart, CHART_SLOTS } from "@/lib/services/chart";
import { StationBoard } from "@/components/board/station-board";
import { LiveChart } from "@/components/board/live-chart";
import { DrawBoard } from "@/components/board/draw-board";
import { Ticket } from "@/components/board/ticket";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

const DEMO_ORG = "11111111-0000-0000-0000-000000000001";

const STOPS = [
  { name: "Find", text: "Search the chart by room, time or what you’re making." },
  { name: "Check your pass", text: "Your training and year decide what unlocks. You’re told why." },
  { name: "Request", text: "Pick a slot and say what it’s for." },
  { name: "Draw", text: "Too many asks for one hour? A seeded draw anyone can re-run.", mark: true },
  { name: "Approve", text: "The lab owner decides, with a reason you can read." },
  { name: "Hand over", text: "Three photos at pick-up. Condition agreed on both sides." },
  { name: "Return", text: "Photos again. Damage goes to a fair review, not a fight." },
];

const ROLES = [
  { role: "Students", gets: "See what you can use today and what’s missing. Request, check in by QR, extend, return, and contest anything unfair.", demo: "Aarav or Meera" },
  { role: "Lab owners", gets: "List equipment in minutes, set training rules, decide requests with priority shown, verify condition on return.", demo: "Dr. Priya Nair" },
  { role: "Attendants and managers", gets: "Confirm supervised pick-ups in person, verify training, and decide incidents after reading both sides.", demo: "Ravi, Prof. Sharma" },
  { role: "The institution", gets: "Utilisation, idle capacity and fairness from real records, exported as evidence for accreditation.", demo: "IQAC Office" },
];

export default async function Landing() {
  const [user, ins, chart] = await Promise.all([getCurrentUser(), campusInsights(DEMO_ORG), bookingChart(DEMO_ORG)]);
  const home = user ? homeFor(user.role) : null;
  const cta = home ?? "/login";

  const figures = [
    { value: `₹${(ins.totals.value / 100000).toFixed(2)}L`, label: "worth of equipment time lent in six weeks, at market rent" },
    { value: `${Math.round(ins.totals.hours)}`, label: "hours of idle labs put to use" },
    { value: `${ins.totals.uniqueUsers}/${ins.totals.borrowers}`, label: "registered students served at least once" },
    { value: ins.fairness.gini.toFixed(2), label: "usage spread (Gini). Lower means no one hogs a machine" },
  ];

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold">
            <span aria-hidden className="board-chip grid size-8 place-items-center rounded-[4px] font-deva text-[17px]">
              सा
            </span>
            Saajha
          </Link>
          <nav aria-label="Main" className="flex items-center gap-2 text-[15px]">
            <a href="#chart" className="hidden px-3 py-2 text-subtle hover:text-ink md:block">
              The chart
            </a>
            <a href="#route" className="hidden px-3 py-2 text-subtle hover:text-ink md:block">
              How it works
            </a>
            <a href="#draw" className="hidden px-3 py-2 text-subtle hover:text-ink md:block">
              The draw
            </a>
            <ThemeToggle />
            <ButtonLink href={cta}>{home ? "Open Saajha" : "Sign in"}</ButtonLink>
          </nav>
        </div>
      </header>

      <main id="main">
        <div className="mx-auto max-w-[1240px] px-4 pt-8 md:px-8 md:pt-10">
          <StationBoard campus="Northfield Institute of Technology" code="NFIT" openToday={chart.openToday} when={chart.when} />

          <div className="mt-12 grid items-end gap-8 md:mt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <h1 className="type-h1 max-w-[13ch]">Every lab on campus, on one chart.</h1>
            <div>
              <p className="max-w-[46ch] text-lg text-ink-2">
                The 3D printer, the microscope and the studio camera sit idle most of the week. Saajha shows which ones you’re cleared for, books
                you a slot, and runs a fair draw when too many people want the same hour.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <ButtonLink href={cta}>{home ? "Open Saajha" : "Find a slot"}</ButtonLink>
                <ButtonLink href="#draw" variant="secondary">
                  How the draw works
                </ButtonLink>
              </div>
            </div>
          </div>

          <section id="chart" aria-label="Booking chart" className="mt-12 scroll-mt-24">
            <LiveChart rows={chart.rows} slots={CHART_SLOTS} dayLabel={chart.dayLabel} />
          </section>

          <section aria-label="Figures from the demo campus" className="mt-24 border-t-2 border-ink">
            <dl className="grid grid-cols-2 gap-x-6 lg:grid-cols-4">
              {figures.map((f) => (
                <div key={f.label} className="pt-6">
                  <dd className="readout text-[clamp(2.75rem,5vw,4.25rem)]">{f.value}</dd>
                  <dt className="mt-2 max-w-[24ch] text-[15px] text-subtle">{f.label}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm text-subtle">
              Counted from the demo campus database. {ins.totals.idleResources} of {ins.perResource.length} resources are still under 10% used.
            </p>
          </section>
        </div>

        <section id="route" aria-labelledby="route-title" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 pt-28 md:px-8 md:pt-36">
          <p className="text-[15px] font-semibold text-subtle">From request to return</p>
          <h2 id="route-title" className="type-h2 mt-2 max-w-[18ch]">
            Seven stops, every one on record.
          </h2>
          <ol className="relative mt-12 grid gap-7 before:absolute before:bottom-0 before:left-[15px] before:top-0 before:w-1 before:bg-ink lg:grid-cols-7 lg:gap-0 lg:before:bottom-auto lg:before:left-0 lg:before:right-0 lg:before:top-[15px] lg:before:h-1 lg:before:w-auto">
            {STOPS.map((s, i) => (
              <li key={s.name} className="relative grid grid-cols-[34px_1fr] gap-x-4 lg:block lg:pr-4">
                <span
                  aria-hidden
                  className={`tab relative grid size-[34px] place-items-center rounded-full border-4 border-ink text-sm font-extrabold ${s.mark ? "bg-board text-board-ink" : "bg-paper"}`}
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="type-h3 mt-1 text-xl lg:mt-4">{s.name}</h3>
                  <p className="mt-1 text-[15px] leading-snug text-subtle">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="draw" aria-labelledby="draw-title" className="band-ink mt-28 scroll-mt-16 md:mt-36">
          <div className="mx-auto grid max-w-[1240px] gap-12 px-4 py-20 md:px-8 md:py-28 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-[15px] font-semibold text-subtle">When a slot is full</p>
              <h2 id="draw-title" className="type-h2 mt-2">
                Six people, one camera. The draw decides.
              </h2>
              <p className="mt-5 max-w-[44ch] text-ink-2">
                Everyone who asked before the cut-off is entered. People who’ve had less time this month get more weight. The seed is locked
                before anyone asks, so the result can be checked later by anyone, including the people who lost.
              </p>
            </div>
            <DrawBoard />
          </div>
        </section>

        <section aria-labelledby="app-title" className="mx-auto max-w-[1240px] px-4 pt-28 md:px-8 md:pt-36">
          <p className="text-[15px] font-semibold text-subtle">Inside the app</p>
          <h2 id="app-title" className="type-h2 mt-2 max-w-[18ch]">
            Your booking reads like a ticket.
          </h2>
          <div className="mt-12 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-lg border border-rule bg-card p-5 sm:p-7">
              <h3 className="type-h3 text-[1.75rem]">Sony A7 IV camera kit</h3>
              <p className="mt-1 text-[15px] text-subtle">Media Lab M-03, owner Prof. Iyer, ₹1,800 a day at market rent</p>
              <Ticket
                className="mt-6"
                status="Confirmed"
                code="SJ-4827"
                rows={[
                  ["Borrower", "Meera Shah, B.Des 3"],
                  ["Slot", "Thu 29 Oct, 11:00–16:00"],
                  ["Pick-up", "Media desk, ground floor"],
                  ["Won by", "Draw, 1 of 6"],
                ]}
                stub={{ left: <span className="font-mono">record 9f2c…41d7, linked to 18 before it</span>, right: "Show at the desk" }}
              />
            </div>
            <div className="rounded-lg border border-rule bg-card p-5 sm:p-7">
              <h3 className="type-h3 text-[1.75rem]">Your pass</h3>
              <p className="mt-1 text-[15px] text-subtle">What you’re cleared for</p>
              <ul className="mt-5 space-y-3 text-[15px]">
                <li className="flex gap-3">
                  <Check className="mt-0.5 size-[18px] shrink-0 text-ok" strokeWidth={2.5} aria-label="Done" />Printer safety, done 12 Aug
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 size-[18px] shrink-0 text-ok" strokeWidth={2.5} aria-label="Done" />Bio lab induction, done 3 Sep
                </li>
                <li className="flex gap-3">
                  <Check className="mt-0.5 size-[18px] shrink-0 text-ok" strokeWidth={2.5} aria-label="Done" />Camera handling, done 20 Sep
                </li>
                <li className="flex gap-3">
                  <X className="mt-0.5 size-[18px] shrink-0 text-danger" strokeWidth={2.5} aria-label="Missing" />Electronics bench needs 3rd year
                </li>
              </ul>
              <p className="mt-6 border-t border-rule pt-4 text-[15px] text-subtle">
                This month <b className="text-ink">9 of 20 hours</b> used. Your draw weight is 1.3×.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="roles-title" className="mx-auto max-w-[1240px] px-4 pt-28 md:px-8 md:pt-36">
          <h2 id="roles-title" className="type-h2 max-w-[20ch]">
            Everyone who touches the equipment.
          </h2>
          <dl className="mt-10 border-t-2 border-ink">
            {ROLES.map((r) => (
              <div key={r.role} className="grid gap-2 border-b border-rule py-6 md:grid-cols-[0.8fr_1.6fr_0.6fr] md:gap-8">
                <dt className="type-h3">{r.role}</dt>
                <dd className="text-ink-2">{r.gets}</dd>
                <dd className="text-[15px] text-subtle md:text-right">Try as {r.demo}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <ButtonLink href={cta} variant="board">
              {home ? "Open Saajha" : "Open the demo"}
            </ButtonLink>
            <span className="text-[15px] text-subtle">Demo accounts, no sign-up. Pick a person and you’re in.</span>
          </div>
        </section>
      </main>

      <footer className="mt-28 border-t border-rule md:mt-36">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-subtle md:px-8">
          <span>Saajha, built for “Unlock Underused Equipment and Spaces”. Demo data is fictional.</span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/audit/verify" className="hover:text-ink">
              Verify the record
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
