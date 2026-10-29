import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { InventoryImport, RegisterImport } from "@/components/operations/csv-import";
import { requirePageRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Import" };

/** The two jobs that stop a real college from starting: listing its equipment, and verifying its students. */
export default async function ImportPage() {
  const user = await requirePageRole(["admin", "manager"]);
  return (
    <>
      <PageHeader eyebrow="Set up in an afternoon" title="Import from spreadsheets" />
      <p className="-mt-4 mb-8 max-w-2xl text-ink-2">
        Export the stock register and the student list from Excel or Google Sheets as CSV. Each file is checked row by row first; nothing changes until you
        confirm, and every change is written to the audit chain.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="inventory" className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold">Equipment and spaces</h2>
            <p className="mt-1 text-sm text-ink-2">
              One row per resource. Only name, category, location and description are required. Department and badge codes must already exist; owners are
              matched by email, or you become the owner.
            </p>
          </div>
          <InventoryImport />
        </Card>
        <Card id="register" className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-bold">Verify students from the college register</h2>
            <p className="mt-1 text-sm text-ink-2">
              Students who signed up with a roll number in the register are verified together. If the register also has names and one clearly differs, that
              person is left for you to check by hand.
            </p>
          </div>
          {user.role === "admin" ? <RegisterImport /> : <p className="text-sm text-subtle">Only the admin office verifies identities.</p>}
        </Card>
      </div>
    </>
  );
}
