// Turning an inventory spreadsheet into listings. Every row is checked the same way the listing form checks
// one resource, and every problem is reported with its row number, so the admin office can fix the sheet and
// upload it again. Pure, so it is unit tested.

export const INVENTORY_COLUMNS = [
  "name",
  "kind",
  "category",
  "location",
  "description",
  "department",
  "owner_email",
  "demand",
  "credits_per_hour",
  "deposit_inr",
  "market_rent_inr_per_hour",
  "max_hours",
  "supervised",
  "instant_approval",
  "badges",
  "checklist",
  "photo_angles",
  "lat",
  "lng",
] as const;

export const INVENTORY_REQUIRED = ["name", "category", "location", "description"] as const;

export type InventoryRow = {
  line: number;
  name: string;
  kind: "equipment" | "space";
  category: string;
  location: string;
  description: string;
  department: string | null;
  ownerEmail: string | null;
  demand: "normal" | "high";
  creditRate: number;
  depositInr: number;
  rentalValue: number;
  maxHours: number;
  requiresSupervision: boolean;
  autoApprove: boolean;
  badges: string[];
  checklist: string[];
  photoSlots: string[];
  lat: number | null;
  lng: number | null;
};

export type InventoryProblem = { line: number; message: string };

const YES = new Set(["yes", "y", "true", "1", "haan", "हाँ"]);
const NO = new Set(["", "no", "n", "false", "0", "nahi", "नहीं"]);
const list = (s: string) =>
  s
    .split(/[;|]/)
    .map((x) => x.trim())
    .filter(Boolean);

/**
 * `known` lists what the institute already has, so a typo in a department or badge code is caught here rather
 * than silently dropped. Rows that repeat a name already listed (or listed earlier in the file) are skipped.
 */
export function readInventory(
  records: Record<string, string>[],
  known: { departments: string[]; badges: string[]; owners: string[]; existingNames: string[] },
): { rows: InventoryRow[]; problems: InventoryProblem[]; skipped: InventoryProblem[] } {
  const rows: InventoryRow[] = [];
  const problems: InventoryProblem[] = [];
  const skipped: InventoryProblem[] = [];
  const depts = new Set(known.departments.map((d) => d.toUpperCase()));
  const badges = new Set(known.badges.map((b) => b.toUpperCase()));
  const owners = new Set(known.owners.map((o) => o.toLowerCase()));
  const seen = new Set(known.existingNames.map((n) => n.trim().toLowerCase()));

  records.forEach((r, i) => {
    // Line 1 is the header, so the first record is line 2: the number the admin sees in Excel.
    const line = i + 2;
    const errors: string[] = [];
    const missing = INVENTORY_REQUIRED.filter((k) => !r[k]);
    if (missing.length) errors.push(`missing ${missing.join(", ")}`);

    const key = (r.name ?? "").trim().toLowerCase();
    if (key && seen.has(key)) {
      skipped.push({ line, message: `“${r.name}” is already listed, so this row was skipped.` });
      return;
    }

    const num = (field: string, fallback: number, min: number, max: number) => {
      const raw = (r[field] ?? "").replace(/[₹,\s]/g, "");
      if (raw === "") return fallback;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < min || n > max) {
        errors.push(`${field} must be a number from ${min} to ${max}`);
        return fallback;
      }
      return n;
    };
    const flag = (field: string) => {
      const v = (r[field] ?? "").trim().toLowerCase();
      if (YES.has(v)) return true;
      if (NO.has(v)) return false;
      errors.push(`${field} must be yes or no`);
      return false;
    };
    const coord = (field: string, limit: number) => {
      const raw = (r[field] ?? "").trim();
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || Math.abs(n) > limit) {
        errors.push(`${field} is not a valid coordinate`);
        return null;
      }
      return n;
    };

    const kindRaw = (r.kind ?? "").trim().toLowerCase();
    const kind = kindRaw === "space" || kindRaw === "room" ? "space" : "equipment";
    if (kindRaw && !["equipment", "space", "room"].includes(kindRaw)) errors.push("kind must be equipment or space");

    const demandRaw = (r.demand ?? "").trim().toLowerCase();
    if (demandRaw && !["normal", "high"].includes(demandRaw)) errors.push("demand must be normal or high");

    const department = (r.department ?? "").trim().toUpperCase() || null;
    if (department && !depts.has(department)) errors.push(`no department with code ${department}`);

    const ownerEmail = (r.owner_email ?? "").trim().toLowerCase() || null;
    if (ownerEmail && !owners.has(ownerEmail)) errors.push(`${ownerEmail} isn’t a lab in-charge or admin at this institute`);

    const badgeCodes = list(r.badges ?? "").map((b) => b.toUpperCase());
    const unknownBadges = badgeCodes.filter((b) => !badges.has(b));
    if (unknownBadges.length) errors.push(`unknown badge ${unknownBadges.join(", ")}`);

    const requiresSupervision = flag("supervised");
    const autoApprove = flag("instant_approval");
    if (requiresSupervision && autoApprove) errors.push("a supervised resource can’t have instant approval");

    const checklist = list(r.checklist ?? "");
    const photoSlots = list(r.photo_angles ?? "");
    const row: InventoryRow = {
      line,
      name: (r.name ?? "").trim().slice(0, 120),
      kind,
      category: (r.category ?? "").trim().slice(0, 60),
      location: (r.location ?? "").trim().slice(0, 160),
      description: (r.description ?? "").trim().slice(0, 1000),
      department,
      ownerEmail,
      demand: demandRaw === "high" ? "high" : "normal",
      creditRate: Math.round(num("credits_per_hour", 1, 0, 10)),
      depositInr: Math.round(num("deposit_inr", 0, 0, 100000)),
      rentalValue: Math.round(num("market_rent_inr_per_hour", 0, 0, 100000)),
      maxHours: Math.round(num("max_hours", 2, 1, 8)),
      requiresSupervision,
      autoApprove,
      badges: badgeCodes,
      // A sheet rarely has these; sensible defaults keep handovers working until the owner edits them.
      checklist: checklist.length ? checklist : ["Returned clean and complete"],
      photoSlots: photoSlots.length ? photoSlots : ["Overview"],
      lat: coord("lat", 90),
      lng: coord("lng", 180),
    };
    if (row.name && row.name.length < 3) errors.push("name must be at least 3 characters");
    if (row.description && row.description.length < 10) errors.push("description must be at least 10 characters");

    if (errors.length) problems.push({ line, message: errors.join("; ") });
    else {
      rows.push(row);
      seen.add(key);
    }
  });
  return { rows, problems, skipped };
}
