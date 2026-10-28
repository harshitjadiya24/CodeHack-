import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Card } from "@/components/ui";
import { OWNER_ROLES, requirePageRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteOrigin } from "@/lib/site";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "QR tag" };

export default async function QrTagPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const user = await requirePageRole(OWNER_ROLES);
  const { data: r } = await createAdminClient().from("resources").select("id, name, location, qr_token, org_id").eq("id", id).maybeSingle();
  if (!r || r.org_id !== user.org_id) notFound();

  const url = `${await siteOrigin()}/r/${r.qr_token}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return (
    <div className="mx-auto max-w-md">
      {isNew && (
        <p role="status" className="mb-4 rounded-md bg-ok-soft p-3 text-sm text-ok print:hidden">
          Listed! Print this tag and stick it on the resource.
        </p>
      )}
      <Card className="p-8 text-center print:border-0">
        <p className="font-display text-2xl">Saajha</p>
        <div className="mx-auto my-4 w-56" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="font-medium">{r.name}</p>
        <p className="text-sm text-subtle">{r.location}</p>
        <p className="mt-4 text-sm">Scan to check availability, book, check in or return.</p>
        <p className="mt-1 font-mono text-xs text-subtle">{r.qr_token}</p>
      </Card>
      <div className="mt-4 print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
