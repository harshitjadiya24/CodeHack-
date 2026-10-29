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

test("sign-up errors come back in Hindi when Hindi is chosen", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "baanto-locale", value: "hi", url: baseURL! }]);
  await page.goto("/signup");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("अपना खाता बनाएँ");
  await page.getByRole("button", { name: "खाता बनाएँ" }).click();
  await expect(page.getByText("अपना पूरा नाम लिखें।", { exact: true })).toBeVisible();
});

test("institute registration says new institutes start pending", async ({ page }) => {
  await page.goto("/institutions/new");
  await expect(page.getByText("Every new institute starts as pending review")).toBeVisible();
});

test("signed-out visitors are sent to sign in", async ({ page }) => {
  await page.goto("/resources");
  await expect(page).toHaveURL(/\/login/);
});

test("the app is installable: manifest, icons and a never-stale service worker", async ({ request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.short_name).toBe("Baanto");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true);

  const sw = await request.get("/sw.js");
  expect(sw.ok()).toBe(true);
  expect(sw.headers()["cache-control"]).toContain("no-store");
  expect((await request.get("/offline")).ok()).toBe(true);
});

test("the app switches to Hindi and back, and remembers the choice @phone", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /View in Hindi/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi-IN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("अपने कैंपस में साइन इन करें");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("अपने कैंपस में साइन इन करें");

  await page.getByRole("button", { name: /View in English/ }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en-IN");
});
