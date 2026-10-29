import Link from "next/link";
import { LiveBell } from "@/components/live-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL } from "@/lib/demo";
import { logout } from "@/app/login/actions";
import { NavLink } from "./nav-link";
import { Wordmark } from "@/components/wordmark";
import { isPlatformStaff } from "@/lib/services/review";

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
    { href: "/owner/resources", label: "Resources" },
    { href: "/manager", label: "Review desk" },
    { href: "/audit", label: "Audit log" },
    { href: "/resources", label: "Catalogue" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ count: unread }, reviewer] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    isPlatformStaff(user.id),
  ]);
  const nav = reviewer ? [...NAV[user.role], { href: "/ops", label: "Institutes" }] : NAV[user.role];

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold leading-none text-ink">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LiveBell userId={user.id} initial={unread ?? 0} />
            <Link href="/profile" className="hidden max-w-36 rounded-xl px-2 py-1 text-right leading-tight hover:bg-paper-2 sm:block">
              <span className="block truncate text-[15px] font-bold text-ink">{user.full_name}</span>
              <span className="block text-[13px] text-subtle">{ROLE_LABEL[user.role]}</span>
            </Link>
            <form action={logout}>
              <button className="min-h-11 rounded-full px-4 text-[15px] text-subtle hover:bg-paper-2 hover:text-ink">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      {!user.verified && ["student", "researcher"].includes(user.role) && (
        <div role="status" className="border-b border-rule bg-board-soft">
          <p className="mx-auto max-w-[1240px] px-4 py-2.5 text-[15px] text-ink md:px-8">
            <b>Waiting for verification.</b> The admin office is checking your roll number. You can browse and add training now; requests unlock once you’re
            verified.
          </p>
        </div>
      )}
      <main id="main" className="mx-auto max-w-[1240px] px-4 py-10 md:px-8 md:py-14">
        {children}
      </main>
    </div>
  );
}
