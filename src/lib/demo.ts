import type { Role } from "@/lib/auth";

// Fictional demo accounts seeded by supabase/seed.sql. Shown on the login page for judges.
export const DEMO_PASSWORD = "Saajha@2026";

export const DEMO_ACCOUNTS: { email: string; name: string; role: Role; blurb: string }[] = [
  { email: "aarav@northfield.demo", name: "Aarav Mehta", role: "student", blurb: "CSE student, no 3D-printer badge yet" },
  { email: "meera@northfield.demo", name: "Meera Iyer", role: "student", blurb: "ECE student, full Trust Passport" },
  { email: "kabir@northfield.demo", name: "Kabir Singh", role: "researcher", blurb: "Researcher and heavy printer user" },
  { email: "priya@northfield.demo", name: "Dr. Priya Nair", role: "owner", blurb: "Makerspace in-charge, owns 15 resources" },
  { email: "ravi@northfield.demo", name: "Ravi Kulkarni", role: "attendant", blurb: "Lab attendant, confirms supervised handovers" },
  { email: "sharma@northfield.demo", name: "Prof. Anil Sharma", role: "manager", blurb: "Dean R&D, verifies badges and decides incidents" },
  { email: "admin@northfield.demo", name: "IQAC Office", role: "admin", blurb: "Fairness policy, utilisation, audit; also the Baanto review team" },
  { email: "zoya@riverside.demo", name: "Zoya Khan", role: "student", blurb: "Partner-campus student (Riverside)" },
  { email: "admin@riverside.demo", name: "Riverside Admin Office", role: "admin", blurb: "Endorses Riverside students for other campuses" },
];

export const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  researcher: "Researcher",
  owner: "Resource owner",
  attendant: "Lab attendant",
  manager: "Manager",
  admin: "Admin",
};
