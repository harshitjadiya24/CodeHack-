import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";
import { mask, scrub } from "./sentry";

describe("error reports carry no personal data", () => {
  it("masks emails and roll numbers in text", () => {
    expect(mask("meera@northfield.demo has NIT22EC017 already")).toBe("[email] has [roll] already");
  });

  it("drops cookies, headers, body and everything about the user but the id", () => {
    const event = scrub({
      type: undefined,
      message: "failed for priya@college.ac.in",
      user: { id: "u1", email: "priya@college.ac.in", ip_address: "1.2.3.4" },
      request: { url: "/bookings", cookies: { sb: "x" }, headers: { cookie: "x" }, data: "rollNo=NIT22EC017", query_string: "email=a@b.co" },
      exception: { values: [{ type: "Error", value: "roll NIT22EC017 taken" }] },
    } as ErrorEvent);
    expect(event.user).toEqual({ id: "u1" });
    expect(event.request).toEqual({ url: "/bookings", query_string: undefined });
    expect(event.message).toBe("failed for [email]");
    expect(event.exception?.values?.[0].value).toBe("roll [roll] taken");
  });
});
