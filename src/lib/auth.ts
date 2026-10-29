import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/database.types";

export type Role = Enums<"user_role">;
export type CurrentUser = Tables<"profiles"> & { email: string; orgStatus: string };

export const STAFF_ROLES: Role[] = ["manager", "admin"];
export const OWNER_ROLES: Role[] = ["owner", "manager", "admin"];
export const BORROWER_ROLES: Role[] = ["student", "researcher"];

/** The signed-in user's profile, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*, org:organizations(status)").eq("id", user.id).single();
  if (!data) return null;
  const { org, ...profile } = data;
  return { ...profile, email: user.email ?? "", orgStatus: org?.status ?? "active" };
});

/** Signed in, and their institute isn't suspended. A suspended institute's people see /suspended instead. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.orgStatus === "suspended") redirect("/suspended");
  return user;
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** For server actions: throws instead of redirecting so the caller can show the reason. */
export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError("Please sign in again.");
  if (user.orgStatus === "suspended") throw new ForbiddenError("Your institute’s account is paused.");
  if (!roles.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** For pages: unauthorised roles see a 403 page rather than data. */
export async function requirePageRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/forbidden");
  return user;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "owner":
      return "/owner";
    case "attendant":
      return "/attendant";
    case "manager":
      return "/manager";
    case "admin":
      return "/admin";
    default:
      return "/resources";
  }
}
