import Link from "next/link";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { campusInsights } from "@/lib/services/insights";
import { Hero } from "@/components/landing/hero";
import { Journey } from "@/components/landing/journey";
import { DrawDemo } from "@/components/landing/draw-demo";
import { LiveNumbers } from "@/components/landing/live-numbers";
import { SmoothScroll } from "@/components/landing/smooth-scroll";

const DEMO_ORG = "11111111-0000-0000-0000-000000000001";

const ROLES = [
  {
    role: "Students and researchers",
    gets: "See what they can use right now, what is missing and how to get it. Request, check in by QR, extend, return, and contest anything unfair.",
    demo: "Aarav or Meera",
  },
  {
    role: "Resource owners",
    gets: "List equipment in minutes, set badges and rules, decide requests with priority shown, verify condition on return, pause for maintenance.",
    demo: "Dr. Priya Nair",
  },
  {
    role: "Managers and attendants",
    gets: "Verify skill badges, confirm supervised check-ins in person, and decide incidents after reading both sides. No automatic penalties.",
    demo: "Prof. Sharma, Ravi",
  },
  {
    role: "The institution",
    gets: "Utilisation, idle capacity and fairness measured from real records, exported as evidence for accreditation reviews.",
    demo: "IQAC Office",
  },
];

export default async function Landing() {
  const [user, ins] = await Promise.all([getCurrentUser(), campusInsights(DEMO_ORG)]);
  const home = user ? homeFor(user.role) : null;

  return (
    <div className="min-h-screen">
      <SmoothScroll />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-blueprint/95 text-white backdrop-blur supports-[backdrop-filter]:bg-blueprint/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <Link href="/" className="font-display text-2xl font-semibold">
            Saajha
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm">
            <a href="#journey" className="hidden rounded-full px-3 py-2 text-white/75 hover:text-white sm:block">
              How it works
            </a>
            <a href="#draw" className="hidden rounded-full px-3 py-2 text-white/75 hover:text-white sm:block">
              Fair Draw
            </a>
            <Link href={home ?? "/login"} className="rounded-full bg-white px-4 py-2 font-medium text-blueprint hover:bg-white/90">
              {home ? "Open Saajha" : "Sign in"}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <Hero signedInHome={home} />

        <section aria-label="Live figures from the demo campus" className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <LiveNumbers
            stats={{
              value: ins.totals.value,
              hours: ins.totals.hours,
              served: ins.totals.uniqueUsers,
              borrowers: ins.totals.borrowers,
              idle: ins.totals.idleResources,
              gini: ins.fairness.gini,
            }}
          />
          <p className="mt-3 text-sm text-muted">
            Live from the demo campus database. {ins.totals.idleResources} of {ins.perResource.length} resources are still under 10% used: that is the
            capacity Saajha exists to unlock.
          </p>
        </section>

        <Journey />

        <section aria-labelledby="trust-lock" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 id="trust-lock" className="font-display text-4xl font-semibold leading-tight md:text-5xl">
                A lock, not a form
              </h2>
              <p className="mt-4 text-ink-2">
                Every verified badge on a student’s Trust Passport lifts one pin. Only when every pin the resource requires reaches the shear line
                does the drawer open, and the moment is printed onto a receipt chained to everything before it.
              </p>
              <p className="mt-3 text-sm text-muted">Aarav is missing his 3D-printer induction, so his middle pin stays down. Click the figure to try Meera’s passport.</p>
            </div>
            <iframe
              src="/figures/trust-lock.html"
              title="Interactive figure: Trust Passport pins unlock a lab locker drawer"
              loading="lazy"
              className="h-[640px] w-full rounded-2xl border-0"
            />
          </div>
        </section>

        <section id="draw" aria-label="Fair Draw demo" className="border-y border-rule bg-paper-2/60">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-8">
            <DrawDemo />
          </div>
        </section>

        <section aria-labelledby="roles" className="mx-auto max-w-6xl px-4 py-20 md:px-8">
          <h2 id="roles" className="max-w-2xl font-display text-4xl font-semibold leading-tight md:text-5xl">
            Built for everyone who touches the equipment
          </h2>
          <dl className="mt-10 divide-y divide-rule border-y border-rule">
            {ROLES.map((r) => (
              <div key={r.role} className="grid gap-2 py-6 md:grid-cols-[0.8fr_1.6fr_0.6fr] md:gap-8">
                <dt className="font-display text-2xl font-semibold">{r.role}</dt>
                <dd className="text-ink-2">{r.gets}</dd>
                <dd className="text-sm text-muted md:text-right">Try as {r.demo}</dd>
              </div>
            ))}
          </dl>
          <Link href={home ?? "/login"} className="mt-10 inline-flex rounded-full bg-accent px-7 py-3.5 font-medium text-accent-ink hover:opacity-90">
            {home ? "Open Saajha" : "Open the demo"}
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted md:px-8">
          <span>Saajha · built for the “Unlock Underused Equipment and Spaces” challenge. Demo data is fictional.</span>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/audit/verify" className="hover:text-ink">
              Verify the audit chain
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
