"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || (href !== "/owner" && path.startsWith(`${href}/`));
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
