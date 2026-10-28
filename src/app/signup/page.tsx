import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { listCampuses } from "@/lib/services/accounts";
import { SignupForm } from "./signup-form";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Create an account" };

const STEPS = [
  {
    name: "Create your account",
    text: "Name, campus, roll number. Takes a minute.",
  },
  {
    name: "The admin office checks you",
    text: "They match your roll number against the college register. Until then you can browse everything.",
  },
  {
    name: "Add your training",
    text: "Upload a certificate or induction slip for each lab you want to use.",
  },
  { name: "Book", text: "Anything your pass unlocks is one request away." },
];

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const campuses = await listCampuses();

  return (
    <main className="mx-auto grid min-h-screen max-w-[1240px] gap-12 px-4 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-8 lg:gap-20">
      <section className="flex flex-col justify-center">
        <Link href="/" className="mb-12 flex items-center gap-2.5 text-xl font-extrabold text-ink">
          <Wordmark />
        </Link>
        <h1 className="type-h2">Create your account</h1>
        <p className="mb-8 mt-3 max-w-[50ch] text-ink-2">
          For students, researchers and faculty at any institute on Saajha. Lab in-charges: sign up as a researcher, and your admin office will make you an
          owner.
        </p>
        <Card className="p-5 sm:p-7">
          <SignupForm campuses={campuses} />
        </Card>
        <p className="mt-6 text-[15px] text-subtle">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </section>

      <aside aria-labelledby="after-heading" className="flex flex-col justify-center">
        <h2 id="after-heading" className="type-h3 text-3xl">
          What happens next
        </h2>
        <ol className="relative mt-8 space-y-7 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-rule">
          {STEPS.map((s, i) => (
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
      </aside>
    </main>
  );
}
