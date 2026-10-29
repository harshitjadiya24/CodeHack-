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

test("the Saajha team reviews institutes; students can't", async ({ browser }) => {
  const team = await browser.newPage();
  await signInAs(team, /IQAC/);
  await team.goto("/ops");
  await expect(team.getByRole("heading", { name: "Institutes on Saajha" })).toBeVisible();
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
