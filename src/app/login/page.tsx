import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Mono, Pill } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_LABEL } from "@/lib/demo";
import { LoginForm } from "./login-form";
import { loginAsDemo } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next } = await searchParams;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1fr_1.2fr] md:px-8">
      <section className="flex flex-col justify-center">
        <Link href="/" className="mb-10 font-display text-2xl text-ink">
          Saajha
        </Link>
        <h1 className="font-display text-4xl leading-tight">Sign in to your campus</h1>
        <p className="mb-8 mt-2 text-ink-2">Northfield Institute of Technology · Riverside College of Engineering</p>
        <Card className="p-6">
          <LoginForm next={next} />
        </Card>
      </section>

      <section aria-labelledby="demo-heading" className="flex flex-col justify-center">
        <div className="mb-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-saffron">For judges</p>
          <h2 id="demo-heading" className="font-display text-3xl">
            Try any role in one click
          </h2>
          <p className="mt-1 text-sm text-muted">
            Fictional demo accounts. Password for all: <Mono className="text-ink">{DEMO_PASSWORD}</Mono>
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <form action={loginAsDemo}>
                <input type="hidden" name="email" value={a.email} />
                <button
                  type="submit"
                  className="w-full rounded-lg border border-rule bg-card p-4 text-left transition hover:border-accent"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium text-ink">{a.name}</span>
                    <Pill tone={a.role === "student" || a.role === "researcher" ? "accent" : "saffron"}>{ROLE_LABEL[a.role]}</Pill>
                  </span>
                  <span className="mt-1 block text-sm text-muted">{a.blurb}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
