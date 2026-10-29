# Saajha

**Borrow the lab next door.** Saajha opens idle campus equipment and spaces to the students who need them. It shows what you're cleared to use and books you a slot. When too many people want the same hour, a fair draw that anyone can re-check decides.

Built for the problem statement **"Unlock Underused Equipment and Spaces"**.

![Landing page](docs/screens/landing.png)

## The problem

Indian colleges already own 3D printers, oscilloscopes, microscopes, camera kits and seminar rooms. Most of them sit idle for most of the week. Students who could use them don't know they exist, aren't sure they're allowed, or lose out to whoever asks first. Lab owners say no because they can't tell who is trained or who broke something.

Saajha fixes the trust problem, not just the booking:

| Worry | What Saajha does |
|---|---|
| "Am I allowed to use this?" | A **Trust Passport** of verified training badges. Every resource lists what it needs, and you're told exactly what's missing. |
| "Someone always grabs it first" | Popular slots go to a **Fair Draw**: seeded, weighted towards people who've had less time, sealed before anyone asks, and re-runnable by anyone. |
| "Who broke it?" | **Photo handovers** at pick-up and return, with condition agreed on both sides and a fair review for damage. |
| "Why was I rejected?" | Every decision comes with a **receipt** that lists the rules applied and the priority breakdown. |
| "Is any of this real?" | A **hash-chained audit log**, verifiable from the app, plus utilisation and fairness (Gini) reports for IQAC/NAAC. |

## Try it in 60 seconds

Open `/login` and use any demo account (password for all: `Saajha@2026`), or click a role card.

1. **Meera** (student, full passport): go to **Discover**. See the map of closest open slots, open a resource and request a slot.
2. **Aarav** (student, missing a badge): the same resource tells him exactly which training he lacks.
3. **Dr. Priya Nair** (lab owner): decide requests with the priority score shown, or run a Fair Draw on a contested slot.
4. **Ravi** (attendant): confirm a supervised pick-up with photos.
5. **IQAC Office** (admin): campus insights, fairness, the accreditation report, and a check that the audit chain is intact. This account is also on the Saajha review team, so it sees **Institutes** (`/ops`), where new institutes are approved or suspended.
6. **Zoya** (student at the partner campus, Riverside) and **Riverside Admin Office**: borrowing across campuses. Zoya asks her own institute to endorse her for Northfield. Riverside's admin office endorses her for 30, 90 or 180 days, with a reason. She can then request Northfield's equipment, and Northfield's owners see "Guest from Riverside, endorsed until …" on her requests.

Every demo account is at the fictional *Northfield Institute of Technology, Pune*. Zoya is at the partner campus, Riverside.

| | |
|---|---|
| ![Discover with map](docs/screens/discover-map.png) | ![Booking with decision receipt](docs/screens/booking.png) |
| ![Trust Passport](docs/screens/passport.png) | ![Campus insights](docs/screens/insights.png) |

## For any institute in India

Any college can register at `/institutions/new` in a few minutes:

- Choose the institute type, and its departments, starter training badges and fair-use policy are set up for it.
- New institutes work for their own campus straight away.
- An institute stays **pending review** and isn't shown to other campuses until the Saajha team has checked it. That check happens in the review console, against the institute's website and AISHE code.
- A suspended institute's people can't sign in, and see why.
- **Cross-campus endorsements:** a student borrows from a partner campus only when their home institute vouches for them, for a purpose and a set period. Their training carries over wherever the host has a badge of the same name. Both campuses' audit logs record it.
- Students sign up at `/signup`, pick their institute and roll number, and can browse at once. The admin office verifies them before they can borrow.
- **Discover** can widen from *My campus* to *My city* or *My state*, and shows verified institutes nearby on the map.

## How it's built

- **Next.js 15** (App Router, server actions, TypeScript strict) and **Tailwind CSS v4**.
- **Supabase** (Postgres, Auth, Storage, Realtime). Row-level security on every table. State changes go through SQL functions, so the rules hold even if the UI is bypassed.
- **Domain logic is pure and unit-tested**, in [`src/lib/domain`](src/lib/domain):
  - eligibility
  - fairness and priority
  - the Fair Draw (commit and reveal)
  - condition comparison
  - utilisation and Gini
  - next open slot and distance
- **Maps:** Leaflet with OpenStreetMap tiles, and geocoding from Nominatim. All free, no API keys.
- **AI (optional):** Gemini matches a free-text task ("I need to test a 12V motor driver") to resources. Without a key it falls back to keyword matching, and AI output is never a decision.
- **Design:** "Common Room". Mona Sans plus four pastel tags with fixed meaning: sage means cleared, butter means popular, rose means a problem, sky means information. Light and dark themes, reduced motion respected, built mobile-first.
- **Motion:** Motion (Framer), GSAP SplitText, and Lenis smooth scroll.

![How a booking flows](docs/workflow.png)

### Project layout

```
src/app/            routes: landing, auth, sign-up, institutes, (app) for signed-in pages
src/lib/domain/     pure rules and their tests
src/lib/services/   server-side use cases (bookings, handovers, governance, insights…)
src/components/     UI: ui.tsx primitives, common-room/, motion/, ui-kit/
supabase/           migrations (schema, RLS, state machine, audit chain…) and seed.sql
```

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

| Variable | Needed | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Publishable (anon) key |
| `SUPABASE_SECRET_KEY` | yes | Secret key, server only |
| `GEMINI_API_KEY` | no | Turns on AI matching in Discover |
| `NEXT_PUBLIC_DEMO_MODE` | no | `1` lets check-in happen at any time, for demos |

**Database:** apply `supabase/migrations/*` in order, then run `supabase/seed.sql` for the demo campus (with the Supabase CLI: `supabase db reset`).

**Checks** (the same ones CI runs on every push):

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

**End-to-end smoke tests** (Playwright). They sign in with the demo accounts and only read data:

```bash
NEXT_DIST_DIR=.next-prod npx next build && NEXT_DIST_DIR=.next-prod npx next start -p 3100 &
npm run e2e
```

CI runs them too, once the repository has the three Supabase secrets.

## Security and privacy

- **Abuse limits:** sign-up, sign-in and institute registration are rate-limited per IP (and per email for sign-in). The counts are kept in Postgres, so they hold across server instances.
- **New institutes:** start pending and are hidden from other campuses until checked.
- **Students:** can't borrow until the admin office has checked their roll number.
- **Public pages** (the landing page and the share image) show counts and initials only, never names.
- **Your data:** people can download everything Saajha holds about them from their profile.
- **The audit log** can only be appended to, and anyone can check that it hasn't been tampered with.

## What's next

- Hindi and regional languages.
- Install as an app, with the passport QR working offline.
- WhatsApp and email reminders.
- Calendar export.
- Deposits over UPI.
