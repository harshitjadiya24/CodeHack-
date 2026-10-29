import { expect, test } from "@playwright/test";
import { signInAs } from "./helpers";

test("the owner sees the request queue with priority reasons", async ({ page }) => {
  await signInAs(page, /Priya/);
  await expect(page.getByRole("heading", { name: "Requests to review" })).toBeVisible();
});

test("a home admin office has an endorsements desk", async ({ page }) => {
  await signInAs(page, /Riverside Admin/);
  await page.goto("/manager");
  await expect(page.getByRole("heading", { name: /Cross-campus endorsements/ })).toBeVisible();
});

test("the Baanto team reviews institutes; students can't", async ({ browser }) => {
  const team = await browser.newPage();
  await signInAs(team, /IQAC/);
  await team.goto("/ops");
  await expect(team.getByRole("heading", { name: "Institutes on Baanto" })).toBeVisible();
  await expect(team.getByRole("link", { name: "Institutes" })).toBeVisible();

  const student = await browser.newPage();
  await signInAs(student, /Meera/);
  await student.goto("/ops");
  await expect(student).toHaveURL(/\/forbidden/);
});

test("the audit chain verifies", async ({ page }) => {
  await signInAs(page, /IQAC/);
  await page.goto("/audit/verify");
  await expect(page.getByText(/intact|verified|unbroken/i).first()).toBeVisible();
});

test("the NAAC report covers an academic year and exports CSV", async ({ page }) => {
  await signInAs(page, /IQAC/);
  await page.goto("/admin/report");
  await expect(page.getByText(/NAAC Criterion IV/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Systems and procedures for maintaining and using facilities/ })).toBeVisible();
  const csv = await page.request.get("/admin/report/csv");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain('"Academic year","Facility"');
});

test("the admin office sees idle resources and next week's forecast", async ({ page }) => {
  await signInAs(page, /IQAC/);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Mostly idle this month" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Next week" })).toBeVisible();
});

test("an inventory sheet is checked row by row before anything is listed", async ({ page }) => {
  await signInAs(page, /IQAC/);
  await page.goto("/admin/import");
  const template = await page.request.get("/admin/import/template?kind=inventory");
  expect(template.status()).toBe(200);
  const card = page.locator("#inventory");
  await card.locator("input[type=file]").setInputFiles({ name: "stock.csv", mimeType: "text/csv", buffer: Buffer.from(await template.body()) });
  await card.getByRole("button", { name: "Check the file" }).click();
  // Preview only: the confirm button appears, and this test never presses it.
  await expect(card.getByRole("button", { name: /^List \d+ resources?$/ })).toBeVisible();
});
