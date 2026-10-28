import { groupOf, groupRank } from "@/lib/india";

// Groups for the department picker. A long alphabetical list is hard to scan, so departments are shown
// under the headings a student would look for. Codes not in any template fall into "Other".

export type Department = { id: string; name: string; code: string };

export function groupDepartments(depts: Department[]): { label: string; items: Department[] }[] {
  const groups = new Map<string, Department[]>();
  for (const d of depts) {
    const label = groupOf(d.code);
    groups.set(label, [...(groups.get(label) ?? []), d]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => groupRank(a) - groupRank(b))
    .map(([label, items]) => ({ label, items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
}
