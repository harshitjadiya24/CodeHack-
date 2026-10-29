import { expect, test } from "@playwright/test";
import { openResource, signInAs } from "./helpers";

test("Meera finds the closest open slots and can book what her passport unlocks", async ({ page }) => {
  await signInAs(page, /Meera/);
  await page.goto("/resources");
  await expect(page.getByRole("heading", { name: "Closest open slots" })).toBeVisible();
  await expect(page.locator(".map-pin").first()).toBeVisible();

  const nearest = page.locator('section[aria-labelledby="nearby-heading"] ol li a').first();
  await expect(nearest).toContainText(/km|m/);
  await openResource(page, /Sony A7 IV/);
  await expect(page.getByText("Yes, every requirement is met.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Request a slot" })).toBeVisible();
});

test("Aarav is told exactly which training he is missing", async ({ page }) => {
  await signInAs(page, /Aarav/);
  await page.goto("/resources?q=Laser");
  await openResource(page, /Laser Cutter/);
  await expect(page.getByText("Not yet. Here is exactly what is missing.")).toBeVisible();
  await expect(page.getByText(/Laser Cutter Certification/).first()).toBeVisible();
});

test("a partner-campus student is asked for an endorsement, not refused", async ({ page }) => {
  await signInAs(page, /Zoya/);
  await page.goto("/resources?where=city");
  await expect(page.getByText(/Northfield Institute of Technology: endorsement needed|You can book this/).first()).toBeVisible();
});

test("someone with open bookings is told why they can't delete their account yet", async ({ page }) => {
  await signInAs(page, /Meera/);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Delete your account" })).toBeVisible();
  await expect(page.getByText(/still open\. Cancel or return/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete my account" })).toHaveCount(0);
});

test("the missing-training reason reads in Hindi too", async ({ page, context, baseURL }) => {
  await signInAs(page, /Aarav/);
  await context.addCookies([{ name: "baanto-locale", value: "hi", url: baseURL! }]);
  await page.goto("/resources?q=Laser");
  await openResource(page, /Laser Cutter/);
  await expect(page.getByText("अभी नहीं। नीचे ठीक-ठीक लिखा है कि क्या बाकी है।")).toBeVisible();
  await expect(page.getByText("आपके पास “Laser Cutter Certification” नहीं है।")).toBeVisible();
});

test("upcoming bookings download as a calendar file", async ({ page }) => {
  await signInAs(page, /Meera/);
  const res = await page.request.get("/bookings/calendar");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/calendar");
  const ics = await res.text();
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
});

test("demo accounts are told they're in the demo, and can't change the shared password", async ({ page }) => {
  await signInAs(page, /Meera/);
  await expect(page.getByRole("note")).toContainText("You’re in the demo.");
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: "Change password" })).toHaveCount(0);
  await page.goto("/account/password");
  await expect(page).toHaveURL(/\/profile/);
});
