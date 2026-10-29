import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./helpers";

// The whole sharing lifecycle, as a judge would walk it: request, owner approval, deposit, check-in with photos,
// return with damage, owner verification, part of the deposit kept, and the borrower reading the full history.
// It writes real records to the demo campus, so it only runs when asked: E2E_JOURNEY=1 npm run e2e
test.skip(!process.env.E2E_JOURNEY, "Writes to the demo database; set E2E_JOURNEY=1 to run it.");
test.setTimeout(180_000);

const VR = "/resources/55555555-0000-0000-0000-000000000012";
const PHOTO = "docs/screens/passport.png";

/** Records the condition on the handover page; `issue` marks that checklist item as damaged. */
async function handover(page: Page, bookingId: string, phase: "check_in" | "return", issue?: number) {
  await page.goto(`/bookings/${bookingId}/handover?phase=${phase}`);
  const main = page.locator("main");
  const files = main.locator("input[type=file]");
  for (let i = 0; i < (await files.count()); i++) await files.nth(i).setInputFiles(PHOTO);
  const items = await main.locator("input[value=ok]").count();
  for (let i = 0; i < items; i++) await main.locator(`input[name=item-${i}][value=${i === issue ? "issue" : "ok"}]`).check({ force: true });
  await main.locator("textarea[name=notes]").fill(phase === "check_in" ? "Small scuff on the left controller already." : "Right trigger sticks after a drop.");
  await expect(main.getByText(/Photos \((\d+)\/\1\)/)).toBeVisible();
  await main.getByRole("button", { name: /Record condition and/ }).click();
  await page.waitForURL(new RegExp(`/bookings/${bookingId}\\?done=${phase}`));
}

test("a resource goes from request to return, with a deposit and a damage report", async ({ browser }) => {
  const aarav = await browser.newPage();
  await signInAs(aarav, /Aarav/);

  // 1–3. Discover, check eligibility, request a free hour. Earlier runs may hold some hours already, so try from
  // the end of the day, on a fresh form each time.
  await aarav.goto(VR);
  const form = aarav.locator("form").filter({ has: aarav.locator("input[name=resourceId]") }).last();
  const starts = await form.locator("select[name=from] option").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
  for (const start of starts.reverse()) {
    const [h, m] = start.split(":").map(Number);
    const end = `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    await aarav.goto(VR);
    await form.locator("select[name=from]").selectOption(start);
    const ends = await form.locator("select[name=to] option").evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
    if (!ends.includes(end)) continue;
    await form.locator("select[name=to]").selectOption(end);
    await form.locator("textarea[name=purpose]").fill("User-testing our VR physics module with first-year students");
    await form.getByRole("button", { name: "Request this slot" }).click();
    const sent = await aarav.waitForURL(/\/bookings\/[0-9a-f-]{36}/, { timeout: 8_000 }).then(() => true, () => false);
    if (sent) break;
  }
  expect(aarav.url(), "a one-hour slot the rules accept").toMatch(/\/bookings\/[0-9a-f-]{36}/);
  const bookingId = aarav.url().match(/bookings\/([0-9a-f-]{36})/)![1];
  await expect(aarav.getByText("Sent to the resource owner for review")).toBeVisible();

  // 4–6. The owner reviews it with the priority reasons in front of them, approves, and takes the deposit.
  const priya = await browser.newPage();
  await signInAs(priya, /Priya/);
  await priya.goto(`/bookings/${bookingId}`);
  const aside = priya.locator("aside");
  await aside.locator("input[name=reason]").first().fill("Fine for a supervised class session");
  await aside.getByRole("button", { name: "Approve" }).click();
  await expect(aside.getByRole("button", { name: /Record ₹2,000 received/ })).toBeVisible();
  await aside.locator("select[name=method]").selectOption("upi");
  await aside.getByRole("button", { name: /Record ₹2,000 received/ }).click();
  await expect(aside.getByText(/₹2,000 collected by Dr\. Priya Nair/)).toBeVisible();

  // 7–8. Check-in and return, each with photos and a checklist; the return flags the controllers.
  await handover(aarav, bookingId, "check_in");
  await handover(aarav, bookingId, "return", 1);
  await expect(aarav.getByText("Worse than at check-in: 2 controllers.")).toBeVisible();

  // 9. The owner confirms the damage and keeps part of the deposit, with a reason the borrower sees.
  await priya.goto(`/bookings/${bookingId}`);
  const verify = aside.locator("form").filter({ has: priya.locator("input[name=outcome][value=issue]") }).first();
  await verify.locator("textarea[name=notes]").fill("Trigger spring needs replacing.");
  await verify.getByRole("button").last().click();
  await expect(aside.getByText("This booking is finished", { exact: false })).toBeVisible();
  await aside.locator("label").filter({ hasText: "Keep part of it" }).click();
  await aside.locator("input[name=withheld]").fill("300");
  await aside.locator("textarea[name=reason]").fill("Replacement trigger spring for the right controller.");
  await aside.getByRole("button", { name: "Record settlement" }).click();
  await expect(aside.getByText(/₹300 kept and ₹1,700 returned/)).toBeVisible();

  // 10. The borrower sees the same record: the deposit outcome, its reason and every step in the history.
  await aarav.goto(`/bookings/${bookingId}`);
  await expect(aarav.getByText(/₹300 kept and ₹1,700 returned/)).toBeVisible();
  await expect(aarav.getByText("Why: Replacement trigger spring for the right controller.")).toBeVisible();
  for (const step of ["Request submitted", "Approved", "Deposit collected", "Checked in", "Returned", "Closed after verification", "Part of the deposit kept"])
    await expect(aarav.locator("aside ol").getByText(step, { exact: true }).first()).toBeVisible();
});
