import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Terms of use" };

const SECTIONS: [string, string[]][] = [
  ["What Baanto is", ["Baanto is a booking and record-keeping tool. The equipment and spaces belong to the institutes that list them, and each institute sets its own rules, training requirements and opening hours.", "Baanto doesn’t own, inspect or insure anything listed on it."]],
  ["Your account", ["Use your real name and roll number, and an email you can read. One account per person.", "Keep your password to yourself. Everything done from your account is recorded as you.", "Your institute’s admin office decides whether to verify you, and can pause your account under its own rules."]],
  ["Using equipment and spaces", ["Book only what you need, for the purpose you give, and turn up or cancel in time so someone else can use the slot.", "Follow the training, supervision and safety rules shown on each resource, and those of the lab itself.", "Record the condition honestly at pick-up and return. Report damage straight away; hiding it is treated more seriously than the damage.", "Strikes, deposits and charges for damage are decided by your institute, by a named person with a written reason, and you can contest them first."]],
  ["Not allowed", ["Booking for someone else, or lending on what you borrowed.", "Using equipment for anything illegal or unsafe, or outside the purpose you gave.", "Trying to get round fair-use limits, the Fair Draw or anyone’s access rules, or probing Baanto for weaknesses without our written permission."]],
  ["Institutes", ["An institute’s admin office is responsible for what it lists, for verifying its own people, and for the decisions its staff make in Baanto.", "The Baanto team checks new institutes before other campuses can see them, and can pause an institute that misuses the service, with a reason."]],
  ["Our part", ["We try to keep Baanto available and the records correct, and we keep an audit chain anyone can check. We can’t promise it will never be down, and we aren’t liable for losses from a booking that couldn’t be made or kept.", "Our liability is limited to the extent the law allows. Nothing here takes away rights you have under Indian law.", "We may change these terms; we’ll say so in the app before a change takes effect."]],
  ["Reporting misuse", ["Use “Report a problem” on a booking, or write to your institute’s admin office. For anything about Baanto itself, see the contact on the privacy page."]],
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Baanto home">
        <Wordmark />
      </Link>
      <h1 className="type-h2 mt-10">Terms of use</h1>
      <p className="mt-2 text-ink-2">The short version: book honestly, look after what you borrow, and follow your institute’s rules.</p>
      <div className="mt-10 space-y-10">
        {SECTIONS.map(([title, points]) => (
          <section key={title}>
            <h2 className="mb-2 text-lg font-bold">{title}</h2>
            <ul className="list-disc space-y-1 pl-5 text-ink-2">
              {points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-subtle">
        See also the <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
    </main>
  );
}
