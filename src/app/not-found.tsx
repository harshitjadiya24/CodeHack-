import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1240px] flex-col justify-center px-4 py-16 md:px-8">
      <div className="board-plate board-in max-w-2xl px-7 py-7 sm:px-9">
        <p className="font-deva text-5xl font-extrabold leading-none [font-stretch:80%]">गलत स्टॉप</p>
        <p className="type-display mt-2">404</p>
      </div>
      <h1 className="type-h2 mt-12 max-w-[18ch]">This stop isn’t on the chart.</h1>
      <p className="mt-5 max-w-[52ch] text-lg text-ink-2">
        The link may be old, or the booking may belong to someone else. Saajha only shows a record to the people it concerns.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/resources" className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-semibold text-accent-ink transition-transform active:scale-[0.97]">
          Browse equipment
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-rule bg-card px-5 font-semibold hover:border-ink">
          Back to the start
        </Link>
      </div>
    </main>
  );
}
