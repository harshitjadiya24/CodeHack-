import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Offline" };

// Static, so the service worker can keep a copy and show it with no network.
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[640px] flex-col justify-center px-4 py-16">
      <Wordmark className="mb-12" />
      <span className="tone-sky mb-5 w-fit rounded-full px-4 py-1.5 font-semibold">No connection</span>
      <h1 className="type-h2 max-w-[14ch]">You’re offline.</h1>
      <p className="mt-5 max-w-[46ch] text-lg text-subtle">
        Bookings and requests need the internet. Your Trust Passport still opens if you looked at it on this phone before, so you can show its QR at the lab
        desk.
      </p>
      <div className="mt-8 flex flex-wrap gap-2.5">
        <Link href="/passport" className="inline-flex min-h-11 items-center rounded-full bg-accent px-5 font-semibold text-accent-ink">
          Open my Trust Passport
        </Link>
      </div>
    </main>
  );
}
