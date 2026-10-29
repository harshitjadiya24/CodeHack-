import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Account paused" };

export default async function SuspendedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.orgStatus !== "suspended") redirect(homeFor(user.role));
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center px-4 py-16">
      <Link href="/" aria-label="Saajha home" className="mb-12">
        <Wordmark />
      </Link>
      <span className="tone-rose mb-5 w-fit rounded-full px-4 py-1.5 font-semibold">Paused</span>
      <h1 className="type-h2 max-w-[16ch]">Your institute’s account is paused.</h1>
      <p className="mt-5 max-w-[52ch] text-lg text-subtle">
        The Saajha team has paused this institute, so nobody from it can book or decide anything for now. Your records are kept. Your admin office has the
        reason and can ask for a review.
      </p>
      <form action={logout} className="mt-8">
        <Button variant="secondary">Sign out</Button>
      </form>
    </main>
  );
}
