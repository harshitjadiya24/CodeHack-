import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

const SECTIONS: [string, string[]][] = [
  ["What we collect", ["Name, roll number, department and campus email: needed to verify you and to let owners know who is borrowing.", "Bookings, handover photos and checklists: the condition record that protects you and the owner.", "Certificates you upload for badges: kept in a private bucket.", "Nothing else. No location tracking, no contacts, no advertising data."]],
  ["Who sees it", ["Other students never see your bookings or photos. Owners, attendants and managers see only what concerns their resources and campus.", "These limits are enforced by row-level security in the database, so a bug in a page cannot leak them.", "Files are served through signed links that expire after 10 minutes."]],
  ["Automated decisions", ["Fair-use limits and the Fair Draw are published rules, and every decision comes with a receipt explaining it.", "AI (Google Gemini) only suggests: matching, listing drafts, incident summaries. It never approves, rejects, verifies or penalises anyone.", "Badges, incidents and strikes are always decided by a named person, with a written reason."]],
  ["Your rights", ["Download everything we hold about you from your profile.", "Contest any incident before a decision is made.", "Ask the admin office to correct or remove your data; the audit chain keeps a record that a change happened, not the removed content."]],
  ["Retention", ["Handover photos are kept for one academic year, then deleted. Audit entries are kept for accreditation evidence.", "This demo uses fictional people and data only."]],
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="font-display text-2xl">
        Saajha
      </Link>
      <h1 className="mt-10 font-display text-5xl">Privacy notice</h1>
      <p className="mt-2 text-ink-2">Plain language: what Saajha keeps, who can see it and why.</p>
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
      </div>
    </main>
  );
}
