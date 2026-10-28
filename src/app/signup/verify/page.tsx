import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { mailConfigured } from "@/lib/mailer";
import { CodeForm } from "./code-form";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email = "" } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-12 flex items-center gap-2.5 text-xl font-extrabold text-ink">
        <span aria-hidden className="board-chip grid size-8 place-items-center rounded-[4px] font-deva text-[17px]">
          सा
        </span>
        Saajha
      </Link>
      <h1 className="type-h2">Check your email</h1>
      <p className="mb-8 mt-3 text-ink-2">
        We sent a 6-digit code to {email ? <b className="break-all text-ink">{email}</b> : "your email"}. Enter it below to finish creating your account. It
        expires in 10 minutes.
      </p>
      {!mailConfigured() && process.env.NODE_ENV !== "production" && (
        <p className="mb-4 rounded-md bg-warn-soft px-3 py-2.5 text-[15px] text-warn">Email isn’t connected on this machine yet, so the code was printed in the server log.</p>
      )}
      <Card className="p-5 sm:p-7">
        <CodeForm email={email} />
      </Card>
      <p className="mt-6 text-[15px] text-subtle">
        Wrong email?{" "}
        <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
          Start again
        </Link>
      </p>
    </main>
  );
}
