"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

/** Unread count that updates the moment a decision lands (Supabase Realtime, RLS-filtered to this user). */
export function LiveBell({ userId, initial }: { userId: string; initial: number }) {
  const [unread, setUnread] = useState(initial);
  const router = useRouter();
  useEffect(() => setUnread(initial), [initial]);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (payload) => {
        setUnread((n) => n + 1);
        const n = payload.new as { title: string; link: string | null };
        toast(n.title, n.link ? { action: { label: "Open", onClick: () => router.push(n.link!) } } : undefined);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return (
    <Link href="/notifications" className="relative grid size-11 place-items-center rounded-md border border-rule bg-card text-ink transition-colors hover:border-ink" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
      <Bell className="size-5" aria-hidden />
      <AnimatePresence>
        {unread > 0 && (
          <motion.span
            key={unread}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-[4px] bg-board px-1 text-[11px] font-bold text-board-ink ring-2 ring-board-ink"
          >
            {unread}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
