"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  // Section roots like /owner and /admin have their own sub-pages in the nav, so they match exactly.
  const active = path === href || (!["/owner", "/admin"].includes(href) && path.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-[15px] transition-colors",
        active ? "bg-accent font-semibold text-accent-ink" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
