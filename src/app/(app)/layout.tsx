import Link from "next/link";
import { Bell } from "lucide-react";
import { requireUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/demo";
import { logout } from "@/app/login/actions";
import { NavLink } from "./nav-link";

const NAV: Record<Role, { href: string; label: string }[]> = {
  student: [
    { href: "/resources", label: "Discover" },
    { href: "/bookings", label: "My bookings" },
    { href: "/passport", label: "Trust Passport" },
  ],
  researcher: [
    { href: "/resources", label: "Discover" },
    { href: "/bookings", label: "My bookings" },
    { href: "/passport", label: "Trust Passport" },
  ],
  owner: [
    { href: "/owner", label: "Requests" },
    { href: "/owner/resources", label: "My resources" },
    { href: "/resources", label: "Catalogue" },
  ],
  attendant: [
    { href: "/attendant", label: "Handovers" },
    { href: "/resources", label: "Catalogue" },
  ],
  manager: [
    { href: "/manager", label: "Review desk" },
    { href: "/owner", label: "Requests" },
    { href: "/resources", label: "Catalogue" },
    { href: "/audit", label: "Audit log" },
  ],
  admin: [
    { href: "/admin", label: "Insights" },
    { href: "/manager", label: "Review desk" },
    { href: "/audit", label: "Audit log" },
    { href: "/resources", label: "Catalogue" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-rule bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/" className="font-display text-2xl leading-none text-ink">
            Saajha
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {NAV[user.role].map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/notifications"
              className="relative rounded-md p-2 text-ink-2 hover:bg-paper-2"
              aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
            >
              <Bell className="size-5" aria-hidden />
              {!!unread && (
                <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-saffron px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </Link>
            <div className="hidden text-right text-sm leading-tight sm:block">
              <p className="font-medium text-ink">{user.full_name}</p>
              <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
            </div>
            <form action={logout}>
              <button className="rounded-md px-2 py-1 text-sm text-muted hover:bg-paper-2 hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {children}
      </main>
    </div>
  );
}
