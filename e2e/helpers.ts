import { expect, type Page } from "@playwright/test";

/** Signs in through the one-click demo card on /login and waits to leave the login page. */
export async function signInAs(page: Page, name: RegExp) {
  // Wait for the page to finish loading so the click submits the server action, not a half-hydrated form.
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name }).first().click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Opens a resource from the Discover grid by following its link (no waiting on client-side navigation). */
export async function openResource(page: Page, name: RegExp) {
  const href = await page.locator("main ul a[href^='/resources/']").filter({ hasText: name }).first().getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
}
