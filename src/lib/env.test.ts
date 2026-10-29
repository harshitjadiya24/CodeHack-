import { describe, expect, it } from "vitest";
import { checkEnv } from "./env";

const base = { NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk", SUPABASE_SECRET_KEY: "sk" };

describe("environment check", () => {
  it("passes with the three Supabase keys", () => {
    expect(checkEnv(base)).toEqual({ errors: [], warnings: [] });
  });

  it("names each missing key", () => {
    expect(checkEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" }).errors).toEqual([
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing",
      "SUPABASE_SECRET_KEY is missing",
    ]);
  });

  it("warns when demo mode or the grievance contact is wrong in production only", () => {
    const live = checkEnv({ ...base, VERCEL_ENV: "production", NEXT_PUBLIC_DEMO_MODE: "1" }).warnings;
    expect(live.some((w) => w.startsWith("NEXT_PUBLIC_DEMO_MODE=1"))).toBe(true);
    expect(live.some((w) => w.includes("GRIEVANCE"))).toBe(true);
    expect(checkEnv({ ...base, VERCEL_ENV: "preview", NEXT_PUBLIC_DEMO_MODE: "1" }).warnings).toEqual([]);
  });
});
