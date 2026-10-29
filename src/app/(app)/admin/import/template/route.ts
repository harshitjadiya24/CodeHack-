import { getCurrentUser } from "@/lib/auth";
import { csvCell } from "@/lib/domain/csv";
import { INVENTORY_COLUMNS } from "@/lib/domain/inventory";

const EXAMPLES = {
  inventory: [
    [...INVENTORY_COLUMNS],
    ["Bench Multimeter", "equipment", "Test & Measurement", "ECE Block, Lab 2", "Six-and-a-half digit bench multimeter with test leads.", "ECE", "", "normal", "1", "0", "150", "4", "no", "yes", "ELEC", "Leads present; Fuse intact", "Front panel", "", ""],
    ["Seminar Hall C", "space", "Rooms", "Admin Block, Ground Floor", "60 seats, projector and two microphones.", "", "", "normal", "1", "0", "600", "4", "no", "yes", "", "Projector off; Chairs in rows", "Hall from the back", "", ""],
  ],
  register: [
    ["roll_no", "name"],
    ["NIT24CS001", "Student Name"],
  ],
};

/** A starting sheet with the exact columns the importer reads, and example rows to overwrite. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !["admin", "manager"].includes(user.role)) return new Response("Forbidden", { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") === "register" ? "register" : "inventory";
  const body = "﻿" + EXAMPLES[kind].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="baanto-${kind}-template.csv"` },
  });
}
