import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCampus } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: items } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);

  // Opening the inbox marks everything read. Clients have no write access, so the server does it.
  if (items?.some((n) => !n.read_at)) {
    await createAdminClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  }

  return (
    <>
      <PageHeader eyebrow="Approvals, reminders, waitlist moves, incidents" title="Notifications" />
      {!items?.length ? (
        <EmptyState title="Nothing yet">You’ll hear about every decision on your requests here.</EmptyState>
      ) : (
        <Card className="divide-y divide-rule">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3 px-5 py-4">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-saffron"}`} aria-hidden />
                <div className="min-w-0">
                  <p className={n.read_at ? "text-ink-2" : "font-medium text-ink"}>
                    {!n.read_at && <span className="sr-only">Unread: </span>}
                    {n.title}
                  </p>
                  {n.body && <p className="text-sm text-muted">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-muted">{formatCampus(n.created_at)}</p>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block hover:bg-paper-2">
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </Card>
      )}
    </>
  );
}
