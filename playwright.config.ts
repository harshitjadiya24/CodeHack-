import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke tests against a running Baanto (default: the production build on :3100).
// They sign in with the seeded demo accounts and only read, so they can run against the shared demo database.
//   NEXT_DIST_DIR=.next-prod npx next build && NEXT_DIST_DIR=.next-prod npx next start -p 3100
//   npm run e2e
export default defineConfig({
  testDir: "e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // Every test signs in against the same Supabase project; keep the burst small.
  workers: 3,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] }, grep: /@phone/ },
  ],
});
