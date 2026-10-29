import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1200px] flex-col justify-center px-4 py-16 md:px-8">
      <Link href="/" aria-label="Baanto home" className="mb-12">
        <Wordmark />
      </Link>
      <div className="flex flex-wrap items-end gap-4">
        <p className="type-display rise-in text-[clamp(6rem,18vw,12rem)]">404</p>
        <span className="tone-rose rise-in mb-6 rotate-[-4deg] rounded-full px-4 py-1.5 font-semibold [animation-delay:150ms]">Not on the shelf</span>
      </div>
      <h1 className="type-h2 mt-6 max-w-[18ch]">Nothing here, or not for you.</h1>
      <p className="mt-5 max-w-[52ch] text-lg text-subtle">
        The link may be old, or the booking may belong to someone else. Baanto only shows a record to the people it concerns.
      </p>
      <div className="mt-8 flex flex-wrap gap-2.5">
        <ButtonLink href="/resources">Browse equipment</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to the start
        </ButtonLink>
      </div>
    </main>
  );
}
