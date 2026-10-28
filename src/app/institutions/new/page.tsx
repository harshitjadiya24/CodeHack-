import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { institutionCount } from "@/lib/services/institutions";
import { InstitutionForm } from "./institution-form";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Register your institute" };
export const dynamic = "force-dynamic";

const AFTER = [
  {
    name: "Your campus is set up",
    text: "Departments for your type of institute, starter training badges and a fair-use policy you can change.",
  },
  {
    name: "Bring in lab owners",
    text: "Lab in-charges sign up, and you make them owners from the People page.",
  },
  {
    name: "Students join",
    text: "They pick your institute at sign-up; you verify their roll numbers.",
  },
];

export default async function RegisterInstitutionPage() {
  const { institutes, states } = await institutionCount();
  return (
    <main className="mx-auto grid min-h-screen max-w-[1240px] gap-12 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-8 lg:gap-20">
      <section>
        <Link href="/" className="mb-12 flex items-center gap-2.5 text-xl font-extrabold text-ink">
          <Wordmark />
        </Link>
        <h1 className="type-h2">Register your institute</h1>
        <p className="mb-8 mt-3 max-w-[52ch] text-ink-2">
          Colleges, universities, polytechnics, medical colleges, research labs, schools and makerspaces anywhere in India. Free, and set up in a few minutes.
        </p>
        <Card className="p-5 sm:p-7">
          <InstitutionForm />
        </Card>
        <p className="mt-6 text-[15px] text-subtle">
          A student or lab in-charge?{" "}
          <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
            Join your institute instead
          </Link>
        </p>
      </section>

      <aside aria-labelledby="after-heading" className="md:sticky md:top-12 md:self-start md:pt-28">
        <p className="readout text-6xl">{institutes}</p>
        <p className="mt-1 text-[15px] text-subtle">
          institutes across {states} {states === 1 ? "state" : "states"} on Saajha
        </p>
        <h2 id="after-heading" className="type-h3 mt-12 text-3xl">
          What happens next
        </h2>
        <ol className="relative mt-8 space-y-7 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-rule">
          {AFTER.map((s, i) => (
            <li key={s.name} className="relative grid grid-cols-[34px_1fr] gap-x-4">
              <span
                aria-hidden
                className={`tab relative grid size-[34px] place-items-center rounded-full text-sm font-extrabold ${i === 0 ? "bg-ink text-paper" : "border border-rule bg-paper"}`}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-bold">{s.name}</h3>
                <p className="mt-0.5 text-[15px] text-subtle">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-10 rounded-[22px] border border-rule bg-card p-5 text-[15px] text-ink-2">
          <b className="text-ink">How we stop impersonation.</b> If your email is on your institute’s own domain, it’s verified straight away. Otherwise it
          works for your own campus but shows as pending review until the Saajha team confirms it, and isn’t offered to other campuses.
        </div>
      </aside>
    </main>
  );
}
