import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Privacy" };

const GRIEVANCE_NAME = process.env.NEXT_PUBLIC_GRIEVANCE_NAME;
const GRIEVANCE_EMAIL = process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL;

const SECTIONS: [string, string[]][] = [
  ["What we collect", ["Name, roll number, department and campus email: needed to verify you and to let owners know who is borrowing.", "Bookings, handover photos and checklists: the condition record that protects you and the owner.", "Certificates you upload for badges: kept in a private bucket.", "Ratings and comments you leave after a return.", "Nothing else. No location tracking, no contacts, no advertising data. Your location is used only on your phone, when you tap “Use my location”, and is never stored."]],
  ["Who sees it", ["Other students never see your bookings or photos. Owners, attendants and managers see only what concerns their resources and campus.", "These limits are enforced by row-level security in the database, so a bug in a page cannot leak them.", "Files are served through signed links that expire after 10 minutes.", "Your calendar feed link is private to you, and you can replace it at any time from your profile."]],
  ["Who processes it for us", ["Supabase (database, sign-in and file storage) and Vercel (hosting) run Baanto.", "Resend sends account emails: confirmation and password reset.", "Sentry receives error reports so we can fix crashes. Reports are stripped of names, emails, roll numbers, cookies and form contents before they leave.", "Google Gemini, only when used: the text of a Discover search, a listing photo, or an incident description. Nothing it returns is a decision."]],
  ["Automated decisions", ["Fair-use limits and the Fair Draw are published rules, and every decision comes with a receipt explaining it.", "AI only suggests: matching, listing drafts, incident summaries. It never approves, rejects, verifies or penalises anyone.", "Badges, incidents and strikes are always decided by a named person, with a written reason."]],
  ["Your rights (Digital Personal Data Protection Act, 2023)", ["Download everything we hold about you from your profile.", "Delete your account yourself from your profile. Your name, roll number, department, certificate uploads and notifications are removed and you can no longer sign in. Past bookings and condition records stay with your institute without your name.", "Contest any incident before a decision is made.", "Ask the admin office to correct your data; the audit chain keeps a record that a change happened, not the removed content.", "Complaints: write to your institute’s admin office, or to Baanto’s grievance officer below. If you aren’t satisfied with the answer, you can complain to the Data Protection Board of India."]],
  ["How long we keep it", ["Handover photos: one year after the handover, then deleted automatically.", "Notifications: six months, then deleted automatically.", "Bookings and the audit chain: kept for the institute’s accreditation records. If you delete your account they stay, without your name.", "Rate-limit counters (your IP address or email, and a count): two days at most."]],
  ["The demo campus", ["Northfield, Riverside and the other “.demo” institutes are fictional. They are kept apart from real colleges: nobody can sign up into them, and nothing from them reaches a real campus."]],
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" aria-label="Baanto home">
        <Wordmark />
      </Link>
      <h1 className="type-h2 mt-10">Privacy notice</h1>
      <p className="mt-2 text-ink-2">Plain language: what Baanto keeps, who can see it and why.</p>
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
        <section aria-labelledby="grievance">
          <h2 id="grievance" className="mb-2 text-lg font-bold">
            Grievance officer
          </h2>
          {GRIEVANCE_EMAIL ? (
            <p className="text-ink-2">
              {GRIEVANCE_NAME ? `${GRIEVANCE_NAME}, ` : ""}
              <a href={`mailto:${GRIEVANCE_EMAIL}`} className="text-accent underline">
                {GRIEVANCE_EMAIL}
              </a>
              . We reply within 7 days and resolve within 30.
            </p>
          ) : (
            <p className="text-ink-2">Write to your institute’s admin office; they will pass it to the Baanto team.</p>
          )}
        </section>
      </div>
      <p className="mt-12 text-sm text-subtle">
        See also the <Link href="/terms" className="underline">terms of use</Link>.
      </p>
    </main>
  );
}
