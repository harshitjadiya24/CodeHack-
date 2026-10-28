import Link from "next/link";
import { LiveBell } from "@/components/live-bell";
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
    { href: "/admin/people", label: "People" },
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
      <header className="blueprint-grid text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/" className="font-display text-2xl font-semibold leading-none text-white">
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
            <LiveBell userId={user.id} initial={unread ?? 0} />
            <Link href="/profile" className="hidden rounded-md px-2 py-1 text-right text-sm leading-tight hover:bg-white/10 sm:block">
              <span className="block font-medium text-white">{user.full_name}</span>
              <span className="block text-xs text-white/65">{ROLE_LABEL[user.role]}</span>
            </Link>
            <form action={logout}>
              <button className="rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/10 hover:text-white">Sign out</button>
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
