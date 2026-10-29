# Baanto: project document

**Problem statement:** Unlock Underused Equipment and Spaces
**Live product:** https://baanto-eight.vercel.app. Testing steps are in [judge-guide.md](judge-guide.md).
**Repository:** https://github.com/harshitjadiya24/CodeHack-

## 1. Use case we chose

**Equipment and spaces in Indian colleges, shared fairly within a campus and with verified partner campuses.**

A college's labs, makerspace, media studio and seminar rooms are the setting. The things shared are:
- Test and measurement instruments.
- 3D printers and laser cutters.
- Cameras and VR kits.
- Discussion rooms.

We kept the scope to institutions. Each borrower belongs to a verified institute whose admin office vouches for them. That lets the trust problem be solved properly instead of loosely. A makerspace or community organisation can register as an institute of type "Makerspace or community organisation".

## 2. Who it is for

| People | What they need |
|---|---|
| **Students and researchers (borrowers)** | To know what exists, whether they're allowed to use it, and when it's free. To book without chasing anyone, and to understand any refusal. |
| **Lab in-charges (resource owners)** | To stay in control. They need to know who has their equipment, why, until when, and in what condition it went out and came back. |
| **Lab attendants** | To hand over supervised equipment in person and confirm it. |
| **Managers (Dean R&D, HoDs)** | To decide incidents and penalties fairly, and to verify training. |
| **Admin office / IQAC** | To verify students, set fair-use policy, see what sits idle, and produce evidence for accreditation. |

## 3. Why the problem matters

- **Scale.** AISHE 2021-22 registered 1,168 universities, 45,473 colleges and 12,002 standalone institutions in India. Most of them own laboratories and rooms that are booked by paper register, WhatsApp, or informal access to the in-charge.
- **Accreditation already asks for it.** NAAC's Criterion IV (Infrastructure and Learning Resources) asks institutions to describe their systems and procedures for maintaining and *utilising* facilities. Today most colleges answer that with narrative rather than records. Baanto produces those records as a side effect of normal use.
- **The barrier is trust, not a calendar.** Booking tools already exist. What stops an in-charge from lending a ₹1–5 lakh instrument is not knowing:
  - whether the borrower is trained,
  - whether it will come back on time and intact,
  - and who is accountable if it doesn't.

  So idle equipment stays locked, and students without a personal connection to the lab never get access.
- **Unfair allocation.** When access is informal, the same few people get the popular equipment, and nobody can show otherwise.

_Sources:_ AISHE 2021-22 final report, Ministry of Education. NAAC Criterion IV metrics, as published in institutions' self-study reports (for example metric 4.4.2 on systems for maintaining and utilising facilities). _Add any survey or interview evidence your team gathered here._

## 4. Our solution

Baanto is a resource-sharing platform where every access decision is **checked against published rules, explained to the person, and recorded in a tamper-evident history**.

- **Owners stay in control.** For each resource they set:
  - training badges, supervision, instant or manual approval,
  - deposit, per-booking and weekly limits,
  - availability hours, location, photo checklist,
  - whether partner campuses may use it.
- **Users know where they stand.** Every eligibility check shows passed or failed, with the reason and how to fix it. Every decision comes with a *decision receipt*.
- **Fair by design:**
  - weekly credits and per-booking caps;
  - weekly repeats for lab sessions, each week checked on its own;
  - a priority score whose factors are shown (deadlines up, recent heavy use and strikes down);
  - a seeded, publicly re-runnable **Fair Draw** for contested slots;
  - waitlists that promote automatically after re-checking the rules;
  - **no-show release**, so a booked but unused slot goes to the next person;
  - a **"worth a look" list** for managers: someone holding most of a scarce resource while others were turned away, or repeated no-shows. It's advisory; a person decides.
- **Accountable handovers:**
  - photos and a checklist at check-in and return, with an automatic before/after comparison;
  - attendant confirmation for supervised equipment;
  - deposits recorded as collected, then refunded or partly kept with a reason;
  - incidents decided by a named manager after reading both sides.
