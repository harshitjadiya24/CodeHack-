import Link from "next/link";
import { Check } from "lucide-react";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { campusInsights } from "@/lib/services/insights";
import { shelfItems } from "@/lib/services/shelf";
import { institutionCount } from "@/lib/services/institutions";
import { INSTITUTE_KINDS } from "@/lib/india";
import { Shelf } from "@/components/common-room/shelf";
import { DrawHat } from "@/components/common-room/draw-hat";
import { Ticket } from "@/components/common-room/ticket";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { ButtonLink } from "@/components/ui";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { SplitHeading } from "@/components/motion/split-heading";
import { CountUp, PrintedHash, Reveal } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DEMO_ORG = "11111111-0000-0000-0000-000000000001";

const STEPS = [
  { name: "Find it", text: "Browse by department, room or what you’re making." },
  { name: "Check you’re cleared", text: "Your training decides. If you’re not, you’re told why." },
  { name: "Ask for a slot", text: "Pick a time and say what it’s for." },
  { name: "Fair turns", text: "Too popular? Names go in the hat." },
  { name: "Owner says yes", text: "With a note you can read." },
  { name: "Pick it up", text: "Three photos with the attendant." },
  { name: "Bring it back", text: "Photos again. Any damage gets a fair look." },
];

const ROLES = [
  { role: "Students", tone: "tone-sky", gets: "See what you can use today and what’s missing. Ask, pick up by QR, extend, return, and contest anything unfair.", demo: "Aarav or Meera" },
  { role: "Lab owners", tone: "tone-sage", gets: "List equipment in minutes, set training rules, decide requests with priority shown, check condition on return.", demo: "Dr. Priya Nair" },
  { role: "Attendants and managers", tone: "tone-butter", gets: "Confirm supervised pick-ups in person, verify training, decide incidents after reading both sides.", demo: "Ravi, Prof. Sharma" },
  { role: "The institution", tone: "tone-rose", gets: "Use, idle capacity and fairness from real records, exported as evidence for accreditation.", demo: "IQAC Office" },
];

const DEPT_TONES = ["tone-sky", "tone-sage", "tone-butter", "tone-rose"];

