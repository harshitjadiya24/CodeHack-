// Matching sign-ups against the college register, so the admin office verifies a whole batch from one file
// instead of one student at a time. A roll number alone isn't enough when the register also has a name: if the
// names clearly differ, the person is left for a human to check. Pure, so it is unit tested.

export type RegisterEntry = { rollNo: string; name: string | null; line: number };
export type Candidate = { id: string; rollNo: string | null; fullName: string; verified: boolean };

export type RegisterMatch = {
  verify: { id: string; rollNo: string; fullName: string }[];
  alreadyVerified: number;
  nameMismatch: { id: string; rollNo: string; fullName: string; registerName: string }[];
  notOnBaanto: number;
  duplicates: string[];
};

export const normaliseRoll = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !["dr", "mr", "ms", "mrs", "prof", "kumar", "kumari"].includes(w));

/** Same person if they share a given name or surname. Registers often add or drop middle names and initials. */
export function namesAgree(a: string, b: string): boolean {
  const x = new Set(words(a));
  return words(b).some((w) => x.has(w));
}

export function readRegister(records: Record<string, string>[]): { entries: RegisterEntry[]; problems: { line: number; message: string }[] } {
  const entries: RegisterEntry[] = [];
  const problems: { line: number; message: string }[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const roll = normaliseRoll(r.roll_no ?? r.roll_number ?? r.rollno ?? r.enrolment_no ?? r.enrollment_no ?? "");
    if (!roll) problems.push({ line, message: "no roll number" });
    else if (!/^[A-Z0-9/-]{4,20}$/.test(roll)) problems.push({ line, message: `“${roll}” doesn’t look like a roll number` });
    else entries.push({ rollNo: roll, name: (r.name ?? r.full_name ?? r.student_name ?? "").trim() || null, line });
  });
  return { entries, problems };
}

export function matchRegister(entries: RegisterEntry[], people: Candidate[]): RegisterMatch {
  const byRoll = new Map<string, RegisterEntry>();
  const duplicates: string[] = [];
  for (const e of entries) {
    if (byRoll.has(e.rollNo)) duplicates.push(e.rollNo);
    else byRoll.set(e.rollNo, e);
  }

  const result: RegisterMatch = { verify: [], alreadyVerified: 0, nameMismatch: [], notOnBaanto: 0, duplicates };
  const matched = new Set<string>();
  for (const p of people) {
    if (!p.rollNo) continue;
    const roll = normaliseRoll(p.rollNo);
    const entry = byRoll.get(roll);
    if (!entry) continue;
    matched.add(roll);
    if (p.verified) result.alreadyVerified++;
    else if (entry.name && !namesAgree(entry.name, p.fullName)) result.nameMismatch.push({ id: p.id, rollNo: roll, fullName: p.fullName, registerName: entry.name });
    else result.verify.push({ id: p.id, rollNo: roll, fullName: p.fullName });
  }
  result.notOnBaanto = [...byRoll.keys()].filter((r) => !matched.has(r)).length;
  return result;
}
