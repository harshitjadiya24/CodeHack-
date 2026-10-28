import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, Mono, Pill } from "@/components/ui";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_LABEL } from "@/lib/demo";
import { LoginForm } from "./login-form";
import { loginAsDemo } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; created?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user.role));
  const { next, created } = await searchParams;

  return (
    <main className="mx-auto grid min-h-screen max-w-[1240px] gap-12 px-4 py-12 md:grid-cols-[1fr_1.2fr] md:px-8">
      <section className="flex flex-col justify-center">
        <Link href="/" className="mb-12 flex items-center gap-2.5 text-xl font-extrabold text-ink">
          <span aria-hidden className="board-chip grid size-8 place-items-center rounded-[4px] font-deva text-[17px]">
            सा
          </span>
          Saajha
        </Link>
        <h1 className="type-h2">Sign in to your campus</h1>
        <p className="mb-8 mt-3 text-ink-2">For students, staff and admin offices of every institute on Saajha.</p>
        {created && (
          <p role="status" className="mb-4 rounded-md bg-ok-soft px-3 py-2.5 text-[15px] text-ok">
            Account created. Sign in with your email and password.
          </p>
        )}
        <Card className="p-6">
          <LoginForm next={next} />
        </Card>
        <p className="mt-6 text-[15px] text-subtle">
          New to Saajha?{" "}
          <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </section>

      <section aria-labelledby="demo-heading" className="flex flex-col justify-center">
        <div className="mb-4">
          <p className="text-[15px] font-semibold text-subtle">For judges</p>
          <h2 id="demo-heading" className="type-h3 mt-1 text-3xl">
            Try any role in one click
          </h2>
          <p className="mt-1 text-sm text-subtle">
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
                  className="w-full rounded-lg border border-rule bg-card p-4 text-left transition-[border-color,transform] duration-150 hover:border-ink active:scale-[0.99]"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold text-ink">{a.name}</span>
                    <Pill tone="neutral">{ROLE_LABEL[a.role]}</Pill>
                  </span>
                  <span className="mt-1 block text-sm text-subtle">{a.blurb}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