export default async function Landing() {
  const [user, ins, shelf, reach] = await Promise.all([getCurrentUser(), campusInsights(DEMO_ORG), shelfItems(DEMO_ORG), institutionCount()]);
  const home = user ? homeFor(user.role) : null;
  const cta = home ?? "/login";

  const figures = [
    { value: ins.totals.value, kind: "lakh", label: "of equipment time lent in six weeks, at market rent" },
    { value: ins.totals.hours, kind: "int", suffix: " hrs", label: "of idle labs put to use" },
    { value: ins.totals.uniqueUsers, kind: "int", suffix: `/${ins.totals.borrowers}`, label: "students got a turn" },
    { value: ins.fairness.gini, kind: "fixed2", label: "fairness spread (Gini). Lower means nobody hogs a machine" },
  ] as const;

  // Departments on the demo campus, busiest first, with what each one lends.
  const depts = [
    ...ins.perResource
      .reduce((m, r) => {
        const name = r.dept?.name ?? "Shared spaces";
        const d = m.get(name) ?? { name, items: [] as string[], hours: 0 };
        d.items.push(r.name);
        d.hours += r.hours;
        return m.set(name, d);
      }, new Map<string, { name: string; items: string[]; hours: number }>())
      .values(),
  ].sort((a, b) => b.hours - a.hours || b.items.length - a.items.length);
  const [lead, ...rest] = depts;

  return (
    <div className="min-h-screen">
      <SmoothScroll />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1200px] items-center justify-between px-4 md:px-8">
          <Link href="/" aria-label="Baanto home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1.5 text-[15px] sm:gap-2">
            <a href="#shelf" className="hidden px-3 py-2 text-subtle transition-colors hover:text-ink lg:block">
              What’s on the shelf
            </a>
            <a href="#how" className="hidden px-3 py-2 text-subtle transition-colors hover:text-ink md:block">
              How it works
            </a>
            <a href="#draw" className="hidden px-3 py-2 text-subtle transition-colors hover:text-ink md:block">
              Fair turns
            </a>
            <a href="#institutes" className="hidden px-3 py-2 text-subtle transition-colors hover:text-ink xl:block">
              For institutes
            </a>
            <ThemeToggle />
            {!home && (
              <ButtonLink href="/signup" variant="secondary" className="hidden sm:inline-flex">
                Create account
              </ButtonLink>
            )}
            <ButtonLink href={cta}>{home ? "Open Baanto" : "Sign in"}</ButtonLink>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-[1200px] px-4 md:px-8">
        <div className="grid items-center gap-10 pt-6 md:pt-12 lg:grid-cols-2">
          <div>
            <SplitHeading as="h1" immediate className="type-display max-w-[11ch]">
              Borrow the lab next door.
            </SplitHeading>
            <p className="mt-6 max-w-[40ch] text-[19px] text-subtle">
              Your college already owns a 3D printer, a microscope and a camera kit. Most days nobody touches them. Baanto shows you which ones you’re
              cleared for and books you in.
            </p>
            <div className="mt-8 flex flex-wrap gap-2.5">
              <ButtonLink href={cta}>{home ? "Open Baanto" : "Browse equipment"}</ButtonLink>
              <ButtonLink href="/institutions/new" variant="secondary">
                Bring your campus
              </ButtonLink>
            </div>
          </div>
          <div>
            <Shelf items={shelf} />
            <p className="mt-3 text-center text-sm text-subtle">Live from the demo campus. Pick one up.</p>
          </div>
        </div>

        <section aria-labelledby="figures-note" className="mt-16 border-t border-rule md:mt-[72px]">
          <p id="figures-note" className="pt-4 text-sm text-subtle">
            Figures from the demo campus, a fictional college you can try below.
          </p>
          <dl className="grid grid-cols-2 gap-x-6 lg:grid-cols-4">
            {figures.map((f) => (
              <div key={f.label} className="flex flex-col py-6">
                <dt className="mt-2 max-w-[24ch] text-sm text-subtle">{f.label}</dt>
                <dd className="readout order-first text-[clamp(2.125rem,3.6vw,3rem)]">
                  <CountUp value={f.value} kind={f.kind} suffix={"suffix" in f ? f.suffix : ""} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="shelf" aria-labelledby="shelf-title" className="scroll-mt-24 pt-24 md:pt-32">
          <SplitHeading id="shelf-title" className="type-h2 max-w-[16ch]">
            {`${depts.length} departments, one shelf.`}
          </SplitHeading>
          <p className="mt-4 max-w-[52ch] text-lg text-subtle">Each department keeps its own rules. You only see what your year and training already unlock.</p>
          <Reveal className="mt-11 grid gap-3.5 md:auto-rows-[200px] md:grid-cols-[1.3fr_1fr_1fr]">
            {lead && (
              <div className="tone-sky flex min-h-[220px] flex-col justify-between rounded-[26px] p-6 md:row-span-2">
                <h3 className="type-h3">{lead.name}</h3>
                <ul className="grid gap-1.5 text-[15px]">
                  {lead.items.slice(0, 5).map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
                <p className="text-sm">{Math.round(lead.hours)} hours lent in six weeks.</p>
              </div>
            )}
            {rest.slice(0, 4).map((d, i) => (
              <div
                key={d.name}
                className={cn("flex min-h-[160px] flex-col justify-between rounded-[26px] p-6", i === 3 ? "border border-rule bg-card" : DEPT_TONES[(i + 1) % 4])}
              >
                <h3 className="type-h3">{d.name}</h3>
                <p className={cn("text-sm", i === 3 && "text-subtle")}>
                  {d.items.slice(0, 3).join(", ")}
                  {d.items.length > 3 && `, and ${d.items.length - 3} more`}
                </p>
              </div>
            ))}
          </Reveal>
        </section>

        <section id="how" aria-labelledby="how-title" className="scroll-mt-24 pt-24 md:pt-32">
          <SplitHeading id="how-title" className="type-h2 max-w-[16ch]">
            From “can I?” to “all yours”.
          </SplitHeading>
          <ol className="mt-11 grid grid-cols-2 gap-2.5 md:grid-cols-4 lg:grid-cols-7">
            {STEPS.map((s, i) => (
              <li key={s.name} className={cn("list-none", i % 2 === 1 && "lg:mt-9")}>
                <Reveal delay={i * 0.06} className="h-full rounded-[20px] border border-rule bg-card p-4 sm:min-h-[190px]">
                  <span aria-hidden className="tab grid size-8 place-items-center rounded-full bg-ink text-sm font-extrabold text-paper">
                    {i + 1}
                  </span>
                  <h3 className="mt-3.5 text-lg font-extrabold leading-tight tracking-[-0.02em] [font-stretch:112%]">{s.name}</h3>
                  <p className="mt-1.5 text-[14px] leading-snug text-subtle">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        <section id="draw" aria-labelledby="draw-title" className="scroll-mt-24 pt-24 md:pt-32">
          <SplitHeading id="draw-title" className="type-h2 max-w-[16ch]">
            Popular slot? Names go in the hat.
          </SplitHeading>
          <div className="mt-11 grid gap-5 lg:grid-cols-2">
            <div className="band-ink min-h-[360px] rounded-[32px] p-6 sm:p-8">
              <DrawHat slot="Sony A7 IV kit, Thursday 9 am" />
            </div>
            <div className="rounded-[32px] border border-rule bg-card p-6 sm:p-8">
              <h3 className="type-h3">Why it’s fair</h3>
              <ol className="mt-5 grid list-decimal gap-4 pl-5 text-subtle marker:font-bold marker:text-ink">
                <li>
                  <b className="text-ink">Everyone who asked in time gets in.</b> Asking first doesn’t win.
                </li>
                <li>
                  <b className="text-ink">If you’ve had less, you count a bit more.</b> Weight goes up when you’ve used fewer hours this month.
                </li>
                <li>
                  <b className="text-ink">The coin is sealed in advance.</b> Anyone can re-run the draw later and get the same name, including the people who
                  didn’t win.
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section aria-labelledby="app-title" className="pt-24 md:pt-32">
          <SplitHeading id="app-title" className="type-h2 max-w-[16ch]">
            The app, from your side.
          </SplitHeading>
          <Reveal className="mt-11 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-rule bg-card p-6 sm:p-7">
              <p className="text-sm text-subtle">Media Lab M-03, Prof. Iyer</p>
              <h3 className="mt-1.5 text-[28px] font-[850] leading-none tracking-[-0.035em] [font-stretch:115%]">Sony A7 IV camera kit</h3>
              <p className="tone-sage mt-5 flex items-center gap-3 rounded-2xl px-4 py-3.5 font-semibold">
                <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden /> You’re cleared: camera handling done 20 Sep
              </p>
              <Ticket
                className="mt-5"
                status="Confirmed"
                code="BT-4827"
                rows={[
                  ["Borrower", "Meera Shah, B.Des 3"],
                  ["Slot", "Thu 29 Oct, 11:00–16:00"],
                  ["Pick-up", "Media desk, ground floor"],
                  ["Won by", "Draw, 1 of 6"],
                ]}
                stub={{ left: <span className="font-mono">record <PrintedHash>9f2c8e0b41d7</PrintedHash>, linked to 18 before it</span>, right: "Show at the desk" }}
              />
            </div>
            <div className="rounded-[28px] border border-rule bg-card p-6 sm:p-7">
              <h3 className="type-h3 text-[22px]">What happened</h3>
              <ul className="mt-5 grid gap-4">
                {[
                  { who: "MS", tone: "tone-butter", text: "You won the draw for Thursday", at: "Today, 09:01" },
                  { who: "PI", tone: "tone-sky", text: "Prof. Iyer approved: “Have fun at the fest.”", at: "Today, 09:20" },
                  { who: "AT", tone: "tone-sage", text: "Picked up with 3 photos, all clean", at: "Today, 11:04" },
                ].map((e) => (
                  <li key={e.text} className="grid grid-cols-[36px_1fr] gap-3 text-[15px]">
                    <span aria-hidden className={cn("grid size-9 place-items-center rounded-full text-[13px] font-extrabold", e.tone)}>
                      {e.who}
                    </span>
                    <span>
                      {e.text}
                      <span className="block text-[13px] text-subtle">{e.at}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-rule pt-4 text-[15px] text-subtle">
                This month <b className="text-ink">9 of 20 hours</b> used. Your draw weight is 1.3×.
              </p>
            </div>
          </Reveal>
        </section>

        <section id="institutes" aria-labelledby="institutes-title" className="scroll-mt-24 pt-24 md:pt-32">
          <div className="grid gap-10 rounded-[32px] border border-rule bg-card p-6 sm:p-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SplitHeading id="institutes-title" className="type-h2 max-w-[14ch]">
                Bring your whole campus.
              </SplitHeading>
              <p className="mt-4 max-w-[46ch] text-lg text-subtle">
                Any college in India can join in a few minutes. Departments, starter training and a fair-use policy come set up for your kind of institute.
                Your own campus can start right away; other campuses see you once we’ve checked you’re real.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <ButtonLink href="/institutions/new">Register your institute</ButtonLink>
                <ButtonLink href="/signup" variant="secondary">
                  Join as a student
                </ButtonLink>
              </div>
            </div>
            <div>
              <dl className="grid grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <dt className="mt-2 text-sm text-subtle">institutes on Baanto</dt>
                  <dd className="readout order-first text-[clamp(2.75rem,5vw,4rem)]">
                    <CountUp value={reach.institutes} kind="int" />
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="mt-2 text-sm text-subtle">states and union territories</dt>
                  <dd className="readout order-first text-[clamp(2.75rem,5vw,4rem)]">
                    <CountUp value={reach.states} kind="int" />
                  </dd>
                </div>
              </dl>
              <ul className="mt-8 flex flex-wrap gap-2" aria-label="Kinds of institutes">
                {Object.values(INSTITUTE_KINDS).map((k, i) => (
                  <li key={k} className={cn("rounded-full px-3.5 py-1.5 text-[15px] font-medium", DEPT_TONES[i % 4])}>
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="roles-title" className="pt-24 md:pt-32">
          <SplitHeading id="roles-title" className="type-h2 max-w-[18ch]">
            Everyone who touches the equipment.
          </SplitHeading>
          <dl className="mt-10">
            {ROLES.map((r) => (
              <div key={r.role} className="grid gap-2 border-t border-rule py-6 md:grid-cols-[0.8fr_1.6fr_0.6fr] md:items-baseline md:gap-8">
                <dt>
                  <span className={cn("inline-block rounded-full px-3.5 py-1 text-lg font-extrabold tracking-[-0.02em] [font-stretch:112%]", r.tone)}>{r.role}</span>
                </dt>
                <dd className="text-ink-2">{r.gets}</dd>
                <dd className="text-[15px] text-subtle md:text-right">Try as {r.demo}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href={cta}>{home ? "Open Baanto" : "Open the demo"}</ButtonLink>
            {!home && (
              <ButtonLink href="/signup" variant="secondary">
                Create your account
              </ButtonLink>
            )}
            <span className="text-[15px] text-subtle">Want to look around first? The demo campus needs no sign-up.</span>
          </div>
        </section>
      </main>

      <footer className="mt-32 border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 pb-12 pt-8 text-sm text-subtle md:px-8">
          <span>
            <Wordmark className="mr-2 text-base text-ink" /> lets colleges share the equipment and spaces they already own. The demo campus is fictional.
          </span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/audit/verify" className="hover:text-ink">
              Check the record
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
