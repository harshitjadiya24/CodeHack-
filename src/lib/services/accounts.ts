import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, notify } from "@/lib/services/records";

// Self-service sign-up. Anyone can create a borrower account and sign in straight away,
// but nobody can borrow until the admin office has checked the roll number and verified them.
// Staff roles are assigned by the admin office, never chosen.

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "nameShort").max(80, "nameLong"),
  email: z.string().trim().toLowerCase().email("email"),
  password: z
    .string()
    .min(8, "passwordShort")
    .max(72, "passwordLong")
    .regex(/[A-Za-z]/, "passwordLetter")
    .regex(/[0-9]/, "passwordNumber"),
  orgId: z.guid("orgId"),
  deptId: z.guid("deptId"),
  rollNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9/-]{4,20}$/, "rollNo"),
  role: z.enum(["student", "researcher"], "role"),
  consent: z.literal("on", "consent"),
});

export type SignupInput = z.infer<typeof signupSchema>;
// `code` is the message key under Signup.errors; `error` is the same in English.
export type SignupResult = { ok: true; email: string } | { ok: false; error: string; code: string; field?: keyof SignupInput };

export async function listCampuses() {
  const db = createAdminClient();
  const { data } = await db
    .from("organizations")
    .select("id, name, city, state, status, departments(id, name, code)")
    .neq("status", "suspended")
    .order("name");
  return (data ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    city: o.city,
    state: o.state,
    verified: o.status !== "pending",
    departments: [...o.departments].sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function registerAccount(input: SignupInput): Promise<SignupResult> {
  const db = createAdminClient();

  const { data: dept } = await db.from("departments").select("id, org_id").eq("id", input.deptId).maybeSingle();
  if (!dept || dept.org_id !== input.orgId) return { ok: false, error: "That department isn’t part of the campus you chose.", code: "deptMismatch", field: "deptId" };

  const { data: taken } = await db.from("profiles").select("id").eq("org_id", input.orgId).eq("roll_no", input.rollNo).maybeSingle();
  if (taken) return { ok: false, error: "An account with this roll number already exists. Sign in, or ask the admin office.", code: "rollTaken", field: "rollNo" };

  const { data: created, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !created.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return exists
      ? { ok: false, error: "An account with this email already exists. Sign in instead.", code: "emailTaken", field: "email" }
      : { ok: false, error: "We couldn’t create the account just now. Try again in a minute.", code: "failed" };
  }

  const userId = created.user.id;
  const { error: profileError } = await db.from("profiles").insert({
    id: userId,
    org_id: input.orgId,
    dept_id: input.deptId,
    full_name: input.fullName,
    roll_no: input.rollNo,
    role: input.role,
    verified: false,
  });
  if (profileError) {
    // Don't leave a login with no profile behind.
    await db.auth.admin.deleteUser(userId);
    return { ok: false, error: "We couldn’t create the account just now. Try again in a minute.", code: "failed" };
  }

  await announce(db, userId, input);
  return { ok: true, email: input.email };
}

type Db = ReturnType<typeof createAdminClient>;

/** Record the sign-up and tell the admin office someone is waiting for verification. */
async function announce(db: Db, userId: string, input: Pick<SignupInput, "orgId" | "fullName" | "rollNo" | "role">, via?: string) {
  await audit(db, { orgId: input.orgId, actorId: userId, action: "user.registered", entity: "profile", entityId: userId, payload: { role: input.role, ...(via ? { via } : {}) } });

  const { data: admins } = await db.from("profiles").select("id").eq("org_id", input.orgId).eq("role", "admin");
  await Promise.all(
    (admins ?? []).map((a) =>
      notify(db, {
        userId: a.id,
        kind: "user.registered",
        title: `${input.fullName} is waiting for verification`,
        body: `Roll number ${input.rollNo}. Check it against the college register before verifying.`,
        link: "/admin/people",
      }),
    ),
  );
}

// Signing in with a college Google account: the login exists already, only the campus details are missing.
export const profileSchema = signupSchema.pick({ fullName: true, orgId: true, deptId: true, rollNo: true, role: true, consent: true });
export type ProfileInput = z.infer<typeof profileSchema>;

export async function completeProfile(userId: string, email: string, input: ProfileInput): Promise<SignupResult> {
  const db = createAdminClient();
  const { data: existing } = await db.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return { ok: true, email };
  const { data: dept } = await db.from("departments").select("id, org_id").eq("id", input.deptId).maybeSingle();
  if (!dept || dept.org_id !== input.orgId) return { ok: false, error: "That department isn’t part of the campus you chose.", code: "deptMismatch", field: "deptId" };
  const { data: taken } = await db.from("profiles").select("id").eq("org_id", input.orgId).eq("roll_no", input.rollNo).maybeSingle();
  if (taken) return { ok: false, error: "An account with this roll number already exists. Sign in, or ask the admin office.", code: "rollTaken", field: "rollNo" };
  const { error } = await db.from("profiles").insert({
    id: userId,
    org_id: input.orgId,
    dept_id: input.deptId,
    full_name: input.fullName,
    roll_no: input.rollNo,
    role: input.role,
    verified: false,
  });
  if (error) return { ok: false, error: "We couldn’t create the account just now. Try again in a minute.", code: "failed" };
  await announce(db, userId, input, "google");
  return { ok: true, email };
}