- **Human oversight.** AI only suggests: matching, listing drafts from a photo, incident summaries. Strikes, verification, approvals and deposit deductions are always made by a named person with a written reason.

## 5. The complete workflow

1. **List.** The owner creates a listing: photos, location pin, hours, rules, badges, deposit and checklist. Spreadsheet import lists many at once.
2. **Discover.** Search, filters (including room size), a map of the closest open slots, campus, city and state scope, and AI matching from a task description.
3. **Check eligibility.** Identity verified by the admin office, training badges (or an endorsement for a partner campus), strikes, fair-use limits, and partner sharing.
4. **Request.** Choose a slot and give a purpose and an optional deadline. Rules are checked again on the server.
5. **Review.**
   - Instant approval for low-risk items.
   - Otherwise the owner sees the priority breakdown and any competing requests.
   - High-demand slots go to the Fair Draw.
6. **Outcome.** Approved, declined (with a reason), or waitlisted (with a queue position). A cancellation promotes the next person.
7. **Check-in.** The deposit is recorded at the counter. The borrower records photos, the checklist and notes. An attendant confirms supervised items.
8. **Return.** Photos and checklist again, with an automatic comparison against check-in.
9. **Problems.**
   - Damage, delay, misuse or safety become incidents. The borrower can respond before a manager decides.
   - Overdue returns and no-shows are flagged automatically.
   - Part of the deposit can be kept, with a reason.
   - Extensions are checked against the next booking.
10. **History.** Both sides see the same timeline. A printable PDF record is available, and the audit chain can be verified by anyone.

## 6. Features built

- **Accounts and institutes:**
  - Sign-up with institute and roll number; admin-office verification.
  - Institute registration with a review console; pending institutes stay hidden from others; suspended institutes are blocked.
- **Owner tools:**
  - Listing with a map pin and AI draft from a photo; availability; rules; deposits; maintenance windows.
  - Owner queue with priority reasons and Fair Draw.
- **Borrower tools:**
  - Discover with map, AI matching and eligibility filter.
  - Trust Passport with training badges and an offline QR.
  - Bookings, weekly repeats, calendar export and subscribe feed, extensions, cancellations, ratings.
  - Room capacity, with a group-size filter in Discover.
- **Handover flow:**
  - Photo and checklist check-in and return; attendant confirmation; condition comparison.
  - Deposit collection and settlement.
- **Problem handling:**
  - Incidents with the borrower's response and manager decisions; strikes with reasons.
  - Usage patterns worth a look on the review desk (heavy use while others wait, repeated no-shows).
  - Overdue and no-show automation; waitlist auto-promotion.
- **Cross-campus:** endorsements from the home institute, and per-resource partner sharing.
- **Admin office:**
  - Utilisation insights, idle-equipment nudges and a demand forecast.
  - NAAC Criterion IV report with CSV.
  - Spreadsheet import for inventory and the student register.
- **Notifications:** in-app and live for approvals, waitlist moves, reminders an hour before, overdue returns, cancellations, deposits and incident decisions.
- **Trust and access:**
  - Hash-chained audit log with public verification.
  - English and Hindi; installable PWA; light and dark themes.

## 7. Technology and architecture

- **Frontend and server:** Next.js 15 (App Router, Server Actions, TypeScript strict), Tailwind CSS v4.
- **Data:** Supabase.
  - Postgres with row-level security on every table.
  - Every booking state change goes through one SQL function, so the rules hold even if the UI is bypassed.
  - Also used: Auth, Storage (private buckets, signed URLs), Realtime (live notifications), and `pg_cron` (overdue, reminders, waitlist expiry, retention).
- **Domain logic:** pure TypeScript modules, covered by 96 unit tests (Vitest). These cover eligibility, fair-use rules, priority, the seeded draw, waitlist, no-shows, deposits, condition comparison, forecasting and CSV parsing.
- **End-to-end tests:** Playwright.
  - The full lifecycle from request to deposit settlement runs as one test.
  - Smoke tests cover discovery, eligibility in English and Hindi, staff pages, security headers and the health check.
