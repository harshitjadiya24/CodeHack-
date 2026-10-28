import "server-only";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit, notify } from "@/lib/services/records";
import { codeEmail, sendMail } from "@/lib/mailer";

// Self-service sign-up. Anyone can create a borrower account, but:
//  1. the email must be confirmed with a 6-digit code sent through Brevo before the account can sign in;
//  2. nobody can borrow until the admin office has checked the roll number and verified them.
// Staff roles are assigned by the admin office, never chosen.

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_S = 60;

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(80, "That name is too long."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use at most 72 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
  orgId: z.guid("Choose your campus."),
  deptId: z.guid("Choose your department."),
  rollNo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9/-]{4,20}$/, "Use the roll number on your college ID: 4–20 letters, numbers, / or -."),
  role: z.enum(["student", "researcher"], "Choose student or researcher."),
  consent: z.literal("on", "Agree to the privacy notice to continue."),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type SignupResult = { ok: true; email: string } | { ok: false; error: string; field?: keyof SignupInput; pending?: boolean };
export type CodeResult = { ok: true; email: string } | { ok: false; error: string };

export async function listCampuses() {
  const db = createAdminClient();
  const { data } = await db.from("organizations").select("id, name, departments(id, name)").order("name");
  return (data ?? []).map((o) => ({ id: o.id, name: o.name, departments: [...o.departments].sort((a, b) => a.name.localeCompare(b.name)) }));
}

export async function registerAccount(input: SignupInput): Promise<SignupResult> {
  const db = createAdminClient();

  const { data: dept } = await db.from("departments").select("id, org_id").eq("id", input.deptId).maybeSingle();
  if (!dept || dept.org_id !== input.orgId) return { ok: false, error: "That department isn’t part of the campus you chose.", field: "deptId" };

  const { data: taken } = await db.from("profiles").select("id").eq("org_id", input.orgId).eq("roll_no", input.rollNo).maybeSingle();
  if (taken) return { ok: false, error: "An account with this roll number already exists. Sign in, or ask the admin office.", field: "rollNo" };

  // Someone who started earlier but never entered the code: send a fresh one rather than an error.
  const { data: pending } = await db.from("email_codes").select("user_id").eq("email", input.email).maybeSingle();
  if (pending) {
    const resent = await resendCode(input.email);
    return resent.ok ? { ok: true, email: input.email } : { ok: false, error: resent.error, pending: true };
  }

  // Created unconfirmed: Supabase refuses password sign-in until we confirm the email ourselves.
  const { data: created, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
    user_metadata: { full_name: input.fullName },
  });
  if (error || !created.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return exists
      ? { ok: false, error: "An account with this email already exists. Sign in instead.", field: "email" }
      : { ok: false, error: "We couldn’t create the account just now. Try again in a minute." };
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
    return { ok: false, error: "We couldn’t create the account just now. Try again in a minute." };
  }

  await audit(db, { orgId: input.orgId, actorId: userId, action: "user.registered", entity: "profile", entityId: userId, payload: { role: input.role } });

  const sent = await issueCode(db, userId, input.email, input.fullName);
  if (!sent.ok) return { ok: false, error: `Your account was created, but ${sent.error.charAt(0).toLowerCase()}${sent.error.slice(1)}`, pending: true };
  return { ok: true, email: input.email };
}

// ── Email codes ──────────────────────────────────────────────────────────────

type Db = ReturnType<typeof createAdminClient>;

function hashCode(userId: string, code: string) {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

async function issueCode(db: Db, userId: string, email: string, name: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.from("email_codes").upsert({
    user_id: userId,
    email,
    code_hash: hashCode(userId, code),
    expires_at: new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString(),
    attempts: 0,
    last_sent_at: new Date().toISOString(),
  });
  const mail = codeEmail(name, code);
  return sendMail({ email, name }, mail.subject, mail.text, mail.html);
}

export async function resendCode(rawEmail: string): Promise<CodeResult> {
  const email = rawEmail.trim().toLowerCase();
  const db = createAdminClient();
  const { data: row } = await db.from("email_codes").select("user_id, last_sent_at").eq("email", email).maybeSingle();
  // Same answer whether or not the email exists, so this can't be used to discover accounts.
  if (!row) return { ok: true, email };
  const wait = RESEND_AFTER_S - Math.floor((Date.now() - new Date(row.last_sent_at).getTime()) / 1000);
  if (wait > 0) return { ok: false, error: `Wait ${wait} seconds before asking for another code.` };
  const { data: p } = await db.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
  const sent = await issueCode(db, row.user_id, email, p?.full_name ?? "there");
  return sent.ok ? { ok: true, email } : sent;
}

/** Checks the code and confirms the email. Returns the email so the caller can open a session. */
export async function confirmCode(rawEmail: string, rawCode: string): Promise<CodeResult> {
  const email = rawEmail.trim().toLowerCase();
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code from the email." };

  const db = createAdminClient();
  const { data: row } = await db.from("email_codes").select("*").eq("email", email).maybeSingle();
  if (!row) return { ok: false, error: "That code isn’t right, or it has already been used." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong codes. Ask for a new one." };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: "That code has expired. Ask for a new one." };
  if (row.code_hash !== hashCode(row.user_id, code)) {
    await db.from("email_codes").update({ attempts: row.attempts + 1 }).eq("user_id", row.user_id);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, error: left > 0 ? `That code isn’t right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one." };
  }

  const { error } = await db.auth.admin.updateUserById(row.user_id, { email_confirm: true });
  if (error) return { ok: false, error: "We couldn’t confirm your email just now. Try again in a minute." };
  await db.from("email_codes").delete().eq("user_id", row.user_id);

  // Only now is there a real person behind the account: tell the admin office.
  const { data: p } = await db.from("profiles").select("org_id, full_name, roll_no").eq("id", row.user_id).single();
  if (p) {
    await audit(db, { orgId: p.org_id, actorId: row.user_id, action: "user.email_confirmed", entity: "profile", entityId: row.user_id });
    const { data: admins } = await db.from("profiles").select("id").eq("org_id", p.org_id).eq("role", "admin");
    await Promise.all(
      (admins ?? []).map((a) =>
        notify(db, {
          userId: a.id,
          kind: "user.registered",
          title: `${p.full_name} is waiting for verification`,
          body: `Roll number ${p.roll_no ?? "not given"}. Email confirmed. Check the roll number against the college register before verifying.`,
          link: "/admin/people",
        }),
      ),
    );
  }
  return { ok: true, email };
}

/** A one-off sign-in link, consumed immediately on the server, so a confirmed user lands signed in. */
export async function sessionTokenFor(email: string) {
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
  return error ? null : data.properties.hashed_token;
}
