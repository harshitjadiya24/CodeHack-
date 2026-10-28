import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/services/records";
import { geocodeInstitute } from "@/lib/geocode";
import { INDIAN_STATES, INSTITUTE_KINDS, departmentTemplate, starterBadges, type InstituteKind } from "@/lib/india";

// Any institute in India can join Saajha. The person registering becomes its admin office.
// Trust: every new institute starts "pending review". It works for its own campus straight away, but isn't
// offered to other campuses until someone has checked it is real. Typing an email on the institute's domain
// proves nothing without an inbox check, so it is only recorded as a hint for the reviewer.

const kinds = Object.keys(INSTITUTE_KINDS) as [InstituteKind, ...InstituteKind[]];

export const institutionSchema = z.object({
  name: z.string().trim().min(4, "Enter the institute’s full name.").max(140, "That name is too long."),
  kind: z.enum(kinds, "Choose the type of institute."),
  state: z.enum(INDIAN_STATES, "Choose a state or union territory."),
  city: z.string().trim().min(2, "Enter the city or town.").max(60),
  aisheCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^$|^[CUS]-\d{3,6}$/, "AISHE codes look like C-12345, U-0123 or S-4567. Leave it blank if you don’t have one.")
    .optional(),
  website: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, ""))
    .pipe(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "Enter the institute’s website, like iitb.ac.in.")),
  adminName: z.string().trim().min(2, "Enter your full name.").max(80),
  designation: z.string().trim().min(2, "Enter your role, like Registrar or Lab In-charge.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use at most 72 characters.")
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
  consent: z.literal("on", "Confirm you are authorised to register this institute."),
});

export type InstitutionInput = z.infer<typeof institutionSchema>;
export type InstitutionResult = { ok: true; email: string } | { ok: false; error: string; field?: keyof InstitutionInput };

function onDomain(email: string, site: string) {
  const domain = email.split("@")[1] ?? "";
  return domain === site || domain.endsWith(`.${site}`);
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "institute"}-${randomBytes(2).toString("hex")}`;
}

export async function registerInstitution(input: InstitutionInput): Promise<InstitutionResult> {
  const db = createAdminClient();
  const aishe = input.aisheCode || null;

  if (aishe) {
    const { data: taken } = await db.from("organizations").select("id").ilike("aishe_code", aishe).maybeSingle();
    if (taken) return { ok: false, error: "An institute with this AISHE code is already on Saajha. Ask its admin office to add you.", field: "aisheCode" };
  }
  const { data: sameName } = await db.from("organizations").select("id").ilike("name", input.name).ilike("city", input.city).maybeSingle();
  if (sameName) return { ok: false, error: "This institute is already on Saajha. Students can sign up and pick it from the list.", field: "name" };

  const domainMatch = onDomain(input.email, input.website);
  const point = await geocodeInstitute(input.name, input.city, input.state);

  const { data: created, error } = await db.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.adminName },
  });
  if (error || !created.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return exists
      ? { ok: false, error: "An account with this email already exists. Sign in, or use another email.", field: "email" }
      : { ok: false, error: "We couldn’t register the institute just now. Try again in a minute." };
  }
  const userId = created.user.id;

  const fail = async (orgId?: string) => {
    if (orgId) await db.from("organizations").delete().eq("id", orgId);
    await db.auth.admin.deleteUser(userId);
    return { ok: false as const, error: "We couldn’t register the institute just now. Try again in a minute." };
  };

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({
      name: input.name,
      slug: slugify(input.name),
      kind: input.kind,
      state: input.state,
      city: input.city,
      aishe_code: aishe,
      website: input.website,
      email_domain: null,
      status: "pending",
      created_by: userId,
      lat: point?.lat ?? null,
      lng: point?.lng ?? null,
    })
    .select("id")
    .single();
  if (orgError || !org) return fail();

  const depts = departmentTemplate(input.kind).map((d) => ({ org_id: org.id, ...d }));
  const badges = starterBadges(input.kind).map((b) => ({ org_id: org.id, ...b }));
  const results = await Promise.all([
    db.from("departments").insert(depts),
    db.from("skill_badges").insert(badges),
    db.from("fairness_config").insert({ org_id: org.id }),
  ]);
  if (results.some((r) => r.error)) return fail(org.id);

  // The registering person is the institute's admin office.
  const { error: profileError } = await db
    .from("profiles")
    .insert({ id: userId, org_id: org.id, full_name: input.adminName, role: "admin", verified: true, roll_no: null });
  if (profileError) return fail(org.id);

  await audit(db, {
    orgId: org.id,
    actorId: userId,
    action: "org.registered",
    entity: "organization",
    entityId: org.id,
    reason: `${input.adminName}, ${input.designation}`,
    payload: { kind: input.kind, state: input.state, city: input.city, aishe, website: input.website, domainMatch },
  });

  return { ok: true, email: input.email };
}

export async function institutionCount() {
  const db = createAdminClient();
  const [{ count: institutes }, { data: states }] = await Promise.all([
    db.from("organizations").select("id", { count: "exact", head: true }).neq("status", "suspended"),
    db.from("organizations").select("state").neq("status", "suspended"),
  ]);
  return { institutes: institutes ?? 0, states: new Set((states ?? []).map((s) => s.state).filter(Boolean)).size };
}