- **Maps:** Leaflet with OpenStreetMap tiles and Nominatim geocoding.
- **Hosting:** Vercel (Mumbai region, next to the database), with error reporting through Sentry when it is configured.

Architecture diagram: [docs/workflow.png](workflow.png).

## 8. AI, APIs, frameworks and services used

| What | Used for |
|---|---|
| **Google Gemini API** (in the product) | Matching a task description to resources, drafting a listing from a photo, and summarising incidents. Each one is advisory and has a non-AI fallback. |
| **Claude Code, by Anthropic** (development) | Used substantially to write and review code, tests and documentation during the build, directed and checked by the team. |
| Supabase, Vercel, Sentry, Resend (planned for email), OpenStreetMap / Nominatim | Hosting, data, error reports, account email, maps. |
| Libraries | Next.js, React, Tailwind CSS, shadcn/ui and Radix primitives, Motion, GSAP, Lenis, Leaflet, react-day-picker, Recharts, @react-pdf/renderer, qrcode, zod, next-intl, Vitest, Playwright. |

## 9. Privacy, security and fairness

- **Least privilege.**
  - Row-level security means students never see each other's bookings or photos.
  - Staff see only their own campus.
  - Files are served through signed links that expire after 10 minutes.
- **Abuse limits.** Rate limits on sign-up, sign-in, institute registration, password and confirmation emails, imports and AI calls.
- **Security headers:** HSTS, frame denial, no MIME sniffing, a strict referrer policy, a permissions policy, and a Content Security Policy.
- **DPDP Act 2023:**
  - Consent at sign-up; plain-language privacy notice; terms of use.
  - Self-service data export and account deletion.
  - Grievance contact.
  - Retention: notifications after 6 months, handover photos after a year, rate-limit counters after 2 days.
- **Error reports:** stripped of names, emails, roll numbers, cookies and form data.
- **Demo data is fictional,** and kept apart from real institutes in the same database: nobody can sign up into the demo, and nothing crosses between them.
- **Fairness:**
  - Every rule is published and explained.
  - Priority factors are visible.
  - Contested slots use a seeded draw that anyone can re-run.
  - Penalties need a named person and a reason, and can be contested first.

## 10. Known limitations

- **Email:** account emails (confirmation, password reset) are built but stay switched off until a sending domain is verified. Until then, borrowing still requires the admin office to verify each student. Reminders reach people inside the app, not by email or WhatsApp.
- **Deposits** are recorded, not collected online; there is no UPI payment integration.
- **Use is measured** from check-in and check-out, not from sensors on the equipment.
- **Hindi** covers the borrower journey and the main staff pages; some admin pages and the landing page are English only.
- **Individuals** who don't belong to a registered institute or community organisation can't join.
- **Demo-campus figures** on the landing page are fictional.

## 11. What comes next

- Email and WhatsApp reminders.
- UPI deposits.
- Paid access for nearby startups and small businesses, with the college setting rates.
- A pilot with one real lab to measure hours unlocked.
- More Indian languages.
- Smart-plug usage data for heavy equipment.

## 12. Team and contributions

| Name | Role | Contribution |
|---|---|---|
| Harshit Jadiya | Team leader | Research and backend |
| Dhairya Singh | Team member | Frontend and UI |
| Sharad Vyas | Team member | Database and rules |
| Anmol Shrivastava | Team member | Testing and docs |

## 13. Disclosure of pre-existing code and assets

- The project started from the standard `create-next-app` scaffold.
- UI primitives come from shadcn/ui and Radix, adapted to our design.
- All libraries listed in section 8 are open source and used under their licences.
- Map tiles are © OpenStreetMap contributors.
- Fonts: Mona Sans and Noto Sans Devanagari (SIL Open Font License).
- All demo people, institutes and bookings are fictional.
- Substantial AI assistance (Claude Code) was used during development, as disclosed in section 8.
