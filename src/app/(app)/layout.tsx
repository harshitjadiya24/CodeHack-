import Link from "next/link";
import { LiveBell } from "@/components/live-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser, type Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";
import { NavLink } from "./nav-link";
import { Wordmark } from "@/components/wordmark";
import { LanguageToggle } from "@/components/language-toggle";
import { getTranslations } from "next-intl/server";
import { isPlatformStaff } from "@/lib/services/review";
import { sweepNoShowsSoon } from "@/lib/services/no-show-sweep";

// Labels are message keys under Shell.nav (messages/*.json).
type NavKey = "discover" | "bookings" | "passport" | "requests" | "myResources" | "catalogue" | "handovers" | "reviewDesk" | "audit" | "insights" | "people" | "resources" | "institutes";
const NAV: Record<Role, { href: string; label: NavKey }[]> = {
  student: [
    { href: "/resources", label: "discover" },
    { href: "/bookings", label: "bookings" },
    { href: "/passport", label: "passport" },
  ],
  researcher: [
    { href: "/resources", label: "discover" },
    { href: "/bookings", label: "bookings" },
    { href: "/passport", label: "passport" },
  ],
  owner: [
    { href: "/owner", label: "requests" },
    { href: "/owner/resources", label: "myResources" },
    { href: "/resources", label: "catalogue" },
  ],
  attendant: [
    { href: "/attendant", label: "handovers" },
    { href: "/resources", label: "catalogue" },
  ],
  manager: [
    { href: "/manager", label: "reviewDesk" },
    { href: "/owner", label: "requests" },
    { href: "/resources", label: "catalogue" },
    { href: "/audit", label: "audit" },
  ],
  admin: [
    { href: "/admin", label: "insights" },
    { href: "/admin/people", label: "people" },
    { href: "/owner/resources", label: "resources" },
    { href: "/manager", label: "reviewDesk" },
    { href: "/audit", label: "audit" },
    { href: "/resources", label: "catalogue" },
  ],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  sweepNoShowsSoon();
  const supabase = await createClient();
  const [{ count: unread }, reviewer] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    isPlatformStaff(user.id),
  ]);
  const nav = reviewer ? [...NAV[user.role], { href: "/ops", label: "institutes" as const }] : NAV[user.role];
  const t = await getTranslations("Shell");

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2"
      >
        {t("skip")}
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold leading-none text-ink">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {t(`nav.${item.label}`)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
            <LiveBell userId={user.id} initial={unread ?? 0} />
            <Link href="/profile" className="hidden max-w-36 rounded-xl px-2 py-1 text-right leading-tight hover:bg-paper-2 sm:block">
              <span className="block truncate text-[15px] font-bold text-ink">{user.full_name}</span>
              <span className="block text-[13px] text-subtle">{t(`roles.${user.role}`)}</span>
            </Link>
            <form action={logout}>
              <button className="min-h-11 rounded-full px-4 text-[15px] text-subtle hover:bg-paper-2 hover:text-ink">{t("signOut")}</button>
            </form>
          </div>
        </div>
      </header>
      {user.isDemo && (
        <div role="note" className="tone-sky border-b border-rule">
          <p className="mx-auto max-w-[1240px] px-4 py-2 text-[15px] md:px-8">
            {t.rich("demo", { b: (c) => <b>{c}</b> })}
          </p>
        </div>
      )}
      {!user.verified && ["student", "researcher"].includes(user.role) && (
        <div role="status" className="border-b border-rule bg-board-soft">
          <p className="mx-auto max-w-[1240px] px-4 py-2.5 text-[15px] text-ink md:px-8">
            {t.rich("unverified", { b: (c) => <b>{c}</b> })}
          </p>
        </div>
      )}
      <main id="main" className="mx-auto max-w-[1240px] px-4 py-10 md:px-8 md:py-14">
        {children}
      </main>
    </div>
  );
}
