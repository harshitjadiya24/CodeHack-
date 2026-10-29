# Baanto: testing guide for judges

**Live link:** _to be added after deployment_
**Source code:** https://github.com/ (repository link)

Everything runs on the **demo campus**, a fictional college called Northfield Institute of Technology. On `/login`, every account is one click away. If you prefer to type, the password for all of them is `Saajha@2026`.

On the demo campus, check-in opens at any time, so you can walk the whole journey whenever you test. Real institutes keep the real rule: check-in opens 30 minutes before the slot.

| Account | Role | Use it for |
|---|---|---|
| **Aarav Mehta** | Student | Borrowing. He has no 3D-printer training yet. |
| **Meera Iyer** | Student | Borrowing, with a full Trust Passport. |
| **Dr. Priya Nair** | Lab in-charge (owner) | Listing, approving, deposits, checking returns. |
| **Ravi Kulkarni** | Lab attendant | Confirming supervised pick-ups. |
| **Prof. Anil Sharma** | Manager | Deciding incidents and strikes, verifying training. |
| **IQAC Office** | Admin office | Insights, NAAC report, people, imports. |
| **Zoya Khan** | Student at a partner campus | Cross-campus access. |

Use one browser window per person (for example, a normal and a private window), so two people can stay signed in at once.

## The full journey (about 8 minutes)

### 1. An owner lists a resource and sets its conditions
Sign in as **Priya**, then go to **My resources → List a resource**.
- Set the availability hours, location (drop a pin, or tap *I'm standing at it*) and the required training badge.
- Set whether it is supervised, whether it is approved instantly, the deposit, the per-booking and weekly limits, and whether partner campuses may use it.
- The photo checklist set here is what borrowers must photograph at pick-up and return.

### 2. A user discovers a resource and checks eligibility
Sign in as **Aarav** and open **Discover**.
- The map and list show the closest open slots.
- Open **Ultimaker S5 3D Printer**. The eligibility panel names the exact training he lacks and how to get it.
- Open **Meta Quest 3 VR Headset** instead. Every check passes.
- Optional: type a task into **Ask Copilot**, for example "I need to test a 12V motor driver", and it suggests matching equipment.

### 3–4. The user requests it; the system checks the rules
On the VR headset page, pick tomorrow, choose a one-hour slot, write a purpose, and send it.
- Try a 6-hour slot first: it is refused, and the refusal states the limit.
- The **decision receipt** explains what happened: every rule passed, and the owner reviews this resource personally.

### 5–6. The owner reviews and approves, waitlists or declines
As **Priya**, open **Requests to review**.
- Each request shows its priority score and why: deadline, first-time use, strikes.
- Competing requests for the same hour are flagged.
- Approve, waitlist or decline. A reason is recorded with the decision.
- **High demand:** popular resources (the Sony camera, the laser cutter) go to a **Fair Draw**. Run it from the owner queue, then open the public verification page. Anyone can re-run the seeded draw and get the same winner.
- **Waitlist:** if an approved person cancels, the next person is moved in automatically, after the same checks.

### 7. Check-in, with the starting condition
- **Priya:** open the booking and record the **₹2,000 deposit** (UPI, with a reference).
- **Aarav:** open the booking, tap **Start check-in**, add the requested photos, tick the checklist and add a note.
- Supervised resources also need **Ravi** (attendant) to confirm in person.

### 8. Return, with the final condition
As **Aarav**, tap **Return and record condition**. Add photos and mark **Issue** on one item, for example the controllers. The page compares it with the check-in record: *Worse than at check-in: 2 controllers.*

### 9. Damage, delay and conflicts are handled
- **Priya:** open the booking. The damage is pre-selected. Close it, which sends it to the manager as an incident. Then **keep part of the deposit**, for example ₹300, with a reason. Aarav sees the amount and the reason, and can contest it.
- **Prof. Sharma:** open the **Review desk**. Read both sides and decide the incident. A strike is never automatic; it needs a named person and a written reason.
- **Delays:** an overdue return is flagged automatically 10 minutes after the slot ends.
- **No-shows:** if nobody checks in within 15 minutes, the slot is released to the waitlist and logged for a manager to review.
- **Extensions:** *Request more time* is checked against the next booking.

### 10. Both sides see the complete history
- Open the booking as **Aarav** and as **Priya**. Both see the same timeline: request, approval, deposit, check-in, return, closure, and deposit settlement, each with who did it and when.
- **Printable record (PDF)** gives a copy to keep.
- **Verify the audit chain** (`/audit/verify`) proves that no entry was edited or removed.

## Worth a look if you have time
- **IQAC Office → Insights:** utilisation heatmap, mostly idle equipment with one-tap fixes, next week's forecast, and **NAAC report** (Criterion IV, with a CSV export).
- **IQAC Office → Import from spreadsheets:** upload the template. Every row is checked before anything is listed.
- **Zoya (partner campus):** she is asked for an endorsement from her home institute, not just refused.
- **हिन्दी:** switch the language in the header. The rules explain themselves in Hindi too.
- **Phones:** install it as an app. The Trust Passport QR still shows offline.
