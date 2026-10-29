import { expect, test } from "@playwright/test";

test("landing shows the live shelf and runs the draw in the browser @phone", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Borrow the lab next door");
  await expect(page.getByRole("listitem").filter({ has: page.locator("b") }).first()).toBeVisible();

  await page.getByRole("button", { name: "Draw a name" }).click();
  await expect(page.getByText(/gets it \(/)).toBeVisible();
  await expect(page.getByRole("button", { name: "New seed, draw again" })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("sign-up explains every missing field without creating anything", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: /create/i }).click();
  await expect(page.getByText("Enter your full name.", { exact: true })).toBeVisible();
  await expect(page.getByText("Choose your campus.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/signup/);
});

test("institute registration says new institutes start pending", async ({ page }) => {
  await page.goto("/institutions/new");
  await expect(page.getByText("Every new institute starts as pending review")).toBeVisible();
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/resources");
  await expect(page).toHaveURL(/\/login/);
});
