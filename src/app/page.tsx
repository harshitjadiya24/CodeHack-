import Link from "next/link";
import { BadgeCheck, Dices, FileCheck2, Link2, QrCode, ScanEye } from "lucide-react";
import { ButtonLink, Card } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/lib/auth";

const PILLARS = [
  {
    icon: BadgeCheck,
    title: "Trust Passport",
    body: "Verified skill badges per equipment class. Eligibility is checked against them, and every gap comes with a way to close it.",
  },
  {
    icon: Dices,
    title: "Fair Draw",
    body: "When people want the same slot on a scarce machine, a weighted lottery decides. The seed is committed in advance, so anyone can verify it.",
  },
  {
    icon: QrCode,
    title: "QR handover",
    body: "Scan the tag on the device to check in. Guided photos and a checklist record its condition before and after, with attendant sign-off where needed.",
  },
  {
    icon: Link2,
    title: "Tamper-evident record",
    body: "Every approval, rejection, return and incident is hash-chained. Edit one row and the chain breaks for everyone to see.",
  },
  {
    icon: ScanEye,
    title: "AI that advises",
    body: "Smart matching, listing drafts and before/after comparison. A person makes every access, safety and penalty decision.",
  },
  {
    icon: FileCheck2,
    title: "Utilisation evidence",
    body: "Idle hours, value unlocked and fairness metrics, exported in the shape accreditation reviews already ask for.",
  },
];

const STEPS = [
  "Owner lists a resource and its rules",
  "Student checks eligibility and requests",
  "Fair-use rules and conflicts are checked",
  "Owner approves, or a Fair Draw decides",
  "Check-in with photos and a checklist",
  "Return, verification and any incident",
  "Both sides see the full, verifiable history",
];

export default async function Landing() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 md:px-8">
        <span className="font-display text-2xl">Saajha</span>
        {user ? (
          <ButtonLink href={homeFor(user.role)}>Open Saajha</ButtonLink>
        ) : (
          <ButtonLink href="/login" variant="secondary">
            Sign in
          </ButtonLink>
        )}
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8 md:pt-20">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-saffron">साझा · shared</p>
          <h1 className="max-w-4xl font-display text-5xl leading-[1.05] md:text-7xl">
            Unlock idle labs. Share with trust. Prove it with data.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-2">
            Campus 3D printers, oscilloscopes, cameras and studios sit unused for most of the week while students who need them cannot get
            access. Saajha lets institutions lend them safely: verified eligibility, fair allocation, documented handovers and a record nobody
            can quietly change.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/login" className="px-6 py-3 text-base">
              Try the live demo
            </ButtonLink>
            <ButtonLink href="#how" variant="secondary" className="px-6 py-3 text-base">
              See how it works
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-muted">One-click demo accounts for every role. All data is fictional.</p>
        </section>

        <section aria-labelledby="trust-lock" className="mx-auto max-w-6xl px-4 pb-16 md:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">How eligibility works</p>
              <h2 id="trust-lock" className="mt-1 font-display text-4xl leading-tight">
                A lock, not a form
              </h2>
              <p className="mt-3 text-ink-2">
                Every verified badge on a student’s Trust Passport lifts one pin. Only when every pin the resource requires reaches the shear
                line does the drawer open, and the moment is printed onto a receipt chained to everything before it.
              </p>
              <p className="mt-3 text-sm text-muted">Aarav is missing his 3D-printer induction, so his middle pin stays down. Meera’s passport opens it.</p>
            </div>
            <iframe
              src="/figures/trust-lock.html"
              title="Interactive figure: Trust Passport pins unlock a lab locker drawer"
              loading="lazy"
              className="h-[640px] w-full rounded-lg border-0"
            />
          </div>
        </section>

        <section className="border-y border-rule bg-card">
          <div className="mx-auto grid max-w-6xl gap-px bg-rule md:grid-cols-3">
            {[
              ["Is it free?", "Every booking tool answers this."],
              ["Should this person get it, and is that fair?", "Saajha answers this, with reasons."],
              ["Can we prove what happened?", "Saajha answers this too, with a verifiable chain."],
            ].map(([q, a], i) => (
              <div key={q} className={`bg-card px-6 py-8 ${i === 0 ? "text-muted" : ""}`}>
                <p className={`font-display text-2xl ${i === 0 ? "" : "text-ink"}`}>{q}</p>
                <p className="mt-1 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <h2 className="mb-8 font-display text-4xl">Built for trust, not just availability</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {PILLARS.map((p) => (
              <Card key={p.title} className="p-6">
                <p.icon className="mb-3 size-6 text-accent" aria-hidden />
                <h3 className="font-medium">{p.title}</h3>
                <p className="mt-1 text-sm text-ink-2">{p.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 pb-20 md:px-8">
          <h2 className="mb-8 font-display text-4xl">One journey, start to finish</h2>
          <ol className="grid gap-3 md:grid-cols-7">
            {STEPS.map((s, i) => (
              <li key={s} className="rounded-lg border border-rule bg-card p-4">
                <span className="font-mono text-xs text-saffron">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1 text-sm">{s}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            Built for Northfield Institute of Technology (fictional) ·{" "}
            <Link href="/login" className="text-accent underline">
              open the demo
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
