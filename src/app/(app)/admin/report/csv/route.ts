import { getCurrentUser } from "@/lib/auth";
import { academicYear } from "@/lib/domain/time";
import { accreditationReport } from "@/lib/services/insights";
import { csvCell as cell } from "@/lib/domain/csv";

/** The facility table of the NAAC report as CSV, for IQAC's data templates. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorised", { status: 401 });
  if (!["admin", "manager"].includes(user.role)) return new Response("Forbidden", { status: 403 });

  const current = academicYear(new Date()).start;
  const asked = Number(new URL(request.url).searchParams.get("ay"));
  const start = asked >= current - 2 && asked <= current ? asked : current;
  const r = await accreditationReport(user.org_id, start);

  const rows = [
    ["Academic year", "Facility", "Category", "Department", "Needs training", "Supervised", "Bookings", "Hours", "Utilisation %", "Market value (INR)"],
    ...r.perResource.map((f) => [
      r.ay.label,
      f.name,
      f.category,
      f.dept?.name ?? "Shared",
      f.badgeGated ? "Yes" : "No",
      f.requires_supervision ? "Yes" : "No",
      f.bookings,
      Math.round(f.hours),
      Math.round(f.utilisation * 100),
      Math.round(f.value),
    ]),
  ];
  // The byte-order mark makes Excel read the file as UTF-8 (₹, Devanagari names).
  const body = "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="naac-criterion-4-facilities-${r.ay.label.replace("–", "-")}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
